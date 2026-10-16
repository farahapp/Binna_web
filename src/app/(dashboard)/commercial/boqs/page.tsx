'use client'

import { useState } from 'react'
import {
  createBOQ,
  type CreateBOQPayload,
  type BOQ,
  extractMessage,
} from '@/lib/api/commercial'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateBOQPayload = {
  title: '',
  type: 'tender_boq',
  tender_id: '',
}

const BOQ_TYPE_LABELS: Record<BOQ['type'], string> = {
  tender_boq: 'جدول كميات مناقصة',
  contract_boq: 'جدول كميات عقد',
  variation_boq: 'جدول كميات تعديل',
}

export default function BOQsPage() {
  const [form, setForm] = useState<CreateBOQPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
      setFormError('عنوان جدول الكميات مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const boq = await createBOQ({
        title: form.title.trim(),
        type: form.type,
        tender_id: form.tender_id?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء جدول الكميات بنجاح')
      setCreatedId(boq.id)
      setForm(INITIAL_FORM)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء جدول الكميات'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">جداول الكميات (BOQ)</h1>
        <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة جداول الكميات</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
          <p>{successMsg}</p>
          {createdId && (
            <p>
              <a
                href={`/commercial/boqs/${createdId}`}
                className="text-primary underline"
              >
                عرض تفاصيل جدول الكميات #{createdId}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Create form */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">إنشاء جدول كميات جديد</h2>
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
                placeholder="عنوان جدول الكميات"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="type">
                النوع <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleFormChange}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {(Object.keys(BOQ_TYPE_LABELS) as BOQ['type'][]).map((t) => (
                  <option key={t} value={t}>
                    {BOQ_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
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
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(INITIAL_FORM)
                setFormError(null)
                setSuccessMsg(null)
                setCreatedId(null)
              }}
              disabled={submitting}
            >
              إعادة تعيين
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'جارٍ الإنشاء...' : 'إنشاء جدول الكميات'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
