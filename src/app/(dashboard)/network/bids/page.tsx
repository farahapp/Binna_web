'use client'

/**
 * G-05 — /network/bids — Network Bids List (NETWORK-003)
 *
 * Backend status: GET /bids/{id} exists (NETWORK-003).
 * No dedicated GET /bids list endpoint exists in V1.
 *
 * This page provides bid navigation by listing published/closed tenders
 * and linking to the existing bid detail page (/network/bids/[id]).
 * Users can submit a new bid from a tender's context.
 *
 * Backend authority: all bid lifecycle rules enforced by Laravel 12 REST API.
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listNetworkTenders,
  TENDER_STATUS_LABELS,
  extractNetworkMessage,
  type NetworkTender,
  type NetworkTenderFilters,
  type TenderStatus,
} from '@/lib/api/network'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const STATUS_COLORS: Record<TenderStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-blue-100 text-blue-700',
  closed: 'bg-yellow-100 text-yellow-700',
  awarded: 'bg-green-100 text-green-700',
}

// ─── Tender Row ───────────────────────────────────────────────────────────────

interface TenderRowProps {
  tender: NetworkTender
}

function TenderRow({ tender }: TenderRowProps) {
  const statusLabel = TENDER_STATUS_LABELS[tender.status] ?? tender.status
  const statusColor = STATUS_COLORS[tender.status] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{tender.title}</p>
          {tender.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {tender.description}
            </p>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span>📅 الموعد النهائي: {formatDate(tender.deadline)}</span>
        {tender.budget_min && <span>💰 الميزانية من: {Number(tender.budget_min).toLocaleString('ar-SA')} ر.س</span>}
        <span>🔒 الرؤية: {tender.visibility}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <Link
          href={`/network/tenders/${tender.id}`}
          className="text-xs text-primary hover:underline font-medium"
        >
          عرض المناقصة ←
        </Link>
        {(tender.status === 'published') && (
          <Link
            href={`/network/tenders/${tender.id}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            📤 تقديم عطاء
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BID_RELEVANT_STATUSES: TenderStatus[] = ['published', 'closed', 'awarded']

export default function NetworkBidsPage() {
  const [tenders, setTenders] = useState<NetworkTender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<TenderStatus | ''>('published')

  const fetchTenders = useCallback(() => {
    setLoading(true)
    setError(null)
    const filters: NetworkTenderFilters = { page }
    if (statusFilter) filters.status = statusFilter
    listNetworkTenders(filters)
      .then((res) => {
        setTenders(res.data)
        setLastPage(res.meta.last_page)
        setTotal(res.meta.total)
      })
      .catch((err: unknown) =>
        setError(extractNetworkMessage(err, 'فشل تحميل قائمة المناقصات'))
      )
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => {
    fetchTenders()
  }, [fetchTenders])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العطاءات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            تصفح المناقصات المتاحة وتقديم العطاءات أو متابعة العطاءات المقدمة
          </p>
        </div>
        <Link
          href="/network/tenders"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors text-muted-foreground"
        >
          📋 جميع المناقصات
        </Link>
      </div>

      {/* Info notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm font-medium text-foreground">ملاحظة — V1</p>
        <p className="text-xs text-muted-foreground mt-1">
          لعرض تفاصيل عطاء مقدم، انتقل إلى صفحة المناقصة ثم اختر العطاء من قائمة العطاءات.
          قائمة العطاءات الشاملة ستكون متاحة في تحديث قادم.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">الحالة:</span>
        <button
          onClick={() => { setStatusFilter(''); setPage(1) }}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            statusFilter === ''
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          الكل
        </button>
        {BID_RELEVANT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {TENDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل المناقصات..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchTenders} />
      ) : tenders.length === 0 ? (
        <EmptyState message="لا توجد مناقصات متاحة بهذه الحالة." />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{total} مناقصة</p>

          <div className="space-y-3">
            {tenders.map((tender) => (
              <TenderRow key={tender.id} tender={tender} />
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← السابق
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {lastPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                التالي →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
