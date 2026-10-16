'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerEmployee, extractMessage } from '@/lib/api/hr'

interface FormState {
  employee_number: string
  first_name: string
  last_name: string
  employment_type: string
  job_title: string
  department: string
  hire_date: string
  daily_rate: string
  hourly_rate: string
  currency: string
}

const initial: FormState = {
  employee_number: '',
  first_name: '',
  last_name: '',
  employment_type: 'full_time',
  job_title: '',
  department: '',
  hire_date: '',
  daily_rate: '',
  hourly_rate: '',
  currency: 'SAR',
}

export default function NewEmployeePage() {
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
      const emp = await registerEmployee({
        employee_number: form.employee_number,
        first_name: form.first_name,
        last_name: form.last_name,
        employment_type: form.employment_type,
        job_title: form.job_title || undefined,
        department: form.department || undefined,
        hire_date: form.hire_date || undefined,
        daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : undefined,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : undefined,
        currency: form.currency || 'SAR',
      })
      setSuccess(true)
      setTimeout(() => router.push(`/hr/employees/${emp.id}`), 800)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">تسجيل موظف جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">أدخل بيانات الموظف الجديد</p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
          ✅ تم تسجيل الموظف بنجاح. جارٍ التوجيه…
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Employee Number */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="employee_number">
            رقم الموظف <span className="text-red-500">*</span>
          </label>
          <input
            id="employee_number"
            name="employee_number"
            required
            value={form.employee_number}
            onChange={handleChange}
            placeholder="مثال: EMP-001"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="first_name">
              الاسم الأول <span className="text-red-500">*</span>
            </label>
            <input
              id="first_name"
              name="first_name"
              required
              value={form.first_name}
              onChange={handleChange}
              placeholder="الاسم الأول"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="last_name">
              اسم العائلة <span className="text-red-500">*</span>
            </label>
            <input
              id="last_name"
              name="last_name"
              required
              value={form.last_name}
              onChange={handleChange}
              placeholder="اسم العائلة"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Employment Type */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="employment_type">
            نوع التوظيف
          </label>
          <select
            id="employment_type"
            name="employment_type"
            value={form.employment_type}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="full_time">دوام كامل</option>
            <option value="part_time">دوام جزئي</option>
            <option value="contractor">متعاقد</option>
            <option value="intern">متدرب</option>
          </select>
        </div>

        {/* Job Title + Department */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="job_title">
              المسمى الوظيفي
            </label>
            <input
              id="job_title"
              name="job_title"
              value={form.job_title}
              onChange={handleChange}
              placeholder="مثال: مهندس مدني"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="department">
              القسم
            </label>
            <input
              id="department"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="مثال: الهندسة"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Hire Date */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground" htmlFor="hire_date">
            تاريخ التعيين
          </label>
          <input
            id="hire_date"
            name="hire_date"
            type="date"
            value={form.hire_date}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Rates */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="daily_rate">
              الأجر اليومي
            </label>
            <input
              id="daily_rate"
              name="daily_rate"
              type="number"
              min="0"
              step="0.01"
              value={form.daily_rate}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="hourly_rate">
              الأجر بالساعة
            </label>
            <input
              id="hourly_rate"
              name="hourly_rate"
              type="number"
              min="0"
              step="0.01"
              value={form.hourly_rate}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || success}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'جارٍ الحفظ…' : 'حفظ الموظف'}
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
