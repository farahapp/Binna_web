'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAccount, extractApiError } from '@/lib/api/accounting'
import type { CreateAccountPayload, AccountType } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

const accountTypeOptions: { value: AccountType; label: string }[] = [
  { value: 'ASSET', label: 'أصول' },
  { value: 'LIABILITY', label: 'التزامات' },
  { value: 'EQUITY', label: 'حقوق ملكية' },
  { value: 'REVENUE', label: 'إيرادات' },
  { value: 'EXPENSE', label: 'مصروفات' },
]

export default function NewAccountPage() {
  const router = useRouter()

  const [form, setForm] = useState<Omit<CreateAccountPayload, 'tenant_slug'>>({
    account_code: '',
    name: '',
    account_type: 'ASSET',
    parent_id: '',
    is_control_account: false,
    description: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.account_code.trim()) {
      setError('رمز الحساب مطلوب')
      return
    }
    if (!form.name.trim()) {
      setError('اسم الحساب مطلوب')
      return
    }
    if (!form.account_type) {
      setError('نوع الحساب مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateAccountPayload = {
        tenant_slug: TENANT_SLUG,
        account_code: form.account_code.trim(),
        name: form.name.trim(),
        account_type: form.account_type,
        parent_id: form.parent_id?.trim() || null,
        is_control_account: form.is_control_account ?? false,
        description: form.description?.trim() || null,
      }

      await createAccount(payload)
      router.push('/accounting/accounts')
    } catch (err) {
      setError(extractApiError(err, 'حدث خطأ أثناء إنشاء الحساب'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">حساب جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">إضافة حساب جديد إلى دليل الحسابات</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">بيانات الحساب</h2>

          {/* Account Code */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              رمز الحساب <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="account_code"
              value={form.account_code}
              onChange={handleChange}
              placeholder="مثال: 1001"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              اسم الحساب <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="مثال: النقدية والبنوك"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              نوع الحساب <span className="text-destructive">*</span>
            </label>
            <select
              name="account_type"
              value={form.account_type}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {accountTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Parent ID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              معرّف الحساب الأب (اختياري)
            </label>
            <input
              type="text"
              name="parent_id"
              value={form.parent_id ?? ''}
              onChange={handleChange}
              placeholder="UUID الحساب الأب"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              الوصف (اختياري)
            </label>
            <textarea
              name="description"
              value={form.description ?? ''}
              onChange={handleChange}
              rows={3}
              placeholder="وصف الحساب ووظيفته"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Is Control Account */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_control_account"
              name="is_control_account"
              checked={form.is_control_account ?? false}
              onChange={handleChange}
              className="rounded border-input"
            />
            <label htmlFor="is_control_account" className="text-sm text-foreground">
              حساب مراقبة (Control Account)
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/accounting/accounts')}
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'جارٍ الحفظ...' : 'حفظ الحساب'}
          </button>
        </div>
      </form>
    </div>
  )
}
