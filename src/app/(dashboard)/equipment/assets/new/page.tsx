'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAsset, extractMessage } from '@/lib/api/equipment'

interface FormState {
  asset_code: string
  name: string
  description: string
  category: string
  asset_type: string
  acquisition_date: string
  acquisition_cost: string
  currency: string
  depreciation_rate: string
  notes: string
}

const initial: FormState = {
  asset_code: '',
  name: '',
  description: '',
  category: '',
  asset_type: 'owned',
  acquisition_date: '',
  acquisition_cost: '',
  currency: 'SAR',
  depreciation_rate: '',
  notes: '',
}

export default function NewAssetPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const asset = await registerAsset({
        asset_code: form.asset_code,
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
        asset_type: form.asset_type,
        acquisition_date: form.acquisition_date || undefined,
        acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : undefined,
        currency: form.currency || 'SAR',
        depreciation_rate: form.depreciation_rate ? parseFloat(form.depreciation_rate) : undefined,
        notes: form.notes || undefined,
      })
      setSuccess(true)
      setTimeout(() => router.push(`/equipment/assets/${asset.id}`), 800)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">تسجيل أصل جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">أدخل بيانات الأصل أو المعدة الجديدة</p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
          ✅ تم تسجيل الأصل بنجاح. جارٍ التوجيه…
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset Code + Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="asset_code">
              كود الأصل <span className="text-red-500">*</span>
            </label>
            <input
              id="asset_code" name="asset_code" required
              value={form.asset_code} onChange={handleChange}
              placeholder="مثال: EQ-001"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="name">
              اسم الأصل <span className="text-red-500">*</span>
            </label>
            <input
              id="name" name="name" required
              value={form.name} onChange={handleChange}
              placeholder="مثال: حفارة هيدروليكية"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Category + Asset Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="category">
              الفئة
            </label>
            <input
              id="category" name="category"
              value={form.category} onChange={handleChange}
              placeholder="مثال: معدات ثقيلة"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="asset_type">
              نوع الأصل
            </label>
            <select
              id="asset_type" name="asset_type"
              value={form.asset_type} onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="owned">مملوك</option>
              <option value="leased">مستأجر</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="description">
            الوصف
          </label>
          <textarea
            id="description" name="description" rows={2}
            value={form.description} onChange={handleChange}
            placeholder="وصف الأصل أو المعدة"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Acquisition Date + Cost + Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="acquisition_date">
              تاريخ الاقتناء
            </label>
            <input
              id="acquisition_date" name="acquisition_date" type="date"
              value={form.acquisition_date} onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="acquisition_cost">
              تكلفة الاقتناء
            </label>
            <input
              id="acquisition_cost" name="acquisition_cost" type="number" min="0" step="0.01"
              value={form.acquisition_cost} onChange={handleChange}
              placeholder="0.00"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="currency">
              العملة
            </label>
            <select
              id="currency" name="currency"
              value={form.currency} onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="QAR">QAR</option>
            </select>
          </div>
        </div>

        {/* Depreciation Rate */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="depreciation_rate">
            معدل الإهلاك (%)
          </label>
          <input
            id="depreciation_rate" name="depreciation_rate" type="number" min="0" max="100" step="0.01"
            value={form.depreciation_rate} onChange={handleChange}
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="notes">
            ملاحظات
          </label>
          <textarea
            id="notes" name="notes" rows={2}
            value={form.notes} onChange={handleChange}
            placeholder="أي ملاحظات إضافية"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={loading || success}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'جارٍ الحفظ…' : 'حفظ الأصل'}
          </button>
          <button
            type="button" onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground px-5 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
