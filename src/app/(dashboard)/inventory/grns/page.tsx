'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  listGRNs,
  createGRN,
  type CreateGRNPayload,
  type GoodsReceiptNote,
  type PaginatedResponse,
  extractMessage,
} from '@/lib/api/inventory'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateGRNPayload = {
  purchase_order_id: '',
  received_by: '',
  received_date: '',
  notes: '',
}

export default function GRNsPage() {
  // List state
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<GoodsReceiptNote>['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateGRNPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const fetchGRNs = useCallback(async (p: number) => {
    setLoading(true)
    setListError(null)
    try {
      const result = await listGRNs(p)
      setGrns(result.data)
      setMeta(result.meta)
    } catch (err: unknown) {
      setListError(extractMessage(err, 'فشل تحميل سندات الاستلام'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGRNs(page)
  }, [page, fetchGRNs])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)
    setCreatedId(null)

    setSubmitting(true)
    try {
      const created = await createGRN({
        purchase_order_id: form.purchase_order_id?.trim() || undefined,
        received_by: form.received_by?.trim() || undefined,
        received_date: form.received_date?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء سند الاستلام بنجاح')
      setCreatedId(created.id)
      setForm(INITIAL_FORM)
      setShowForm(false)
      // Refresh list
      fetchGRNs(1)
      setPage(1)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء سند الاستلام'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">سندات الاستلام (GRN)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إنشاء وإدارة سندات استلام البضائع
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
            setCreatedId(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة سند استلام'}
        </Button>
      </div>

      {/* GRNs List */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</div>
      ) : listError ? (
        <ErrorDisplay message={listError} />
      ) : grns.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">لا توجد سندات استلام بعد.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">رقم السند</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">تاريخ الاستلام</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">المستودع</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grns.map((grn) => (
                <tr key={grn.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {(grn as { grn_number?: string }).grn_number ?? grn.id.slice(0, 8) + '…'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      grn.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      grn.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {grn.status === 'confirmed' ? 'مؤكد' : grn.status === 'cancelled' ? 'ملغى' : 'مسودة'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {grn.received_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(grn as { warehouse_code?: string }).warehouse_code ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/inventory/grns/${grn.id}`}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      عرض ←
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md border border-border text-foreground disabled:opacity-40 hover:bg-muted/50 transition-colors"
          >
            السابق
          </button>
          <span className="text-muted-foreground">
            صفحة {meta.current_page} من {meta.last_page} ({meta.total} سند)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="px-3 py-1.5 rounded-md border border-border text-foreground disabled:opacity-40 hover:bg-muted/50 transition-colors"
          >
            التالي
          </button>
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
          <p>{successMsg}</p>
          {createdId && (
            <a
              href={`/inventory/grns/${createdId}`}
              className="text-primary underline font-medium"
            >
              عرض تفاصيل سند الاستلام ←
            </a>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة سند استلام جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  معرّف أمر الشراء
                </label>
                <input
                  type="text"
                  name="purchase_order_id"
                  value={form.purchase_order_id ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  المستلِم
                </label>
                <input
                  type="text"
                  name="received_by"
                  value={form.received_by ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  تاريخ الاستلام
                </label>
                <input
                  type="date"
                  name="received_date"
                  value={form.received_date ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">ملاحظات</label>
                <input
                  type="text"
                  name="notes"
                  value={form.notes ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الإنشاء...' : 'إنشاء سند الاستلام'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
