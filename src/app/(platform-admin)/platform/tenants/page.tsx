'use client'

/**
 * Platform Admin — Tenants List
 *
 * GET /api/platform/tenants?status=&search=&page=&per_page=20
 * Protected by: auth:platform-token + platform.operator middleware.
 * schema_name is never returned by the backend.
 *
 * Features:
 *  - Paginated list of all tenants
 *  - Filter by status (all / pending / active / suspended)
 *  - Search by slug or name
 *  - Link to tenant detail page
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { platformTenantsApi, type Tenant, type TenantsPage } from '@/lib/api/platform'
import { StatusBadge } from '@/components/ui/status-badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { PageHeader } from '@/components/ui/page-header'

const STATUS_OPTIONS = [
  { value: '',          label: 'الكل' },
  { value: 'pending',   label: 'قيد الانتظار' },
  { value: 'active',    label: 'نشط' },
  { value: 'suspended', label: 'موقوف' },
]

export default function PlatformTenantsPage() {
  const [page,   setPage]   = useState<TenantsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [currentPage,  setCurrentPage]  = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    platformTenantsApi
      .list({ status: statusFilter || undefined, search: search || undefined, page: currentPage, per_page: 20 })
      .then(setPage)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'فشل تحميل المستأجرين'))
      .finally(() => setLoading(false))
  }, [statusFilter, search, currentPage])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setCurrentPage(1)
  }

  const handleStatusChange = (v: string) => {
    setStatusFilter(v)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="المستأجرون" description="قائمة جميع مستأجري المنصة" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status filter */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-border text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث بالاسم أو الـ slug..."
            className="form-input flex-1"
            dir="rtl"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-800 transition-colors"
          >
            بحث
          </button>
        </form>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner message="جارٍ تحميل المستأجرين..." />}
      {error   && <ErrorDisplay message={error} onRetry={load} />}

      {!loading && !error && page && (
        <>
          {/* Summary */}
          <p className="text-sm text-muted-foreground">
            {page.total} مستأجر — صفحة {page.current_page} من {page.last_page}
          </p>

          {/* Table */}
          {page.data.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              لا توجد نتائج
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">الاسم</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Slug</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">تاريخ الإنشاء</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {page.data.map((tenant: Tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{tenant.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tenant.slug}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(tenant.created_at).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <Link
                          href={`/platform/tenants/${tenant.id}`}
                          className="text-primary text-xs hover:underline"
                        >
                          تفاصيل
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {page.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded border border-border text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                السابق
              </button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {page.last_page}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(page.last_page, p + 1))}
                disabled={currentPage === page.last_page}
                className="px-3 py-1.5 rounded border border-border text-sm disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
