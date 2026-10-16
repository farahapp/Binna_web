'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getNetworkTender,
  publishNetworkTender,
  closeNetworkTender,
  listNetworkProfiles,
  submitNetworkBid,
  startNetworkEvaluation,
  extractNetworkMessage,
  type NetworkTender,
  type NetworkProfile,
  type NetworkBid,
  type NetworkEvaluation,
} from '@/lib/api/network'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { TENDER_VISIBILITY_LABELS as VISIBILITY_LABELS, TENDER_STATUS_LABELS as STATUS_LABELS } from '@/lib/api/network'

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

function isDeadlinePast(deadline: string | null | undefined): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export default function NetworkTenderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [tender, setTender] = useState<NetworkTender | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // ── Bid submission state ──────────────────────────────────────────────────
  const [myProfiles, setMyProfiles] = useState<NetworkProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [showBidForm, setShowBidForm] = useState(false)
  const [bidProfileId, setBidProfileId] = useState('')
  const [bidContentRaw, setBidContentRaw] = useState('{"amount": 0}')
  const [bidReason, setBidReason] = useState('')
  const [bidContentError, setBidContentError] = useState<string | null>(null)
  const [bidSubmitting, setBidSubmitting] = useState(false)
  const [bidSuccess, setBidSuccess] = useState<NetworkBid | null>(null)
  const [bidError, setBidError] = useState<string | null>(null)

  // ── Evaluation state ──────────────────────────────────────────────────────
  const [evalStarting, setEvalStarting] = useState(false)
  const [evalStarted, setEvalStarted] = useState<NetworkEvaluation | null>(null)
  const [evalStartError, setEvalStartError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getNetworkTender(id)
      .then(setTender)
      .catch((err: unknown) => {
        const msg = extractNetworkMessage(err, 'فشل تحميل المناقصة')
        // 403 = visibility restriction
        if (
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 403
        ) {
          setError('ليس لديك صلاحية الوصول إلى هذه المناقصة')
        } else {
          setError(msg)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handlePublish() {
    if (!tender) return
    setActionLoading(true)
    setActionMsg(null)
    setActionError(null)
    try {
      const updated = await publishNetworkTender(tender.id)
      setTender(updated)
      setActionMsg('تم نشر المناقصة بنجاح')
    } catch (err: unknown) {
      setActionError(extractNetworkMessage(err, 'فشل نشر المناقصة'))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClose() {
    if (!tender) return
    const confirmed = window.confirm('هل تريد إغلاق هذه المناقصة؟ لا يمكن التراجع عن هذا الإجراء.')
    if (!confirmed) return
    setActionLoading(true)
    setActionMsg(null)
    setActionError(null)
    try {
      const updated = await closeNetworkTender(tender.id)
      setTender(updated)
      setActionMsg('تم إغلاق المناقصة بنجاح')
    } catch (err: unknown) {
      setActionError(extractNetworkMessage(err, 'فشل إغلاق المناقصة'))
    } finally {
      setActionLoading(false)
    }
  }

  // ── Bid form handlers ─────────────────────────────────────────────────────

  async function handleOpenBidForm() {
    setShowBidForm(true)
    setBidSuccess(null)
    setBidError(null)
    setBidContentError(null)
    if (myProfiles.length === 0) {
      setProfilesLoading(true)
      try {
        const res = await listNetworkProfiles({ status: 'active' })
        setMyProfiles(res.data)
        if (res.data.length > 0) setBidProfileId(res.data[0].id)
      } catch {
        // non-fatal — user can still type profile id manually
      } finally {
        setProfilesLoading(false)
      }
    }
  }

  function validateBidContent(): Record<string, unknown> | null {
    setBidContentError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(bidContentRaw)
    } catch {
      setBidContentError('محتوى العرض يجب أن يكون JSON صالحاً')
      return null
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setBidContentError('محتوى العرض يجب أن يكون كائن JSON (object)')
      return null
    }
    if (Object.keys(parsed).length === 0) {
      setBidContentError('محتوى العرض لا يمكن أن يكون فارغاً')
      return null
    }
    return parsed as Record<string, unknown>
  }

  async function handleSubmitBid(e: React.FormEvent) {
    e.preventDefault()
    if (!tender) return
    const content = validateBidContent()
    if (!content) return
    if (!bidProfileId) {
      setBidContentError('يرجى اختيار ملف تعريف المقاول')
      return
    }
    setBidSubmitting(true)
    setBidError(null)
    try {
      const bid = await submitNetworkBid({
        tender_id: tender.id,
        contractor_profile_id: bidProfileId,
        content,
        ...(bidReason.trim() ? { reason: bidReason.trim() } : {}),
      })
      setBidSuccess(bid)
      setShowBidForm(false)
    } catch (err: unknown) {
      setBidError(extractNetworkMessage(err, 'فشل تقديم العرض'))
    } finally {
      setBidSubmitting(false)
    }
  }

  // ── Evaluation handler ────────────────────────────────────────────────────

  async function handleStartEvaluation() {
    if (!tender) return
    const confirmed = window.confirm(
      'هل تريد بدء تقييم العروض لهذه المناقصة؟ يجب أن تكون المناقصة مغلقة.'
    )
    if (!confirmed) return
    setEvalStarting(true)
    setEvalStartError(null)
    try {
      const evaluation = await startNetworkEvaluation(tender.id)
      setEvalStarted(evaluation)
    } catch (err: unknown) {
      setEvalStartError(extractNetworkMessage(err, 'فشل بدء التقييم'))
    } finally {
      setEvalStarting(false)
    }
  }

  if (loading) return <LoadingPage />
  if (error) return (
    <div className="space-y-4">
      <ErrorDisplay message={error} />
      <Link href="/network/tenders" className="text-sm text-muted-foreground hover:text-foreground">
        ← العودة إلى قائمة المناقصات
      </Link>
    </div>
  )
  if (!tender) return <ErrorDisplay message="المناقصة غير موجودة" />

  const deadlinePast = isDeadlinePast(tender.deadline)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{tender.title}</h1>
            <StatusBadge status={tender.status} />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {VISIBILITY_LABELS[tender.visibility]}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {tender.category}
            {tender.region ? ` · ${tender.region}` : ''}
          </p>
        </div>

        {/* Lifecycle actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {tender.status === 'draft' && (
            <>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={actionLoading}
              >
                {actionLoading ? 'جارٍ النشر...' : 'نشر المناقصة'}
              </Button>
              <Link
                href={`/network/tenders/${tender.id}/edit`}
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                تعديل
              </Link>
            </>
          )}
          {tender.status === 'published' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={actionLoading}
            >
              {actionLoading ? 'جارٍ الإغلاق...' : 'إغلاق المناقصة'}
            </Button>
          )}
        </div>
      </div>

      {/* Action messages */}
      {actionMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {actionMsg}
        </div>
      )}
      {actionError && <ErrorDisplay message={actionError} />}

      {/* Invited/Matched notice */}
      {(tender.visibility === 'invited' || tender.visibility === 'matched') && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <strong>ملاحظة:</strong> هذه المناقصة من نوع &quot;{VISIBILITY_LABELS[tender.visibility]}&quot;.
          سير عمل الدعوات والمطابقة الكاملة سيكون متاحاً في مرحلة لاحقة.
        </div>
      )}

      {/* Deadline warning */}
      {deadlinePast && tender.status === 'published' && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
          انتهى الموعد النهائي لهذه المناقصة. يُنصح بإغلاقها.
        </div>
      )}

      {/* Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">تفاصيل المناقصة</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">الحالة</dt>
            <dd className="mt-0.5">
              <StatusBadge status={tender.status} />
              {tender.status in STATUS_LABELS && (
                <span className="mr-2 text-xs text-muted-foreground">
                  ({STATUS_LABELS[tender.status as keyof typeof STATUS_LABELS]})
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">نوع الرؤية</dt>
            <dd className="text-foreground mt-0.5">{VISIBILITY_LABELS[tender.visibility]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">التصنيف</dt>
            <dd className="text-foreground mt-0.5">{tender.category}</dd>
          </div>
          {tender.region && (
            <div>
              <dt className="text-muted-foreground">المنطقة</dt>
              <dd className="text-foreground mt-0.5">{tender.region}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">الموعد النهائي</dt>
            <dd className={`mt-0.5 ${deadlinePast && tender.status === 'published' ? 'text-destructive font-medium' : 'text-foreground'}`}>
              {formatDate(tender.deadline)}
              {deadlinePast && tender.status === 'published' && ' ⚠️'}
            </dd>
          </div>
          {(tender.budget_min != null || tender.budget_max != null) && (
            <div>
              <dt className="text-muted-foreground">الميزانية</dt>
              <dd className="text-foreground mt-0.5">
                {tender.budget_min != null ? tender.budget_min.toLocaleString('ar-SA') : '—'}
                {' — '}
                {tender.budget_max != null ? tender.budget_max.toLocaleString('ar-SA') : '—'}
              </dd>
            </div>
          )}
          {tender.specializations && tender.specializations.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">التخصصات المطلوبة</dt>
              <dd className="text-foreground mt-0.5">{tender.specializations.join('، ')}</dd>
            </div>
          )}
          {tender.participant_types && tender.participant_types.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">أنواع المشاركين</dt>
              <dd className="text-foreground mt-0.5">{tender.participant_types.join('، ')}</dd>
            </div>
          )}
          {tender.description && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">الوصف</dt>
              <dd className="text-foreground mt-0.5 whitespace-pre-line">{tender.description}</dd>
            </div>
          )}
          {tender.requirements && tender.requirements.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">المتطلبات</dt>
              <dd className="mt-0.5">
                <ul className="list-disc list-inside space-y-1 text-foreground">
                  {tender.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">تاريخ الإنشاء</dt>
            <dd className="text-foreground mt-0.5">{formatDate(tender.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* ── Bid Submission Section ─────────────────────────────────────── */}
      {tender.status === 'published' && !deadlinePast && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">تقديم عرض</h2>
            {!showBidForm && !bidSuccess && (
              <Button size="sm" onClick={handleOpenBidForm} disabled={profilesLoading}>
                {profilesLoading ? 'جارٍ التحميل...' : '+ تقديم عرض جديد'}
              </Button>
            )}
          </div>

          {/* Success banner */}
          {bidSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
              <p className="font-medium">✓ تم تقديم العرض بنجاح</p>
              <p>
                رقم العرض:{' '}
                <Link
                  href={`/network/bids/${bidSuccess.id}`}
                  className="underline hover:no-underline"
                >
                  {bidSuccess.id}
                </Link>
              </p>
              <p>المراجعة رقم: {bidSuccess.latest_revision_number}</p>
            </div>
          )}

          {/* Bid form */}
          {showBidForm && (
            <form onSubmit={handleSubmitBid} className="space-y-4">
              {/* Profile selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ملف تعريف المقاول <span className="text-destructive">*</span>
                </label>
                {myProfiles.length > 0 ? (
                  <select
                    value={bidProfileId}
                    onChange={(e) => setBidProfileId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    {myProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.company_name} ({p.profile_type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bidProfileId}
                    onChange={(e) => setBidProfileId(e.target.value)}
                    placeholder="UUID ملف تعريف المقاول"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                )}
              </div>

              {/* Content (JSON) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  محتوى العرض (JSON) <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-1">
                  كائن JSON غير فارغ. مثال: {`{"amount": 50000, "notes": "..."}`}
                </p>
                <textarea
                  value={bidContentRaw}
                  onChange={(e) => { setBidContentRaw(e.target.value); setBidContentError(null) }}
                  rows={4}
                  dir="ltr"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                {bidContentError && (
                  <p className="text-xs text-destructive mt-1">{bidContentError}</p>
                )}
              </div>

              {/* Reason (optional) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ملاحظة / سبب (اختياري)
                </label>
                <input
                  type="text"
                  value={bidReason}
                  onChange={(e) => setBidReason(e.target.value)}
                  maxLength={1000}
                  placeholder="ملاحظة اختيارية..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {bidError && <ErrorDisplay message={bidError} />}

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={bidSubmitting}>
                  {bidSubmitting ? 'جارٍ التقديم...' : 'تقديم العرض'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowBidForm(false); setBidError(null); setBidContentError(null) }}
                  disabled={bidSubmitting}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Lifecycle restriction notice for non-published tenders */}
      {tender.status !== 'published' && (
        <div className="p-3 bg-muted border border-border rounded-md text-sm text-muted-foreground">
          {tender.status === 'draft' && 'المناقصة في مرحلة المسودة — يجب نشرها أولاً قبل قبول العروض.'}
          {tender.status === 'closed' && 'المناقصة مغلقة — لا يمكن تقديم عروض جديدة.'}
          {tender.status === 'awarded' && 'تم ترسية المناقصة — لا يمكن تقديم عروض جديدة.'}
        </div>
      )}

      {/* Deadline passed notice */}
      {tender.status === 'published' && deadlinePast && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
          انتهى الموعد النهائي لتقديم العروض على هذه المناقصة.
        </div>
      )}

      {/* ── Evaluation Section ─────────────────────────────────────────── */}
      {tender.status === 'closed' && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">تقييم العروض</h2>
            {!evalStarted && (
              <Button
                size="sm"
                onClick={handleStartEvaluation}
                disabled={evalStarting}
              >
                {evalStarting ? 'جارٍ البدء...' : 'بدء التقييم'}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            المناقصة مغلقة — يمكن بدء تقييم العروض المقدَّمة.
          </p>
          {evalStartError && <ErrorDisplay message={evalStartError} />}
          {evalStarted && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
              <p className="font-medium">✓ تم بدء التقييم بنجاح</p>
              <p>
                <Link
                  href={`/network/evaluations/${evalStarted.id}`}
                  className="underline hover:no-underline"
                >
                  فتح صفحة التقييم ←
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Back */}
      <div>
        <Link
          href="/network/tenders"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← العودة إلى قائمة المناقصات
        </Link>
      </div>
    </div>
  )
}
