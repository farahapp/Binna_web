'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createNetworkProfile,
  extractNetworkMessage,
  PROFILE_TYPE_LABELS,
  type NetworkProfileType,
  type CreateNetworkProfilePayload,
} from '@/lib/api/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PROFILE_TYPES: NetworkProfileType[] = [
  'owner',
  'engineer',
  'contractor',
  'main_contractor',
  'subcontractor',
  'supplier',
]

const INITIAL_FORM: CreateNetworkProfilePayload = {
  company_name: '',
  profile_type: 'contractor',
  region: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  description: '',
}

export default function NewNetworkProfilePage() {
  const router = useRouter()
  const [form, setForm] = useState<CreateNetworkProfilePayload>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.company_name.trim()) {
      setError('اسم الشركة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const profile = await createNetworkProfile({
        company_name: form.company_name.trim(),
        profile_type: form.profile_type,
        ...(form.region?.trim() ? { region: form.region.trim() } : {}),
        ...(form.contact_email?.trim() ? { contact_email: form.contact_email.trim() } : {}),
        ...(form.contact_phone?.trim() ? { contact_phone: form.contact_phone.trim() } : {}),
        ...(form.website?.trim() ? { website: form.website.trim() } : {}),
        ...(form.description?.trim() ? { description: form.description.trim() } : {}),
      })
      router.push(`/network/profiles/${profile.id}`)
    } catch (err: unknown) {
      setError(extractNetworkMessage(err, 'فشل إنشاء الملف الشخصي'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">ملف شخصي جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">
          أنشئ ملفك الشخصي للانضمام إلى شبكة البناء التجارية
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Company Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            اسم الشركة <span className="text-destructive">*</span>
          </label>
          <Input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            placeholder="اسم الشركة أو المنظمة"
            required
          />
        </div>

        {/* Profile Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            نوع المشارك <span className="text-destructive">*</span>
          </label>
          <select
            name="profile_type"
            value={form.profile_type}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PROFILE_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROFILE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">المنطقة الجغرافية</label>
          <Input
            name="region"
            value={form.region ?? ''}
            onChange={handleChange}
            placeholder="مثال: الرياض، جدة، المنطقة الشرقية"
          />
        </div>

        {/* Contact Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">البريد الإلكتروني للتواصل</label>
          <Input
            name="contact_email"
            type="email"
            value={form.contact_email ?? ''}
            onChange={handleChange}
            placeholder="info@company.com"
          />
        </div>

        {/* Contact Phone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">رقم الهاتف</label>
          <Input
            name="contact_phone"
            value={form.contact_phone ?? ''}
            onChange={handleChange}
            placeholder="+966 5x xxx xxxx"
          />
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">الموقع الإلكتروني</label>
          <Input
            name="website"
            type="url"
            value={form.website ?? ''}
            onChange={handleChange}
            placeholder="https://www.company.com"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">نبذة عن الشركة</label>
          <textarea
            name="description"
            value={form.description ?? ''}
            onChange={handleChange}
            rows={3}
            placeholder="وصف مختصر عن نشاط الشركة وتخصصاتها"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'جارٍ الإنشاء...' : 'إنشاء الملف الشخصي'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/network/profiles')}
            disabled={submitting}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  )
}
