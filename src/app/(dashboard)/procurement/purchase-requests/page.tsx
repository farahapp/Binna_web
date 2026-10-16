'use client'

import { useState } from 'react'
import {
  createPurchaseRequest,
  type CreatePurchaseRequestPayload,
  extractMessage,
} from '@/lib/api/procurement'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreatePurchaseRequestPayload = {
  title: '',
  description: '',
  project_id: '',
  required_date: '',
}

export default function PurchaseRequestsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreatePurchaseRequestPayload>(INITIAL_FORM)
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
      setFormError('عنوان طلب الشراء مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const created = await createPurchaseRequest({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        project_id: form.project_id?.trim() || undefined,
        required_date: form.required_date?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء طلب الشراء بنجاح')
      setCreatedId(created.id)
      setForm(INITIAL_FORM)
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء طلب الشراء'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">طلبات الشراء</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة طلبات الشراء</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
            setCreatedId(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة طلب شراء'}
        </Button>
      </div>

      {/* OPEN ITEM notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 space-y-1">
        <p className="font-semibold">⚠️ ملاحظة تقنية (OPEN ITEM)</p>
        <p>
          قائمة طلبات الشراء غير متاحة — لا يوجد{' '}
          <code className="bg-amber-100 px-1 rounded">GET /api/v1/procurement/purchase-requests</code>{' '}
          (list endpoint) في Backend حتى الآن.
        </p>
        <p>يمكنك إنشاء طلب شراء جديد والانتقال إلى صفحة تفاصيله مباشرةً.</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
          <p>{successMsg}</p>
          {createdId && (
            <a
              href={`/procurement/purchase-requests/${createdId}`}
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
          <h2 className="text-base font-semibold text-foreground">إضافة طلب شراء جديد</h2>
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
                  placeholder="عنوان طلب الشراء"
                  required
                />
              </div>

              {/* Project ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="project_id">
                  معرّف المشروع
                </label>
                <input
                  id="project_id"
                  name="project_id"
                  type="text"
                  value={form.project_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID المشروع (اختياري)"
                />
              </div>

              {/* Required Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="required_date">
                  تاريخ الحاجة
                </label>
                <input
                  id="required_date"
                  name="required_date"
                  type="date"
                  value={form.required_date}
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
                  placeholder="وصف طلب الشراء (اختياري)"
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
