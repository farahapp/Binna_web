'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listInventoryItems,
  type InventoryItem,
  extractMessage,
} from '@/lib/api/inventory'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

export default function InventoryItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const fetchItems = useCallback(() => {
    setLoading(true)
    setError(null)
    listInventoryItems(page)
      .then((res) => {
        setItems(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) =>
        setError(extractMessage(err, 'فشل تحميل قائمة المواد'))
      )
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المواد والأصناف</h1>
          <p className="text-muted-foreground text-sm mt-1">
            قائمة جميع المواد والأصناف في المخزون
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل المواد..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchItems} />
      ) : items.length === 0 ? (
        <EmptyState message="لا توجد مواد مسجلة حتى الآن" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">الاسم</th>
                  <th className="text-right px-4 py-3 font-medium">الرمز (SKU)</th>
                  <th className="text-right px-4 py-3 font-medium">الوحدة</th>
                  <th className="text-right px-4 py-3 font-medium">الفئة</th>
                  <th className="text-right px-4 py-3 font-medium">حد إعادة الطلب</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="bg-card hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {item.sku ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.reorder_level != null ? item.reorder_level : '—'}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/inventory/items/${item.id}`}
                        className="text-primary text-sm hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/inventory/items/${item.id}`}
                className="block bg-card border border-border rounded-lg p-4 space-y-1 hover:border-primary/50 transition-colors"
              >
                <p className="font-semibold text-foreground">{item.name}</p>
                {item.sku && (
                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {item.unit && <span>الوحدة: {item.unit}</span>}
                  {item.category && <span>الفئة: {item.category}</span>}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3">
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
        </>
      )}
    </div>
  )
}
