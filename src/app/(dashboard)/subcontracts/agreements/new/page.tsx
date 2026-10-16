'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSubcontractAgreement, extractMessage } from '@/lib/api/subcontracts'

interface FormState {
  agreement_number: string
  subcontractor_name: string
  title: string
  scope_summary: string
  contract_value: string
  retention_percentage: string
  currency: string
  start_date: string
  end_date: string
  notes: string
}

const initialForm: FormState = {
  agreement_number: '',
  subcontractor_name: '',
  title: '',
  scope_summary: '',
  contract_value: '',
  retention_percentage: '',
  currency: 'SAR',
  start_date: '',
  end_date: '',
  notes: '',
}

export default function NewSubcontractAgreementPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        agreement_number: form.agreement_number,
        subcontractor_name: form.subcontractor_name,
        title: form.title,
        scope_summary: form.scope_summary || undefined,
        contract_value: parseFloat(form.contract_value),
        retention_percentage: form.retention_percentage
          ? parseFloat(form.retention_percentage)
          : undefined,
        currency: form.currency || 'SAR',
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        notes: form.notes || undefined,
      }
      const agreement = await createSubcontractAgreement(payload)
      setSuccess(true)
      setTimeout(() => {
        router.push(`/subcontracts/agreements/${agreement.id}`)
      }, 800)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إنشاء عقد مقاول من الباطن</h1>
        <p className="text-muted-foreground text-sm mt-1">
          أدخل بيانات العقد الجديد — سيُحفظ بحالة مسودة
        </p>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
          ✅ تم إنشاء العقد بنجاح. جارٍ التوجيه…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Agreement Number */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="agreement_number">
            رقم العقد <span className="text-red-500">*</span>
          </label>
          <input
            id="agreement_number"
            name="agreement_number"
            type="text"
            required
            value={form.agreement_number}
            onChange={handleChange}
            placeholder="مثال: SC-2026-001"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Subcontractor Name */}
        <div className="space-y-1">
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="subcontractor_name"
          >
            اسم المقاول من الباطن <span className="text-red-500">*</span>
          </label>
          <input
            id="subcontractor_name"
            name="subcontractor_name"
            type="text"
            required
            value={form.subcontractor_name}
            onChange={handleChange}
            placeholder="اسم الشركة أو المقاول"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="title">
            عنوان العقد <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={form.title}
            onChange={handleChange}
            placeholder="وصف مختصر للعقد"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Scope Summary */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="scope_summary">
            ملخص النطاق
          </label>
          <textarea
            id="scope_summary"
            name="scope_summary"
            rows={3}
            value={form.scope_summary}
            onChange={handleChange}
            placeholder="وصف نطاق العمل المتفق عليه"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Contract Value + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="contract_value">
              قيمة العقد <span className="text-red-500">*</span>
            </label>
            <input
              id="contract_value"
              name="contract_value"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.contract_value}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="currency">
              العملة
            </label>
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="AED">درهم إماراتي (AED)</option>
              <option value="EUR">يورو (EUR)</option>
            </select>
          </div>
        </div>

        {/* Retention Percentage */}
        <div className="space-y-1">
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="retention_percentage"
          >
            نسبة الاستقطاع (%)
          </label>
          <input
            id="retention_percentage"
            name="retention_percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.retention_percentage}
            onChange={handleChange}
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="start_date">
              تاريخ البدء
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="end_date">
              تاريخ الانتهاء
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="notes">
            ملاحظات
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={form.notes}
            onChange={handleChange}
            placeholder="أي ملاحظات إضافية"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || success}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'جارٍ الحفظ…' : 'حفظ العقد'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground px-5 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
