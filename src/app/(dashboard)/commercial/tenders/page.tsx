'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getTenders,
  createTender,
  awardTender,
  type Tender,
  type CreateTenderPayload,
  extractMessage,
} from '@/lib/api/commercial'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateTenderPayload = {
  title: '',
  client_id: '',
  description: '',
  due_date: '',
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateTenderPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Award state
  const [awardingId, setAwardingId] = useState<number | null>(null)
  const [awardError, setAwardError] = useState<string | null>(null)

  const fetchTenders = useCallback(() => {
    setLoading(true)
    setError(null)
    getTenders(page)
      .then((res) => {
        setTenders(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل قائمة المناقصات')))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchTenders()
  }, [fetchTenders])

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

    if (!form.title.trim()) {
      setFormError('عنوان المناقصة مطلوب')
      return
    }
    if (!form.client_id.trim()) {
      setFormError('معرّف العميل مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await createTender({
        title: form.title.trim(),
        client_id: form.client_id.trim(),
        description: form.description?.trim() || undefined,
        due_date: form.due_date?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء المناقصة بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchTenders()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء المناقصة'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAward(id: number) {
    setAwardingId(id)
    setAwardError(null)
    try {
      await awardTender(id)
      setSuccessMsg('تمت ترسية المناقصة بنجاح')
      fetchTenders()
    } catch (err: unknown) {
      setAwardError(extractMessage(err, 'فشل ترسية المناقصة'))
    } finally {
      setAwardingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المناقصات</h1>
          <p className="text-muted-foreground text-sm mt-1">قائمة جميع المناقصات</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة مناقصة'}
        </Button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Award error */}
      {awardError && <ErrorDisplay message={awardError} />}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة مناقصة جديدة</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="title">
                  العنوان <span className="text-destructive">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="عنوان المناقصة"
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

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="due_date">
                  تاريخ الاستحقاق
                </label>
                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="description">
                  الوصف
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="وصف المناقصة (اختياري)"
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
                {submitting ? 'جارٍ الحفظ...' : 'حفظ المناقصة'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل المناقصات..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchTenders} />
      ) : tenders.length === 0 ? (
        <EmptyState message="لا توجد مناقصات مسجلة بعد" />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">العنوان</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">معرّف العميل</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">تاريخ الاستحقاق</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenders.map((tender) => (
                  <tr key={tender.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{tender.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tender.client_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs">
                        {tender.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tender.due_date ?? '—'}</td>
                    <td className="px-4 py-3 text-left">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAward(tender.id)}
                        disabled={awardingId === tender.id}
                      >
                        {awardingId === tender.id ? 'جارٍ الترسية...' : 'ترسية'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {tenders.map((tender) => (
              <div key={tender.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{tender.title}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                    {tender.status ?? '—'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">العميل: {tender.client_id}</p>
                {tender.due_date && (
                  <p className="text-sm text-muted-foreground">الاستحقاق: {tender.due_date}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAward(tender.id)}
                  disabled={awardingId === tender.id}
                >
                  {awardingId === tender.id ? 'جارٍ الترسية...' : 'ترسية'}
                </Button>
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
