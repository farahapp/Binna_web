'use client'

import { useState } from 'react'
import {
  createRFQ,
  type CreateRFQPayload,
  extractMessage,
} from '@/lib/api/procurement'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateRFQPayload = {
  title: '',
  purchase_request_id: '',
  description: '',
  deadline: '',
}

export default function RFQsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateRFQPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

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

    if (!form.title.trim()) {
      setFormError('عنوان طلب عرض السعر مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const created = await createRFQ({
        title: form.title.trim(),
        purchase_request_id: form.purchase_request_id?.trim() || undefined,
        description: form.description?.trim() || undefined,
        deadline: form.deadline?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء طلب عرض السعر بنجاح')
      setCreatedId(created.id)
      setForm(INITIAL_FORM)
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء طلب عرض السعر'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">طلبات عروض الأسعار (RFQs)</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة طلبات عروض الأسعار للموردين</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
            setCreatedId(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة طلب عرض سعر'}
        </Button>
      </div>

      {/* OPEN ITEM notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 space-y-1">
        <p className="font-semibold">⚠️ ملاحظة تقنية (OPEN ITEM)</p>
        <p>
          قائمة طلبات عروض الأسعار غير متاحة — لا يوجد{' '}
          <code className="bg-amber-100 px-1 rounded">GET /api/v1/procurement/rfqs</code>{' '}
          (list endpoint) في Backend حتى الآن.
        </p>
        <p>يمكنك إنشاء طلب عرض سعر جديد والانتقال إلى صفحة تفاصيله مباشرةً.</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
          <p>{successMsg}</p>
          {createdId && (
            <a
              href={`/procurement/rfqs/${createdId}`}
              className="text-primary underline font-medium"
            >
              عرض تفاصيل الطلب ←
            </a>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة طلب عرض سعر جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1 sm:col-span-2">
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
                  placeholder="عنوان طلب عرض السعر"
                  required
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

              {/* Deadline */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="deadline">
                  الموعد النهائي
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  value={form.deadline}
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
                  placeholder="وصف طلب عرض السعر (اختياري)"
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
                {submitting ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
