'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getInventoryItem,
  listItemStockLevels,
  getItemTotalQuantity,
  issueStock,
  transferStock,
  type InventoryItem,
  type StockLevel,
  type TotalQuantity,
  type IssueStockPayload,
  type TransferStockPayload,
  extractMessage,
} from '@/lib/api/inventory'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_ISSUE_FORM: IssueStockPayload = {
  quantity: 0,
  project_id: '',
  reference: '',
  notes: '',
}

const INITIAL_TRANSFER_FORM: TransferStockPayload = {
  quantity: 0,
  from_warehouse: '',
  to_warehouse: '',
  notes: '',
}

export default function InventoryItemDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)

  const [totalQty, setTotalQty] = useState<TotalQuantity | null>(null)

  // Issue stock form
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueForm, setIssueForm] = useState<IssueStockPayload>(INITIAL_ISSUE_FORM)
  const [issueError, setIssueError] = useState<string | null>(null)
  const [issueSubmitting, setIssueSubmitting] = useState(false)
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null)

  // Transfer stock form
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [transferForm, setTransferForm] = useState<TransferStockPayload>(INITIAL_TRANSFER_FORM)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null)

  const fetchItem = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([
      getInventoryItem(id),
      getItemTotalQuantity(id).catch(() => null),
    ])
      .then(([itemData, qty]) => {
        setItem(itemData)
        setTotalQty(qty)
      })
      .catch((err: unknown) =>
        setError(extractMessage(err, 'فشل تحميل بيانات المادة'))
      )
      .finally(() => setLoading(false))
  }, [id])

  const fetchStockLevels = useCallback(() => {
    if (!id) return
    setStockLoading(true)
    setStockError(null)
    listItemStockLevels(id)
      .then(setStockLevels)
      .catch((err: unknown) =>
        setStockError(extractMessage(err, 'فشل تحميل مستويات المخزون'))
      )
      .finally(() => setStockLoading(false))
  }, [id])

  useEffect(() => {
    fetchItem()
    fetchStockLevels()
  }, [fetchItem, fetchStockLevels])

  function handleIssueChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setIssueForm((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? (value ? parseFloat(value) : 0) : value,
    }))
  }

  async function handleIssueSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIssueError(null)
    setIssueSuccess(null)
    if (!issueForm.quantity || issueForm.quantity <= 0) {
      setIssueError('الكمية مطلوبة ويجب أن تكون أكبر من صفر')
      return
    }
    setIssueSubmitting(true)
    try {
      await issueStock(id, {
        quantity: issueForm.quantity,
        project_id: issueForm.project_id?.trim() || undefined,
        reference: issueForm.reference?.trim() || undefined,
        notes: issueForm.notes?.trim() || undefined,
      })
      setIssueSuccess('تم صرف الكمية بنجاح')
      setIssueForm(INITIAL_ISSUE_FORM)
      setShowIssueForm(false)
      fetchStockLevels()
      fetchItem()
    } catch (err: unknown) {
      setIssueError(extractMessage(err, 'فشل صرف الكمية'))
    } finally {
      setIssueSubmitting(false)
    }
  }

  function handleTransferChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setTransferForm((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? (value ? parseFloat(value) : 0) : value,
    }))
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTransferError(null)
    setTransferSuccess(null)
    if (!transferForm.quantity || transferForm.quantity <= 0) {
      setTransferError('الكمية مطلوبة ويجب أن تكون أكبر من صفر')
      return
    }
    setTransferSubmitting(true)
    try {
      await transferStock(id, {
        quantity: transferForm.quantity,
        from_warehouse: transferForm.from_warehouse?.trim() || undefined,
        to_warehouse: transferForm.to_warehouse?.trim() || undefined,
        notes: transferForm.notes?.trim() || undefined,
      })
      setTransferSuccess('تم نقل الكمية بنجاح')
      setTransferForm(INITIAL_TRANSFER_FORM)
      setShowTransferForm(false)
      fetchStockLevels()
      fetchItem()
    } catch (err: unknown) {
      setTransferError(extractMessage(err, 'فشل نقل الكمية'))
    } finally {
      setTransferSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات المادة..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchItem} />
  if (!item) return <ErrorDisplay message="المادة غير موجودة" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/inventory/items" className="hover:text-primary">
              المواد والأصناف
            </Link>
            <span>/</span>
            <span>{item.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">تفاصيل المادة وحركات المخزون</p>
        </div>
        {totalQty?.total_quantity != null && (
          <div className="bg-muted px-4 py-2 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">إجمالي الكمية</p>
            <p className="text-xl font-bold text-foreground">{totalQty.total_quantity}</p>
            {item.unit && (
              <p className="text-xs text-muted-foreground">{item.unit}</p>
            )}
          </div>
        )}
      </div>

      {/* Item details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات المادة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">المعرّف: </span>
            <span className="text-foreground font-mono text-xs">{item.id}</span>
          </div>
          {item.sku && (
            <div>
              <span className="text-muted-foreground">الرمز (SKU): </span>
              <span className="text-foreground font-mono">{item.sku}</span>
            </div>
          )}
          {item.unit && (
            <div>
              <span className="text-muted-foreground">الوحدة: </span>
              <span className="text-foreground">{item.unit}</span>
            </div>
          )}
          {item.category && (
            <div>
              <span className="text-muted-foreground">الفئة: </span>
              <span className="text-foreground">{item.category}</span>
            </div>
          )}
          {item.reorder_level != null && (
            <div>
              <span className="text-muted-foreground">حد إعادة الطلب: </span>
              <span className="text-foreground">{item.reorder_level}</span>
            </div>
          )}
          {item.description && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">الوصف: </span>
              <span className="text-foreground">{item.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stock levels */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">مستويات المخزون</h2>
        {stockLoading ? (
          <LoadingSpinner message="جارٍ تحميل مستويات المخزون..." />
        ) : stockError ? (
          <ErrorDisplay message={stockError} onRetry={fetchStockLevels} />
        ) : stockLevels.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد بيانات مخزون مسجلة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-right px-3 py-2 font-medium">المستودع</th>
                  <th className="text-right px-3 py-2 font-medium">الموقع</th>
                  <th className="text-right px-3 py-2 font-medium">الكمية</th>
                  <th className="text-right px-3 py-2 font-medium">المحجوز</th>
                  <th className="text-right px-3 py-2 font-medium">المتاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stockLevels.map((sl, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="px-3 py-2 text-foreground">{sl.warehouse ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sl.location ?? '—'}</td>
                    <td className="px-3 py-2 text-foreground">{sl.quantity ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {sl.reserved_quantity ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-foreground font-medium">
                      {sl.available_quantity ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">إجراءات المخزون</h2>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowIssueForm((v) => !v)
              setShowTransferForm(false)
              setIssueError(null)
              setIssueSuccess(null)
            }}
          >
            {showIssueForm ? 'إلغاء الصرف' : 'صرف كمية'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowTransferForm((v) => !v)
              setShowIssueForm(false)
              setTransferError(null)
              setTransferSuccess(null)
            }}
          >
            {showTransferForm ? 'إلغاء النقل' : 'نقل كمية'}
          </Button>
        </div>

        {/* Issue success */}
        {issueSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {issueSuccess}
          </div>
        )}

        {/* Transfer success */}
        {transferSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {transferSuccess}
          </div>
        )}

        {/* Issue form */}
        {showIssueForm && (
          <div className="border border-border rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">صرف كمية من المخزون</h3>
            {issueError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {issueError}
              </div>
            )}
            <form onSubmit={handleIssueSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    الكمية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="0.01"
                    step="any"
                    value={issueForm.quantity || ''}
                    onChange={handleIssueChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">معرّف المشروع</label>
                  <input
                    type="text"
                    name="project_id"
                    value={issueForm.project_id ?? ''}
                    onChange={handleIssueChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">المرجع</label>
                  <input
                    type="text"
                    name="reference"
                    value={issueForm.reference ?? ''}
                    onChange={handleIssueChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">ملاحظات</label>
                  <input
                    type="text"
                    name="notes"
                    value={issueForm.notes ?? ''}
                    onChange={handleIssueChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
              </div>
              <Button type="submit" disabled={issueSubmitting}>
                {issueSubmitting ? 'جارٍ الصرف...' : 'تأكيد الصرف'}
              </Button>
            </form>
          </div>
        )}

        {/* Transfer form */}
        {showTransferForm && (
          <div className="border border-border rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">نقل كمية بين المستودعات</h3>
            {transferError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {transferError}
              </div>
            )}
            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    الكمية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="0.01"
                    step="any"
                    value={transferForm.quantity || ''}
                    onChange={handleTransferChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">من المستودع</label>
                  <input
                    type="text"
                    name="from_warehouse"
                    value={transferForm.from_warehouse ?? ''}
                    onChange={handleTransferChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">إلى المستودع</label>
                  <input
                    type="text"
                    name="to_warehouse"
                    value={transferForm.to_warehouse ?? ''}
                    onChange={handleTransferChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">ملاحظات</label>
                  <input
                    type="text"
                    name="notes"
                    value={transferForm.notes ?? ''}
                    onChange={handleTransferChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
              </div>
              <Button type="submit" disabled={transferSubmitting}>
                {transferSubmitting ? 'جارٍ النقل...' : 'تأكيد النقل'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
