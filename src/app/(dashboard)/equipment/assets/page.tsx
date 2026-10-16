'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listAssets, extractMessage, type Asset } from '@/lib/api/equipment'

function AssetTypeBadge({ type }: { type?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    owned: { label: 'مملوك', className: 'bg-green-100 text-green-700 border-green-200' },
    leased: { label: 'مستأجر', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  }
  const s = map[type ?? ''] ?? {
    label: type ?? '—',
    className: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'نشط', className: 'bg-green-100 text-green-700 border-green-200' },
    allocated: { label: 'مخصص', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    maintenance: { label: 'صيانة', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    decommissioned: { label: 'مسحوب', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[status ?? ''] ?? {
    label: status ?? '—',
    className: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

export default function AssetsListPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  async function load(p: number) {
    setLoading(true)
    setError(null)
    try {
      const result = await listAssets(p)
      setAssets(result.data)
      setLastPage(result.last_page ?? 1)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأصول والمعدات</h1>
          <p className="text-muted-foreground text-sm mt-1">قائمة الأصول والمعدات المسجلة</p>
        </div>
        <Link
          href="/equipment/assets/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + أصل جديد
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          جارٍ التحميل…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && assets.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          لا توجد أصول مسجلة بعد.
        </div>
      )}

      {!loading && !error && assets.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-right text-muted-foreground">
                  <th className="px-4 py-3 font-medium">كود الأصل</th>
                  <th className="px-4 py-3 font-medium">الاسم</th>
                  <th className="px-4 py-3 font-medium">الفئة</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">تكلفة الاقتناء</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{asset.asset_code}</td>
                    <td className="px-4 py-3 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{asset.category ?? '—'}</td>
                    <td className="px-4 py-3"><AssetTypeBadge type={asset.asset_type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {asset.acquisition_cost ? `${asset.acquisition_cost} ${asset.currency ?? ''}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/equipment/assets/${asset.id}`} className="text-primary text-xs hover:underline">
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {assets.map((asset) => (
              <Link
                key={asset.id}
                href={`/equipment/assets/${asset.id}`}
                className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{asset.asset_code}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={asset.status} />
                    <AssetTypeBadge type={asset.asset_type} />
                  </div>
                </div>
                {asset.category && (
                  <p className="text-sm text-muted-foreground mt-2">{asset.category}</p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 transition-colors"
              >
                السابق
              </button>
              <span className="text-sm text-muted-foreground">{page} / {lastPage}</span>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 transition-colors"
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
