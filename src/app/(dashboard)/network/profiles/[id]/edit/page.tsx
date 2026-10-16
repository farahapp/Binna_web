'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getNetworkProfile,
  updateNetworkProfile,
  extractNetworkMessage,
  type NetworkProfile,
  type UpdateNetworkProfilePayload,
} from '@/lib/api/network'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function EditNetworkProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [profile, setProfile] = useState<NetworkProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<UpdateNetworkProfilePayload>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getNetworkProfile(id)
      .then((p) => {
        setProfile(p)
        setForm({
          company_name: p.company_name,
          region: p.region ?? '',
          contact_email: p.contact_email ?? '',
          contact_phone: p.contact_phone ?? '',
          website: p.website ?? '',
          description: p.description ?? '',
        })
      })
      .catch((err: unknown) =>
        setLoadError(extractNetworkMessage(err, 'فشل تحميل الملف الشخصي'))
      )
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!form.company_name?.trim()) {
      setSubmitError('اسم الشركة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await updateNetworkProfile(id, {
        company_name: form.company_name?.trim(),
        region: form.region?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        website: form.website?.trim() || null,
        description: form.description?.trim() || null,
      })
      router.push(`/network/profiles/${id}`)
    } catch (err: unknown) {
      setSubmitError(extractNetworkMessage(err, 'فشل تحديث الملف الشخصي'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingPage />
  if (loadError) return <ErrorDisplay message={loadError} />
  if (!profile) return <ErrorDisplay message="الملف الشخصي غير موجود" />

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">تعديل الملف الشخصي</h1>
        <p className="text-muted-foreground text-sm mt-1">{profile.company_name}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
        {submitError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {submitError}
          </div>
        )}

        {/* Company Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            اسم الشركة <span className="text-destructive">*</span>
          </label>
          <Input
            name="company_name"
            value={form.company_name ?? ''}
            onChange={handleChange}
            placeholder="اسم الشركة أو المنظمة"
            required
          />
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
            {submitting ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
          <Link
            href={`/network/profiles/${id}`}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
