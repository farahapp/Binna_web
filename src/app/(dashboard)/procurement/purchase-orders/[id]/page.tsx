'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getPurchaseOrder,
  addPOItem,
  submitPurchaseOrder,
  approvePurchaseOrder,
  issuePurchaseOrder,
  cancelPurchaseOrder,
  type PurchaseOrder,
  type CreatePOItemPayload,
  extractMessage,
} from '@/lib/api/procurement'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_ITEM_FORM: CreatePOItemPayload = {
  description: '',
  quantity: undefined,
  unit: '',
  unit_price: undefined,
  total_price: undefined,
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Add item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState<CreatePOItemPayload>(INITIAL_ITEM_FORM)
  const [itemFormError, setItemFormError] = useState<string | null>(null)
  const [itemSubmitting, setItemSubmitting] = useState(false)
  const [itemSuccess, setItemSuccess] = useState<string | null>(null)

  const fetchPO = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getPurchaseOrder(id)
      .then((data) => setPo(data))
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات أمر الشراء')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchPO()
  }, [fetchPO])

  async function handleAction(
    action: 'submit' | 'approve' | 'issue' | 'cancel',
    fn: (id: string) => Promise<PurchaseOrder>,
    successText: string
  ) {
    setActionLoading(action)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await fn(id)
      setPo(updated)
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
    const numericFields = ['quantity', 'unit_price', 'total_price']
    setItemForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? (value ? parseFloat(value) : undefined) : value,
    }))
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    setItemFormError(null)
    setItemSuccess(null)

    if (!itemForm.description.trim()) {
      setItemFormError('وصف البند مطلوب')
      return
    }

    setItemSubmitting(true)
    try {
      await addPOItem(id, {
        description: itemForm.description.trim(),
        quantity: itemForm.quantity,
        unit: itemForm.unit?.trim() || undefined,
        unit_price: itemForm.unit_price,
        total_price: itemForm.total_price,
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

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات أمر الشراء..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchPO} />
  if (!po) return <ErrorDisplay message="أمر الشراء غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/procurement/purchase-orders" className="hover:text-primary">
              أوامر الشراء
            </Link>
            <span>/</span>
            <span>{po.po_number ?? po.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {po.po_number ? `أمر الشراء: ${po.po_number}` : `أمر الشراء #${po.id.slice(0, 8)}`}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تفاصيل أمر الشراء وبنوده</p>
        </div>
        <span className="inline-block bg-muted px-3 py-1 rounded-full text-sm text-foreground">
          {po.status ?? '—'}
        </span>
      </div>

      {/* Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات أمر الشراء</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">المعرّف: </span>
            <span className="text-foreground font-mono text-xs">{po.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">الحالة: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-foreground">
              {po.status ?? '—'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">المورد: </span>
            <span className="text-foreground font-mono text-xs">{po.supplier_id}</span>
          </div>
          {po.purchase_request_id && (
            <div>
              <span className="text-muted-foreground">طلب الشراء: </span>
              <Link
                href={`/procurement/purchase-requests/${po.purchase_request_id}`}
                className="text-primary hover:underline font-mono text-xs"
              >
                {po.purchase_request_id.slice(0, 8)}…
              </Link>
            </div>
          )}
          {po.total_amount != null && (
            <div>
              <span className="text-muted-foreground">المبلغ الإجمالي: </span>
              <span className="text-foreground font-medium">
                {po.total_amount.toLocaleString('ar-SA')} {po.currency ?? ''}
              </span>
            </div>
          )}
          {po.issued_date && (
            <div>
              <span className="text-muted-foreground">تاريخ الإصدار: </span>
              <span className="text-foreground">{po.issued_date}</span>
            </div>
          )}
          {po.expected_delivery_date && (
            <div>
              <span className="text-muted-foreground">تاريخ التسليم المتوقع: </span>
              <span className="text-foreground">{po.expected_delivery_date}</span>
            </div>
          )}
          {po.notes && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">ملاحظات: </span>
              <span className="text-foreground">{po.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>

        {actionError && <ErrorDisplay message={actionError} />}
        {actionSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {actionSuccess}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Submit */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('submit', submitPurchaseOrder, 'تم إرسال أمر الشراء للموافقة بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'submit' ? 'جارٍ الإرسال...' : '📤 إرسال للموافقة'}
          </Button>

          {/* Approve */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('approve', approvePurchaseOrder, 'تمت الموافقة على أمر الشراء بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'approve' ? 'جارٍ الموافقة...' : '✅ موافقة'}
          </Button>

          {/* Issue */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('issue', issuePurchaseOrder, 'تم إصدار أمر الشراء بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'issue' ? 'جارٍ الإصدار...' : '📋 إصدار'}
          </Button>

          {/* Cancel */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('cancel', cancelPurchaseOrder, 'تم إلغاء أمر الشراء')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'cancel' ? 'جارٍ الإلغاء...' : '🚫 إلغاء'}
          </Button>
        </div>
      </div>

      {/* Add Item */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">بنود أمر الشراء</h2>
          <Button
            size="sm"
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
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">إضافة بند جديد</h3>
            {itemFormError && <ErrorDisplay message={itemFormError} />}
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Description */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="item_description">
                    الوصف <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="item_description"
                    name="description"
                    type="text"
                    value={itemForm.description}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="وصف البند"
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="quantity">
                    الكمية
                  </label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.001"
                    value={itemForm.quantity ?? ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="unit">
                    الوحدة
                  </label>
                  <input
                    id="unit"
                    name="unit"
                    type="text"
                    value={itemForm.unit}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="قطعة / متر / كجم"
                  />
                </div>

                {/* Unit Price */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="unit_price">
                    سعر الوحدة
                  </label>
                  <input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    value={itemForm.unit_price ?? ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                  />
                </div>

                {/* Total Price */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="total_price">
                    السعر الإجمالي
                  </label>
                  <input
                    id="total_price"
                    name="total_price"
                    type="number"
                    step="0.01"
                    value={itemForm.total_price ?? ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowItemForm(false)
                    setItemFormError(null)
                  }}
                  disabled={itemSubmitting}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={itemSubmitting}>
                  {itemSubmitting ? 'جارٍ الحفظ...' : 'إضافة البند'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
