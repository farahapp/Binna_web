'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPeriod, extractApiError } from '@/lib/api/accounting'
import type { CreatePeriodPayload } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

export default function NewPeriodPage() {
  const router = useRouter()

  const [form, setForm] = useState<Omit<CreatePeriodPayload, 'tenant_slug'>>({
    period_name: '',
    start_date: '',
    end_date: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.period_name.trim()) {
      setError('اسم الفترة مطلوب')
      return
    }
    if (!form.start_date) {
      setError('تاريخ البداية مطلوب')
      return
    }
    if (!form.end_date) {
      setError('تاريخ النهاية مطلوب')
      return
    }
    if (form.end_date < form.start_date) {
      setError('تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreatePeriodPayload = {
        tenant_slug: TENANT_SLUG,
        period_name: form.period_name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
      }

      await createPeriod(payload)
      router.push('/accounting/periods')
    } catch (err) {
      setError(extractApiError(err, 'حدث خطأ أثناء إنشاء الفترة'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">فترة محاسبية جديدة</h1>
        <p className="text-muted-foreground text-sm mt-1">تحديد فترة محاسبية جديدة للمنشأة</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">بيانات الفترة</h2>

          {/* Period Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              اسم الفترة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="period_name"
              value={form.period_name}
              onChange={handleChange}
              placeholder="مثال: 2024-Q1 أو يناير 2024"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground mt-1">الحد الأقصى 20 حرفاً</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                تاريخ البداية <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                تاريخ النهاية <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                min={form.start_date}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/accounting/periods')}
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'جارٍ الحفظ...' : 'إنشاء الفترة'}
          </button>
        </div>
      </form>
    </div>
  )
}
