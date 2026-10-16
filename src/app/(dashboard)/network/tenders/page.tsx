'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listNetworkTenders,
  extractNetworkMessage,
  TENDER_VISIBILITY_LABELS,
  TENDER_STATUS_LABELS,
  type NetworkTender,
  type TenderStatus,
  type TenderVisibility,
} from '@/lib/api/network'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'

// ─── Label maps ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TenderStatus | ''; label: string }[] = [
  { value: '', label: 'جميع الحالات' },
  { value: 'draft', label: 'مسودة' },
  { value: 'published', label: 'منشور' },
  { value: 'closed', label: 'مغلق' },
  { value: 'awarded', label: 'مُرسَّى' },
]

const VISIBILITY_OPTIONS: { value: TenderVisibility | ''; label: string }[] = [
  { value: '', label: 'جميع أنواع الرؤية' },
  { value: 'public', label: 'عام' },
  { value: 'private', label: 'خاص' },
  { value: 'invited', label: 'بالدعوة' },
  { value: 'matched', label: 'مطابق' },
]

// Label maps are exported from @/lib/api/network as TENDER_VISIBILITY_LABELS / TENDER_STATUS_LABELS

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return '—'
  const d = new Date(deadline)
  const now = new Date()
  const isPast = d < now
  const formatted = d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  return isPast ? `${formatted} (منتهي)` : formatted
}

function isDeadlinePast(deadline: string | null | undefined): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetworkTendersPage() {
  const [tenders, setTenders] = useState<NetworkTender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<TenderStatus | ''>('')
  const [visibilityFilter, setVisibilityFilter] = useState<TenderVisibility | ''>('')

  const fetchTenders = useCallback(() => {
    setLoading(true)
    setError(null)
    listNetworkTenders({
      page,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(visibilityFilter ? { visibility: visibilityFilter } : {}),
    })
      .then((res) => {
        setTenders(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) =>
        setError(extractNetworkMessage(err, 'فشل تحميل قائمة المناقصات'))
      )
      .finally(() => setLoading(false))
  }, [page, statusFilter, visibilityFilter])

  useEffect(() => {
    fetchTenders()
  }, [fetchTenders])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مناقصات الشبكة</h1>
          <p className="text-muted-foreground text-sm mt-1">
            مناقصات شبكة البناء التجارية — عامة وخاصة
          </p>
        </div>
        <Link
          href="/network/tenders/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + مناقصة جديدة
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as TenderStatus | ''); setPage(1) }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => { setVisibilityFilter(e.target.value as TenderVisibility | ''); setPage(1) }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchTenders} />
      ) : tenders.length === 0 ? (
        <EmptyState message="لا توجد مناقصات — أنشئ أول مناقصة في شبكة البناء التجارية" />
      ) : (
        <div className="space-y-3">
          {tenders.map((tender) => (
            <div
              key={tender.id}
              className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/network/tenders/${tender.id}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {tender.title}
                  </Link>
                  <StatusBadge status={tender.status} />
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {TENDER_VISIBILITY_LABELS[tender.visibility]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tender.category}
                  {tender.region ? ` · ${tender.region}` : ''}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className={isDeadlinePast(tender.deadline) && tender.status === 'published' ? 'text-destructive font-medium' : ''}>
                    الموعد النهائي: {formatDeadline(tender.deadline)}
                  </span>
                  {(tender.budget_min || tender.budget_max) && (
                    <span>
                      الميزانية:{' '}
                      {tender.budget_min ? tender.budget_min.toLocaleString('ar-SA') : '—'}
                      {' — '}
                      {tender.budget_max ? tender.budget_max.toLocaleString('ar-SA') : '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/network/tenders/${tender.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  عرض
                </Link>
                {tender.status === 'draft' && (
                  <Link
                    href={`/network/tenders/${tender.id}/edit`}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    تعديل
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
