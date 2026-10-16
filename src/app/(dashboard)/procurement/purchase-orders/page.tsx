'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listPurchaseOrders,
  createPurchaseOrder,
  type PurchaseOrder,
  type CreatePurchaseOrderPayload,
  extractMessage,
} from '@/lib/api/procurement'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreatePurchaseOrderPayload = {
  supplier_id: '',
  purchase_request_id: '',
  po_number: '',
  total_amount: undefined,
  currency: '',
  issued_date: '',
  expected_delivery_date: '',
  notes: '',
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreatePurchaseOrderPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchOrders = useCallback(() => {
    setLoading(true)
    setError(null)
    listPurchaseOrders(page)
      .then((res) => {
        setOrders(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل قائمة أوامر الشراء')))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'total_amount' ? (value ? parseFloat(value) : undefined) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.supplier_id.trim()) {
      setFormError('معرّف المورد مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await createPurchaseOrder({
        supplier_id: form.supplier_id.trim(),
        purchase_request_id: form.purchase_request_id?.trim() || undefined,
        po_number: form.po_number?.trim() || undefined,
        total_amount: form.total_amount,
        currency: form.currency?.trim() || undefined,
        issued_date: form.issued_date?.trim() || undefined,
        expected_delivery_date: form.expected_delivery_date?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء أمر الشراء بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchOrders()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء أمر الشراء'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">أوامر الشراء</h1>
          <p className="text-muted-foreground text-sm mt-1">قائمة جميع أوامر الشراء وإدارتها</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة أمر شراء'}
        </Button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة أمر شراء جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="supplier_id">
                  معرّف المورد <span className="text-destructive">*</span>
                </label>
                <input
                  id="supplier_id"
                  name="supplier_id"
                  type="text"
                  value={form.supplier_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID المورد"
                  required
                />
              </div>

              {/* PO Number */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="po_number">
                  رقم أمر الشراء
                </label>
                <input
                  id="po_number"
                  name="po_number"
                  type="text"
                  value={form.po_number}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="PO-001"
                />
              </div>

              {/* Purchase Request ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="purchase_request_id">
                  معرّف طلب الشراء
                </label>
                <input
                  id="purchase_request_id"
                  name="purchase_request_id"
                  type="text"
                  value={form.purchase_request_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID طلب الشراء (اختياري)"
                />
              </div>

              {/* Total Amount */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="total_amount">
                  المبلغ الإجمالي
                </label>
                <input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  value={form.total_amount ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                />
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="currency">
                  العملة
                </label>
                <input
                  id="currency"
                  name="currency"
                  type="text"
                  value={form.currency}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="SAR"
                />
              </div>

              {/* Issued Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="issued_date">
                  تاريخ الإصدار
                </label>
                <input
                  id="issued_date"
                  name="issued_date"
                  type="date"
                  value={form.issued_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Expected Delivery Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="expected_delivery_date">
                  تاريخ التسليم المتوقع
                </label>
                <input
                  id="expected_delivery_date"
                  name="expected_delivery_date"
                  type="date"
                  value={form.expected_delivery_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="notes">
                  ملاحظات
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الحفظ...' : 'حفظ أمر الشراء'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل أوامر الشراء..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <EmptyState message="لا توجد أوامر شراء مسجلة بعد" />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">رقم الأمر</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">المورد</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">المبلغ</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">تاريخ الإصدار</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {order.po_number ?? `#${order.id.slice(0, 8)}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {order.supplier_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.total_amount != null
                        ? `${order.total_amount.toLocaleString('ar-SA')} ${order.currency ?? ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                        {order.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{order.issued_date ?? '—'}</td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/procurement/purchase-orders/${order.id}`}
                        className="text-sm text-primary hover:underline"
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
          <div className="md:hidden divide-y divide-border">
            {orders.map((order) => (
              <div key={order.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {order.po_number ?? `#${order.id.slice(0, 8)}`}
                  </p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                    {order.status ?? '—'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  المورد: <span className="font-mono">{order.supplier_id.slice(0, 8)}…</span>
                </p>
                {order.total_amount != null && (
                  <p className="text-sm text-muted-foreground">
                    المبلغ: {order.total_amount.toLocaleString('ar-SA')} {order.currency ?? ''}
                  </p>
                )}
                {order.issued_date && (
                  <p className="text-sm text-muted-foreground">الإصدار: {order.issued_date}</p>
                )}
                <Link
                  href={`/procurement/purchase-orders/${order.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  عرض التفاصيل ←
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage || loading}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
