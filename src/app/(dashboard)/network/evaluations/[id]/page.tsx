'use client'

/**
 * WEB-001D/E — Network Evaluation Detail Page
 *
 * Displays:
 *  - Evaluation status (not_started / open / completed)
 *  - Eligible bids with full content — ONLY after evaluation has started (open/completed)
 *  - Internal evaluation notes (visible to authorized publisher/evaluators only)
 *  - Add note form (only when evaluation is open)
 *  - Complete evaluation action (only when evaluation is open)
 *  - Award selection (only when evaluation is completed and tender not yet awarded)
 *  - Award result display (when tender is already awarded)
 *
 * Lifecycle rules enforced by backend:
 *  - not_started → open → completed
 *  - completed → open: PROHIBITED
 *  - cancellation: PROHIBITED in V1
 *  - Bid content not accessible before evaluation starts
 *  - Award requires: evaluation completed + bid submitted + not withdrawn
 *  - Single award per tender — final, no revocation
 *
 * Backend is the source of truth. UI restrictions do not replace server authorization.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getNetworkEvaluation,
  completeNetworkEvaluation,
  addNetworkEvaluationNote,
  getNetworkEvaluationBids,
  createNetworkAward,
  getNetworkAwardByTender,
  extractNetworkMessage,
  type NetworkEvaluation,
  type NetworkEvaluationNote,
  type NetworkBid,
  type NetworkAward,
} from '@/lib/api/network'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const EVAL_STATUS_LABELS: Record<string, string> = {
  not_started: 'لم يبدأ',
  open: 'جارٍ التقييم',
  completed: 'مكتمل',
}

const BID_STATUS_LABELS: Record<string, string> = {
  submitted: 'مُقدَّم',
  revised: 'مُعدَّل',
  withdrawn: 'مسحوب',
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: NetworkEvaluationNote }) {
  return (
    <div className="border border-border rounded-md p-3 text-sm space-y-1 bg-background">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {note.bid_id ? (
            <>
              مرتبط بالعرض:{' '}
              <Link
                href={`/network/bids/${note.bid_id}`}
                className="underline hover:no-underline font-mono"
              >
                {note.bid_id.slice(0, 8)}…
              </Link>
            </>
          ) : (
            'ملاحظة عامة'
          )}
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(note.created_at)}</span>
      </div>
      <p className="text-foreground whitespace-pre-line">{note.content}</p>
    </div>
  )
}

// ─── Bid Card ─────────────────────────────────────────────────────────────────

function BidCard({
  bid,
  onAddNote,
}: {
  bid: NetworkBid
  onAddNote: (bidId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const effectiveVersion = bid.versions?.find((v) => v.status === 'effective')

  return (
    <div className="border border-border rounded-md p-4 text-sm space-y-2 bg-background">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <StatusBadge status={bid.status} />
          <span className="text-xs text-muted-foreground">
            {BID_STATUS_LABELS[bid.status] ?? bid.status}
          </span>
          <span className="text-xs text-muted-foreground">
            مراجعة #{bid.latest_revision_number}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddNote(bid.id)}
          >
            + ملاحظة
          </Button>
          <Link
            href={`/network/bids/${bid.id}`}
            className="text-xs text-primary underline hover:no-underline"
          >
            تفاصيل العرض
          </Link>
        </div>
      </div>

      <div className="text-xs text-muted-foreground font-mono break-all">
        {bid.id}
      </div>

      {/* Effective content — only shown after evaluation started */}
      {effectiveVersion && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? 'إخفاء محتوى العرض' : 'عرض محتوى العرض'}
          </button>
          {expanded && (
            <pre
              className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all"
              dir="ltr"
            >
              {JSON.stringify(effectiveVersion.content, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetworkEvaluationDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [evaluation, setEvaluation] = useState<NetworkEvaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Bids state ────────────────────────────────────────────────────────────
  const [bids, setBids] = useState<NetworkBid[]>([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const [bidsError, setBidsError] = useState<string | null>(null)
  const [bidsLoaded, setBidsLoaded] = useState(false)

  // ── Add note state ────────────────────────────────────────────────────────
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteBidId, setNoteBidId] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  // ── Complete state ────────────────────────────────────────────────────────
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  // ── Award state ───────────────────────────────────────────────────────────
  const [award, setAward] = useState<NetworkAward | null>(null)
  const [awardLoaded, setAwardLoaded] = useState(false)
  const [selectedBidId, setSelectedBidId] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)
  const [showAwardForm, setShowAwardForm] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getNetworkEvaluation(id)
      .then((ev) => {
        setEvaluation(ev)
        // Auto-load bids if evaluation is already open or completed
        if (ev.status === 'open' || ev.status === 'completed') {
          loadBids(id)
        }
        // Auto-load award if evaluation is completed
        if (ev.status === 'completed') {
          loadAward(ev.tender_id)
        }
      })
      .catch((err: unknown) => {
        if (
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 403
        ) {
          setError('ليس لديك صلاحية الوصول إلى هذا التقييم')
        } else {
          setError(extractNetworkMessage(err, 'فشل تحميل التقييم'))
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  function loadBids(evaluationId: string) {
    setBidsLoading(true)
    setBidsError(null)
    getNetworkEvaluationBids(evaluationId)
      .then((b) => {
        setBids(b)
        setBidsLoaded(true)
      })
      .catch((err: unknown) => {
        setBidsError(extractNetworkMessage(err, 'فشل تحميل العروض'))
      })
      .finally(() => setBidsLoading(false))
  }

  // ── Complete handler ──────────────────────────────────────────────────────

  async function handleComplete() {
    if (!evaluation) return
    const confirmed = window.confirm(
      'هل تريد إتمام التقييم؟ لا يمكن إعادة فتحه بعد ذلك.'
    )
    if (!confirmed) return
    setCompleting(true)
    setCompleteError(null)
    try {
      const updated = await completeNetworkEvaluation(evaluation.id)
      setEvaluation(updated)
    } catch (err: unknown) {
      setCompleteError(extractNetworkMessage(err, 'فشل إتمام التقييم'))
    } finally {
      setCompleting(false)
    }
  }

  // ── Add note handler ──────────────────────────────────────────────────────

  function openNoteForm(bidId = '') {
    setNoteBidId(bidId)
    setNoteContent('')
    setNoteError(null)
    setShowNoteForm(true)
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!evaluation) return
    if (!noteContent.trim()) {
      setNoteError('محتوى الملاحظة مطلوب')
      return
    }
    setNoteSubmitting(true)
    setNoteError(null)
    try {
      const note = await addNetworkEvaluationNote(evaluation.id, {
        content: noteContent.trim(),
        ...(noteBidId.trim() ? { bid_id: noteBidId.trim() } : {}),
      })
      // Append note to local state
      setEvaluation((prev) =>
        prev
          ? { ...prev, notes: [...(prev.notes ?? []), note] }
          : prev
      )
      setShowNoteForm(false)
      setNoteContent('')
      setNoteBidId('')
    } catch (err: unknown) {
      setNoteError(extractNetworkMessage(err, 'فشل إضافة الملاحظة'))
    } finally {
      setNoteSubmitting(false)
    }
  }

  // ── Award handlers ────────────────────────────────────────────────────────

  function loadAward(tenderId: string) {
    getNetworkAwardByTender(tenderId)
      .then((a) => {
        setAward(a)
        setAwardLoaded(true)
      })
      .catch(() => {
        // 404 = no award yet — not an error
        setAwardLoaded(true)
      })
  }

  async function handleCreateAward(e: React.FormEvent) {
    e.preventDefault()
    if (!evaluation || !selectedBidId) return
    const confirmed = window.confirm(
      'هل تريد ترسية المناقصة على هذا العرض؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.'
    )
    if (!confirmed) return
    setAwarding(true)
    setAwardError(null)
    try {
      const created = await createNetworkAward(evaluation.tender_id, {
        winning_bid_id: selectedBidId,
        ...(awardReason.trim() ? { reason: awardReason.trim() } : {}),
      })
      setAward(created)
      setShowAwardForm(false)
    } catch (err: unknown) {
      // Backend is source of truth — display exact error, never imply success
      setAwardError(extractNetworkMessage(err, 'فشل ترسية المناقصة'))
    } finally {
      setAwarding(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingPage />
  if (error) return (
    <div className="space-y-4">
      <ErrorDisplay message={error} />
      <Link href="/network/tenders" className="text-sm text-muted-foreground hover:text-foreground">
        ← العودة إلى المناقصات
      </Link>
    </div>
  )
  if (!evaluation) return <ErrorDisplay message="التقييم غير موجود" />

  const isOpen = evaluation.status === 'open'
  const isCompleted = evaluation.status === 'completed'
  const notes = evaluation.notes ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">تقييم العروض</h1>
            <StatusBadge status={evaluation.status} />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {EVAL_STATUS_LABELS[evaluation.status] ?? evaluation.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            المناقصة:{' '}
            <Link
              href={`/network/tenders/${evaluation.tender_id}`}
              className="underline hover:no-underline"
            >
              {evaluation.tender_id}
            </Link>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isOpen && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openNoteForm()}
              >
                + ملاحظة
              </Button>
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completing}
              >
                {completing ? 'جارٍ الإتمام...' : 'إتمام التقييم'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Completed notice */}
      {isCompleted && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          ✓ اكتمل التقييم في {formatDate(evaluation.evaluation_completed_at)}.
          لا يمكن إعادة فتحه.
        </div>
      )}

      {completeError && <ErrorDisplay message={completeError} />}

      {/* ── Evaluation Summary ────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">ملخص التقييم</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">الحالة</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              <StatusBadge status={evaluation.status} />
              <span className="text-xs text-muted-foreground">
                ({EVAL_STATUS_LABELS[evaluation.status] ?? evaluation.status})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">تاريخ البدء</dt>
            <dd className="text-foreground mt-0.5">
              {formatDate(evaluation.evaluation_started_at)}
            </dd>
          </div>
          {evaluation.evaluation_completed_at && (
            <div>
              <dt className="text-muted-foreground">تاريخ الإتمام</dt>
              <dd className="text-foreground mt-0.5">
                {formatDate(evaluation.evaluation_completed_at)}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">معرّف التقييم</dt>
            <dd className="text-foreground mt-0.5 font-mono text-xs break-all">
              {evaluation.id}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── Add Note Form ─────────────────────────────────────────────────── */}
      {showNoteForm && isOpen && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة ملاحظة داخلية</h2>
          <p className="text-xs text-muted-foreground">
            الملاحظات داخلية — مرئية للمُقيِّمين المُخوَّلين فقط.
          </p>
          <form onSubmit={handleAddNote} className="space-y-4">
            {/* Optional bid link */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                ربط بعرض (اختياري)
              </label>
              {bids.length > 0 ? (
                <select
                  value={noteBidId}
                  onChange={(e) => setNoteBidId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— ملاحظة عامة —</option>
                  {bids.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id.slice(0, 8)}… ({BID_STATUS_LABELS[b.status] ?? b.status})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={noteBidId}
                  onChange={(e) => setNoteBidId(e.target.value)}
                  placeholder="UUID العرض (اختياري)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>

            {/* Note content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                محتوى الملاحظة <span className="text-destructive">*</span>
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => { setNoteContent(e.target.value); setNoteError(null) }}
                rows={4}
                maxLength={5000}
                placeholder="اكتب ملاحظتك الداخلية هنا..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                {noteContent.length}/5000
              </p>
            </div>

            {noteError && <ErrorDisplay message={noteError} />}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={noteSubmitting}>
                {noteSubmitting ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowNoteForm(false); setNoteError(null) }}
                disabled={noteSubmitting}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Bids Section ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">
            العروض المقدَّمة
            {bids.length > 0 && (
              <span className="mr-2 text-sm font-normal text-muted-foreground">
                ({bids.length})
              </span>
            )}
          </h2>
          {(isOpen || isCompleted) && !bidsLoaded && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadBids(evaluation.id)}
              disabled={bidsLoading}
            >
              {bidsLoading ? 'جارٍ التحميل...' : 'تحميل العروض'}
            </Button>
          )}
        </div>

        {/* Bid content gating — backend enforces this, UI reflects it */}
        {evaluation.status === 'not_started' && (
          <div className="p-3 bg-muted border border-border rounded-md text-sm text-muted-foreground">
            محتوى العروض غير متاح قبل بدء التقييم.
          </div>
        )}

        {bidsError && <ErrorDisplay message={bidsError} />}

        {bidsLoading && (
          <p className="text-sm text-muted-foreground">جارٍ تحميل العروض...</p>
        )}

        {bidsLoaded && bids.length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد عروض مقدَّمة لهذه المناقصة.</p>
        )}

        {bidsLoaded && bids.length > 0 && (
          <div className="space-y-3">
            {bids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                onAddNote={(bidId) => openNoteForm(bidId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Notes Section ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">
            الملاحظات الداخلية
            {notes.length > 0 && (
              <span className="mr-2 text-sm font-normal text-muted-foreground">
                ({notes.length})
              </span>
            )}
          </h2>
          {isOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openNoteForm()}
            >
              + ملاحظة جديدة
            </Button>
          )}
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isOpen ? 'لا توجد ملاحظات بعد. أضف أول ملاحظة.' : 'لا توجد ملاحظات.'}
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>

      {/* ── Award Section ─────────────────────────────────────────────────── */}
      {isCompleted && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">الترسية</h2>

          {/* Award result — already awarded */}
          {awardLoaded && award && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-2 text-sm">
              <p className="font-semibold text-green-800">✓ تمت الترسية</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">العرض الفائز</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/network/bids/${award.winning_bid_id}`}
                      className="font-mono text-xs text-primary underline hover:no-underline break-all"
                    >
                      {award.winning_bid_id}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">تاريخ الترسية</dt>
                  <dd className="text-foreground mt-0.5">{formatDate(award.awarded_at)}</dd>
                </div>
                {award.reason && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">السبب / الملاحظات</dt>
                    <dd className="text-foreground mt-0.5 whitespace-pre-line">{award.reason}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs">معرّف الترسية</dt>
                  <dd className="text-foreground mt-0.5 font-mono text-xs break-all">{award.id}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* No award yet — show form */}
          {awardLoaded && !award && (
            <>
              {!showAwardForm ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    التقييم مكتمل — يمكن الآن ترسية المناقصة على العرض الفائز.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => { setShowAwardForm(true); setAwardError(null) }}
                  >
                    ترسية المناقصة
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateAward} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    اختر العرض الفائز. يجب أن يكون العرض في حالة &quot;مُقدَّم&quot; وغير مسحوب.
                    هذا الإجراء نهائي ولا يمكن التراجع عنه.
                  </p>

                  {/* Bid selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      العرض الفائز <span className="text-destructive">*</span>
                    </label>
                    {bids.filter((b) => b.status === 'submitted' && !b.withdrawn_at).length > 0 ? (
                      <select
                        value={selectedBidId}
                        onChange={(e) => setSelectedBidId(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">— اختر العرض —</option>
                        {bids
                          .filter((b) => b.status === 'submitted' && !b.withdrawn_at)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.id.slice(0, 8)}… — مراجعة #{b.latest_revision_number}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedBidId}
                        onChange={(e) => setSelectedBidId(e.target.value)}
                        placeholder="UUID العرض الفائز"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                    )}
                  </div>

                  {/* Optional reason */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      سبب / ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={awardReason}
                      onChange={(e) => setAwardReason(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      placeholder="سبب اختيار هذا العرض..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {awardError && <ErrorDisplay message={awardError} />}

                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={awarding || !selectedBidId}>
                      {awarding ? 'جارٍ الترسية...' : 'تأكيد الترسية'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowAwardForm(false); setAwardError(null) }}
                      disabled={awarding}
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Loading award */}
          {!awardLoaded && (
            <p className="text-sm text-muted-foreground">جارٍ التحقق من حالة الترسية...</p>
          )}
        </div>
      )}

      {/* Back */}
      <div className="flex gap-4 text-sm">
        <Link
          href={`/network/tenders/${evaluation.tender_id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← العودة إلى المناقصة
        </Link>
        <Link
          href="/network/tenders"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← قائمة المناقصات
        </Link>
      </div>
    </div>
  )
}
