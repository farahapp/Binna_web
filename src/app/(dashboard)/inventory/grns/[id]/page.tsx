'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getGRN,
  addGRNItem,
  confirmGRN,
  cancelGRN,
  type GoodsReceiptNote,
  type CreateGRNItemPayload,
  extractMessage,
} from '@/lib/api/inventory'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_ITEM_FORM: CreateGRNItemPayload = {
  inventory_item_id: '',
  quantity_received: 0,
  unit: '',
  notes: '',
}

export default function GRNDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [grn, setGrn] = useState<GoodsReceiptNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Add item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState<CreateGRNItemPayload>(INITIAL_ITEM_FORM)
  const [itemFormError, setItemFormError] = useState<string | null>(null)
  const [itemSubmitting, setItemSubmitting] = useState(false)
  const [itemSuccess, setItemSuccess] = useState<string | null>(null)

  const fetchGRN = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getGRN(id)
      .then((data) => setGrn(data))
      .catch((err: unknown) =>
        setError(extractMessage(err, 'فشل تحميل بيانات سند الاستلام'))
      )
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchGRN()
  }, [fetchGRN])

  async function handleAction(
    action: 'confirm' | 'cancel',
    fn: (id: string) => Promise<GoodsReceiptNote>,
    successText: string
  ) {
    setActionLoading(action)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await fn(id)
      setGrn(updated)
      setActionSuccess(successText)
    } catch (err: unknown) {
      setActionError(extractMessage(err, 'فشل تنفيذ الإجراء'))
    } finally {
      setActionLoading(null)
    }
  }

  function handleItemFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setItemForm((prev) => ({
      ...prev,
      [name]:
        name === 'quantity_received' ? (value ? parseFloat(value) : 0) : value,
    }))
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    setItemFormError(null)
    setItemSuccess(null)

    if (!itemForm.inventory_item_id.trim()) {
      setItemFormError('معرّف المادة مطلوب')
      return
    }
    if (!itemForm.quantity_received || itemForm.quantity_received <= 0) {
      setItemFormError('الكمية المستلمة مطلوبة ويجب أن تكون أكبر من صفر')
      return
    }

    setItemSubmitting(true)
    try {
      await addGRNItem(id, {
        inventory_item_id: itemForm.inventory_item_id.trim(),
        quantity_received: itemForm.quantity_received,
        unit: itemForm.unit?.trim() || undefined,
        notes: itemForm.notes?.trim() || undefined,
      })
      setItemSuccess('تم إضافة البند بنجاح')
      setItemForm(INITIAL_ITEM_FORM)
      setShowItemForm(false)
    } catch (err: unknown) {
      setItemFormError(extractMessage(err, 'فشل إضافة البند'))
    } finally {
      setItemSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات سند الاستلام..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchGRN} />
  if (!grn) return <ErrorDisplay message="سند الاستلام غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/inventory/grns" className="hover:text-primary">
              سندات الاستلام
            </Link>
            <span>/</span>
            <span>{grn.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">سند الاستلام</h1>
          <p className="text-muted-foreground text-sm mt-1">
            تفاصيل سند الاستلام وبنوده وإجراءاته
          </p>
        </div>
        <span className="inline-block bg-muted px-3 py-1 rounded-full text-sm text-foreground">
          {grn.status ?? '—'}
        </span>
      </div>

      {/* GRN details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات سند الاستلام</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">المعرّف: </span>
            <span className="text-foreground font-mono text-xs">{grn.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">الحالة: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-foreground">
              {grn.status ?? '—'}
            </span>
          </div>
          {grn.purchase_order_id && (
            <div>
              <span className="text-muted-foreground">معرّف أمر الشراء: </span>
              <span className="text-foreground font-mono text-xs">
                {grn.purchase_order_id}
              </span>
            </div>
          )}
          {grn.received_by && (
            <div>
              <span className="text-muted-foreground">المستلِم: </span>
              <span className="text-foreground">{grn.received_by}</span>
            </div>
          )}
          {grn.received_date && (
            <div>
              <span className="text-muted-foreground">تاريخ الاستلام: </span>
              <span className="text-foreground">{grn.received_date}</span>
            </div>
          )}
          {grn.notes && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">ملاحظات: </span>
              <span className="text-foreground">{grn.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add item */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">بنود الاستلام</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowItemForm((v) => !v)
              setItemFormError(null)
              setItemSuccess(null)
            }}
          >
            {showItemForm ? 'إلغاء' : 'إضافة بند'}
          </Button>
        </div>

        {itemSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {itemSuccess}
          </div>
        )}

        {showItemForm && (
          <div className="border border-border rounded-md p-4 space-y-3">
            {itemFormError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {itemFormError}
              </div>
            )}
            <form onSubmit={handleItemSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    معرّف المادة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="inventory_item_id"
                    value={itemForm.inventory_item_id}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="معرّف المادة"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    الكمية المستلمة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity_received"
                    min="0.01"
                    step="any"
                    value={itemForm.quantity_received || ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">الوحدة</label>
                  <input
                    type="text"
                    name="unit"
                    value={itemForm.unit ?? ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">ملاحظات</label>
                  <input
                    type="text"
                    name="notes"
                    value={itemForm.notes ?? ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="اختياري"
                  />
                </div>
              </div>
              <Button type="submit" disabled={itemSubmitting}>
                {itemSubmitting ? 'جارٍ الإضافة...' : 'إضافة البند'}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {actionSuccess}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={actionLoading === 'confirm'}
            onClick={() => handleAction('confirm', confirmGRN, 'تم تأكيد سند الاستلام')}
          >
            {actionLoading === 'confirm' ? 'جارٍ التأكيد...' : 'تأكيد الاستلام'}
          </Button>
          <Button
            variant="outline"
            disabled={actionLoading === 'cancel'}
            onClick={() => handleAction('cancel', cancelGRN, 'تم إلغاء سند الاستلام')}
          >
            {actionLoading === 'cancel' ? 'جارٍ الإلغاء...' : 'إلغاء'}
          </Button>
        </div>
      </div>
    </div>
  )
}
