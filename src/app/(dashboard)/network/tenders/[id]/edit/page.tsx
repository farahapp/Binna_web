'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getNetworkTender,
  updateNetworkTender,
  extractNetworkMessage,
  PROFILE_TYPE_LABELS,
  type NetworkTender,
  type NetworkProfileType,
  type TenderVisibility,
  type UpdateNetworkTenderPayload,
} from '@/lib/api/network'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const VISIBILITY_OPTIONS: { value: TenderVisibility; label: string }[] = [
  { value: 'public', label: 'عام' },
  { value: 'private', label: 'خاص' },
  { value: 'invited', label: 'بالدعوة' },
  { value: 'matched', label: 'مطابق' },
]

const PARTICIPANT_TYPE_OPTIONS: NetworkProfileType[] = [
  'owner', 'engineer', 'contractor', 'main_contractor', 'subcontractor', 'supplier',
]

export default function EditNetworkTenderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [tender, setTender] = useState<NetworkTender | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<UpdateNetworkTenderPayload>({})
  const [selectedParticipantTypes, setSelectedParticipantTypes] = useState<NetworkProfileType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getNetworkTender(id)
      .then((t) => {
        setTender(t)
        // Only draft tenders can be edited — backend enforces this too
        setForm({
          title: t.title,
          category: t.category,
          description: t.description ?? '',
          region: t.region ?? '',
          deadline: t.deadline
            ? new Date(t.deadline).toISOString().slice(0, 16)
            : '',
          visibility: t.visibility,
        })
        setSelectedParticipantTypes((t.participant_types as NetworkProfileType[]) ?? [])
      })
      .catch((err: unknown) =>
        setLoadError(extractNetworkMessage(err, 'فشل تحميل المناقصة'))
      )
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function toggleParticipantType(type: NetworkProfileType) {
    setSelectedParticipantTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!form.title?.trim()) {
      setSubmitError('عنوان المناقصة مطلوب')
      return
    }
    if (!form.category?.trim()) {
      setSubmitError('تصنيف المناقصة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await updateNetworkTender(id, {
        title: form.title?.trim(),
        category: form.category?.trim(),
        description: form.description?.trim() || null,
        region: form.region?.trim() || null,
        deadline: form.deadline?.trim() || null,
        visibility: form.visibility,
        participant_types:
          selectedParticipantTypes.length > 0 ? selectedParticipantTypes : null,
      })
      router.push(`/network/tenders/${id}`)
    } catch (err: unknown) {
      setSubmitError(extractNetworkMessage(err, 'فشل تحديث المناقصة'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingPage />
  if (loadError) return <ErrorDisplay message={loadError} />
  if (!tender) return <ErrorDisplay message="المناقصة غير موجودة" />

  // Backend only allows editing draft tenders
  if (tender.status !== 'draft') {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          لا يمكن تعديل هذه المناقصة — يُسمح بالتعديل فقط على المناقصات في حالة &quot;مسودة&quot;.
          الحالة الحالية: <strong>{tender.status}</strong>
        </div>
        <Link
          href={`/network/tenders/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← العودة إلى تفاصيل المناقصة
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">تعديل المناقصة</h1>
        <p className="text-muted-foreground text-sm mt-1">{tender.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
        {submitError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {submitError}
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            عنوان المناقصة <span className="text-destructive">*</span>
          </label>
          <Input
            name="title"
            value={form.title ?? ''}
            onChange={handleChange}
            required
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            التصنيف <span className="text-destructive">*</span>
          </label>
          <Input
            name="category"
            value={form.category ?? ''}
            onChange={handleChange}
            required
          />
        </div>

        {/* Visibility */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">نوع الرؤية</label>
          <select
            name="visibility"
            value={form.visibility ?? 'public'}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
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
            placeholder="مثال: الرياض، جدة"
          />
        </div>

        {/* Deadline */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">الموعد النهائي</label>
          <Input
            name="deadline"
            type="datetime-local"
            value={form.deadline ?? ''}
            onChange={handleChange}
          />
        </div>

        {/* Participant Types */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">أنواع المشاركين</label>
          <div className="flex flex-wrap gap-2">
            {PARTICIPANT_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleParticipantType(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedParticipantTypes.includes(type)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {PROFILE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">وصف المناقصة</label>
          <textarea
            name="description"
            value={form.description ?? ''}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
          <Link
            href={`/network/tenders/${id}`}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
