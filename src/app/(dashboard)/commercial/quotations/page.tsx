'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listQuotations,
  createQuotation,
  type Quotation,
  type CreateQuotationPayload,
  extractMessage,
} from '@/lib/api/commercial'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateQuotationPayload = {
  quotation_number: '',
  client_id: '',
  tender_id: '',
  boq_id: '',
  total_value: undefined,
  title: '',
  quotation_date: '',
  validity_date: '',
}

export default function QuotationsPage() {
  // List state
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const fetchQuotations = useCallback(() => {
    setLoading(true)
    setListError(null)
    listQuotations(page)
      .then((res) => {
        setQuotations(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) => setListError(extractMessage(err, 'فشل تحميل قائمة عروض الأسعار')))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchQuotations()
  }, [fetchQuotations])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateQuotationPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'total_value' ? (value ? parseFloat(value) : undefined) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)
    setCreatedId(null)

    if (!form.quotation_number.trim()) {
      setFormError('رقم عرض السعر مطلوب')
      return
    }
    if (!form.client_id.trim()) {
      setFormError('معرّف العميل مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const quotation = await createQuotation({
        quotation_number: form.quotation_number.trim(),
        client_id: form.client_id.trim(),
        tender_id: form.tender_id?.trim() || undefined,
        boq_id: form.boq_id?.trim() || undefined,
        total_value: form.total_value,
        title: form.title?.trim() || undefined,
        quotation_date: form.quotation_date?.trim() || undefined,
        validity_date: form.validity_date?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء عرض السعر بنجاح')
      setCreatedId(quotation.id)
      setForm(INITIAL_FORM)
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء عرض السعر'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">عروض الأسعار</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة عروض الأسعار</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة عرض سعر'}
        </Button>
      </div>

      {/* Quotations list */}
      {loading && <LoadingSpinner />}
      {listError && <ErrorDisplay message={listError} />}
      {!loading && !listError && quotations.length === 0 && (
        <EmptyState message="لا توجد عروض أسعار بعد. أضف عرض سعر جديداً للبدء." />
      )}
      {!loading && quotations.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">رقم عرض السعر</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">العنوان</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">القيمة الإجمالية</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{q.quotation_number}</td>
                  <td className="px-4 py-3 text-foreground">{q.title ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground">
                    {q.total_value != null ? Number(q.total_value).toLocaleString('ar-SA') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      {q.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/commercial/quotations/${q.id}`}
                      className="text-primary text-xs hover:underline"
                    >
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {lastPage}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
              >
                التالي
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
          <p>{successMsg}</p>
          {createdId && (
            <p>
              <a
                href={`/commercial/quotations/${createdId}`}
                className="text-primary underline"
              >
                عرض تفاصيل عرض السعر #{createdId}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة عرض سعر جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quotation Number */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="quotation_number">
                  رقم عرض السعر <span className="text-destructive">*</span>
                </label>
                <input
                  id="quotation_number"
                  name="quotation_number"
                  type="text"
                  value={form.quotation_number}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="QUO-2024-001"
                  required
                />
              </div>

              {/* Client ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="client_id">
                  معرّف العميل <span className="text-destructive">*</span>
                </label>
                <input
                  id="client_id"
                  name="client_id"
                  type="text"
                  value={form.client_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="معرّف العميل"
                  required
                />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="title">
                  العنوان
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="عنوان عرض السعر (اختياري)"
                />
              </div>

              {/* Total Value */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="total_value">
                  القيمة الإجمالية
                </label>
                <input
                  id="total_value"
                  name="total_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_value ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                />
              </div>

              {/* Tender ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="tender_id">
                  معرّف المناقصة
                </label>
                <input
                  id="tender_id"
                  name="tender_id"
                  type="text"
                  value={form.tender_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="معرّف المناقصة (اختياري)"
                />
              </div>

              {/* BOQ ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="boq_id">
                  معرّف جدول الكميات
                </label>
                <input
                  id="boq_id"
                  name="boq_id"
                  type="text"
                  value={form.boq_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="معرّف BOQ (اختياري)"
                />
              </div>

              {/* Quotation Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="quotation_date">
                  تاريخ عرض السعر
                </label>
                <input
                  id="quotation_date"
                  name="quotation_date"
                  type="date"
                  value={form.quotation_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Validity Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="validity_date">
                  تاريخ انتهاء الصلاحية
                </label>
                <input
                  id="validity_date"
                  name="validity_date"
                  type="date"
                  value={form.validity_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                {submitting ? 'جارٍ الحفظ...' : 'حفظ عرض السعر'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
