'use client'

/**
 * WEB-001C — Network Bid Detail Page
 *
 * Displays:
 *  - Current effective bid and its status
 *  - Full immutable version history (ordered by revision_number)
 *  - Revise form (when backend permits: status submitted|revised + tender window open)
 *  - Withdraw action (when backend permits: status submitted|revised)
 *
 * Backend is the source of truth for all lifecycle restrictions.
 * The UI reflects backend responses — it never invents permissions.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getNetworkBid,
  reviseNetworkBid,
  withdrawNetworkBid,
  extractNetworkMessage,
  type NetworkBid,
  type NetworkBidVersion,
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

const BID_STATUS_LABELS: Record<string, string> = {
  submitted: 'مُقدَّم',
  revised: 'مُعدَّل',
  withdrawn: 'مسحوب',
}

const VERSION_STATUS_LABELS: Record<string, string> = {
  effective: 'ساري',
  superseded: 'مُستبدَل',
  withdrawn: 'مسحوب',
}

// ─── Version History Row ──────────────────────────────────────────────────────

function VersionRow({ version, isEffective }: { version: NetworkBidVersion; isEffective: boolean }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`border rounded-md p-3 text-sm space-y-1 ${
        isEffective ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">مراجعة #{version.revision_number}</span>
          {isEffective && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              ساري
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {VERSION_STATUS_LABELS[version.status] ?? version.status}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(version.submitted_at)}</span>
      </div>
      {version.reason && (
        <p className="text-muted-foreground text-xs">السبب: {version.reason}</p>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-primary hover:underline"
      >
        {expanded ? 'إخفاء المحتوى' : 'عرض المحتوى'}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">
          {JSON.stringify(version.content, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetworkBidDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [bid, setBid] = useState<NetworkBid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Revise state ──────────────────────────────────────────────────────────
  const [showReviseForm, setShowReviseForm] = useState(false)
  const [reviseContentRaw, setReviseContentRaw] = useState('')
  const [reviseReason, setReviseReason] = useState('')
  const [reviseContentError, setReviseContentError] = useState<string | null>(null)
  const [revising, setRevising] = useState(false)
  const [reviseError, setReviseError] = useState<string | null>(null)

  // ── Withdraw state ────────────────────────────────────────────────────────
  const [withdrawReason, setWithdrawReason] = useState('')
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getNetworkBid(id)
      .then((b) => {
        setBid(b)
        // Pre-fill revise form with current effective content
        const effective = b.versions?.find((v) => v.status === 'effective')
        if (effective) {
          setReviseContentRaw(JSON.stringify(effective.content, null, 2))
        }
      })
      .catch((err: unknown) => {
        if (
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 403
        ) {
          setError('ليس لديك صلاحية الوصول إلى هذا العرض')
        } else {
          setError(extractNetworkMessage(err, 'فشل تحميل العرض'))
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── Revise handlers ───────────────────────────────────────────────────────

  function validateReviseContent(): Record<string, unknown> | null {
    setReviseContentError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(reviseContentRaw)
    } catch {
      setReviseContentError('محتوى العرض يجب أن يكون JSON صالحاً')
      return null
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setReviseContentError('محتوى العرض يجب أن يكون كائن JSON (object)')
      return null
    }
    if (Object.keys(parsed).length === 0) {
      setReviseContentError('محتوى العرض لا يمكن أن يكون فارغاً')
      return null
    }
    return parsed as Record<string, unknown>
  }

  async function handleRevise(e: React.FormEvent) {
    e.preventDefault()
    if (!bid) return
    const content = validateReviseContent()
    if (!content) return
    setRevising(true)
    setReviseError(null)
    try {
      const updated = await reviseNetworkBid(bid.id, {
        content,
        ...(reviseReason.trim() ? { reason: reviseReason.trim() } : {}),
      })
      setBid(updated)
      setShowReviseForm(false)
      setReviseReason('')
    } catch (err: unknown) {
      // Backend may reject revision (e.g. deadline passed, evaluation state)
      // Display the exact backend message — never imply success on failure
      setReviseError(extractNetworkMessage(err, 'فشل تعديل العرض'))
    } finally {
      setRevising(false)
    }
  }

  // ── Withdraw handlers ─────────────────────────────────────────────────────

  async function handleWithdraw() {
    if (!bid) return
    setWithdrawing(true)
    setWithdrawError(null)
    try {
      const updated = await withdrawNetworkBid(bid.id, {
        ...(withdrawReason.trim() ? { reason: withdrawReason.trim() } : {}),
      })
      setBid(updated)
      setShowWithdrawConfirm(false)
      setWithdrawReason('')
    } catch (err: unknown) {
      // Backend may reject withdrawal — display exact message
      setWithdrawError(extractNetworkMessage(err, 'فشل سحب العرض'))
    } finally {
      setWithdrawing(false)
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
  if (!bid) return <ErrorDisplay message="العرض غير موجود" />

  const canRevise = bid.status === 'submitted' || bid.status === 'revised'
  const canWithdraw = bid.status === 'submitted' || bid.status === 'revised'
  const effectiveVersion = bid.versions?.find((v) => v.status === 'effective')
  const sortedVersions = [...(bid.versions ?? [])].sort(
    (a, b) => b.revision_number - a.revision_number
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">تفاصيل العرض</h1>
            <StatusBadge status={bid.status} />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {BID_STATUS_LABELS[bid.status] ?? bid.status}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            المناقصة:{' '}
            <Link
              href={`/network/tenders/${bid.tender_id}`}
              className="underline hover:no-underline"
            >
              {bid.tender_id}
            </Link>
          </p>
        </div>

        {/* Lifecycle actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {canRevise && !showReviseForm && (
            <Button
              size="sm"
              onClick={() => { setShowReviseForm(true); setReviseError(null); setReviseContentError(null) }}
            >
              تعديل العرض
            </Button>
          )}
          {canWithdraw && !showWithdrawConfirm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowWithdrawConfirm(true); setWithdrawError(null) }}
            >
              سحب العرض
            </Button>
          )}
        </div>
      </div>

      {/* Withdrawn notice */}
      {bid.status === 'withdrawn' && (
        <div className="p-3 bg-muted border border-border rounded-md text-sm text-muted-foreground">
          تم سحب هذا العرض في {formatDate(bid.withdrawn_at)}.
          لا يمكن تعديله أو إعادة تقديمه.
        </div>
      )}

      {/* ── Revise Form ─────────────────────────────────────────────────── */}
      {showReviseForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">تعديل العرض</h2>
          <form onSubmit={handleRevise} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                محتوى العرض الجديد (JSON) <span className="text-destructive">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1">
                كائن JSON غير فارغ. يستبدل المحتوى الحالي.
              </p>
              <textarea
                value={reviseContentRaw}
                onChange={(e) => { setReviseContentRaw(e.target.value); setReviseContentError(null) }}
                rows={5}
                dir="ltr"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              {reviseContentError && (
                <p className="text-xs text-destructive mt-1">{reviseContentError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                سبب التعديل (اختياري)
              </label>
              <input
                type="text"
                value={reviseReason}
                onChange={(e) => setReviseReason(e.target.value)}
                maxLength={1000}
                placeholder="سبب التعديل..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {reviseError && <ErrorDisplay message={reviseError} />}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={revising}>
                {revising ? 'جارٍ التعديل...' : 'تأكيد التعديل'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowReviseForm(false); setReviseError(null); setReviseContentError(null) }}
                disabled={revising}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Withdraw Confirm ─────────────────────────────────────────────── */}
      {showWithdrawConfirm && (
        <div className="bg-card border border-destructive/40 rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-destructive">تأكيد سحب العرض</h2>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من سحب هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              سبب السحب (اختياري)
            </label>
            <input
              type="text"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              maxLength={1000}
              placeholder="سبب السحب..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {withdrawError && <ErrorDisplay message={withdrawError} />}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              {withdrawing ? 'جارٍ السحب...' : 'تأكيد السحب'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowWithdrawConfirm(false); setWithdrawError(null) }}
              disabled={withdrawing}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* ── Bid Summary ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">ملخص العرض</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">الحالة</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              <StatusBadge status={bid.status} />
              <span className="text-xs text-muted-foreground">
                ({BID_STATUS_LABELS[bid.status] ?? bid.status})
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">رقم المراجعة الحالية</dt>
            <dd className="text-foreground mt-0.5">{bid.latest_revision_number}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">تاريخ التقديم</dt>
            <dd className="text-foreground mt-0.5">{formatDate(bid.submitted_at)}</dd>
          </div>
          {bid.withdrawn_at && (
            <div>
              <dt className="text-muted-foreground">تاريخ السحب</dt>
              <dd className="text-foreground mt-0.5">{formatDate(bid.withdrawn_at)}</dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">معرّف العرض</dt>
            <dd className="text-foreground mt-0.5 font-mono text-xs break-all">{bid.id}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">معرّف المناقصة</dt>
            <dd className="mt-0.5">
              <Link
                href={`/network/tenders/${bid.tender_id}`}
                className="font-mono text-xs text-primary underline hover:no-underline break-all"
              >
                {bid.tender_id}
              </Link>
            </dd>
          </div>
        </dl>

        {/* Effective content preview */}
        {effectiveVersion && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1">المحتوى الساري الحالي</p>
            <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">
              {JSON.stringify(effectiveVersion.content, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ── Version History ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          سجل المراجعات ({sortedVersions.length})
        </h2>
        {sortedVersions.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد مراجعات.</p>
        ) : (
          <div className="space-y-2">
            {sortedVersions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                isEffective={v.id === bid.effective_version_id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Back */}
      <div className="flex gap-4 text-sm">
        <Link
          href={`/network/tenders/${bid.tender_id}`}
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
