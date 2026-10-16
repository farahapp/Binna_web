'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createNetworkTender,
  extractNetworkMessage,
  PROFILE_TYPE_LABELS,
  type NetworkProfileType,
  type TenderVisibility,
  type CreateNetworkTenderPayload,
} from '@/lib/api/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const VISIBILITY_OPTIONS: { value: TenderVisibility; label: string; note?: string }[] = [
  { value: 'public', label: 'عام — مرئي لجميع المشاركين' },
  { value: 'private', label: 'خاص — مرئي للمستأجر المُدير فقط' },
  { value: 'invited', label: 'بالدعوة — (سير عمل الدعوات قيد التطوير)' },
  { value: 'matched', label: 'مطابق — (المطابقة التلقائية قيد التطوير)' },
]

const PARTICIPANT_TYPE_OPTIONS: NetworkProfileType[] = [
  'owner', 'engineer', 'contractor', 'main_contractor', 'subcontractor', 'supplier',
]

export default function NewNetworkTenderPage() {
  const router = useRouter()

  const [form, setForm] = useState<CreateNetworkTenderPayload>({
    publisher_profile_id: '',
    title: '',
    category: '',
    description: '',
    region: '',
    deadline: '',
    visibility: 'public',
  })
  const [selectedParticipantTypes, setSelectedParticipantTypes] = useState<NetworkProfileType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)

    if (!form.publisher_profile_id.trim()) {
      setError('معرّف الملف الشخصي للناشر مطلوب')
      return
    }
    if (!form.title.trim()) {
      setError('عنوان المناقصة مطلوب')
      return
    }
    if (!form.category.trim()) {
      setError('تصنيف المناقصة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateNetworkTenderPayload = {
        publisher_profile_id: form.publisher_profile_id.trim(),
        title: form.title.trim(),
        category: form.category.trim(),
        ...(form.description?.trim() ? { description: form.description.trim() } : {}),
        ...(form.region?.trim() ? { region: form.region.trim() } : {}),
        ...(form.deadline?.trim() ? { deadline: form.deadline.trim() } : {}),
        visibility: form.visibility ?? 'public',
        ...(selectedParticipantTypes.length > 0
          ? { participant_types: selectedParticipantTypes }
          : {}),
      }
      const tender = await createNetworkTender(payload)
      router.push(`/network/tenders/${tender.id}`)
    } catch (err: unknown) {
      setError(extractNetworkMessage(err, 'فشل إنشاء المناقصة'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">مناقصة جديدة</h1>
        <p className="text-muted-foreground text-sm mt-1">
          أنشئ مناقصة جديدة في شبكة البناء التجارية
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Publisher Profile ID */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            معرّف الملف الشخصي للناشر (UUID) <span className="text-destructive">*</span>
          </label>
          <Input
            name="publisher_profile_id"
            value={form.publisher_profile_id}
            onChange={handleChange}
            placeholder="UUID الملف الشخصي في الشبكة"
            required
          />
          <p className="text-xs text-muted-foreground">
            يجب أن يكون الملف الشخصي موجوداً في{' '}
            <a href="/network/profiles" className="text-primary hover:underline">
              الملفات الشخصية
            </a>
          </p>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            عنوان المناقصة <span className="text-destructive">*</span>
          </label>
          <Input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="عنوان واضح ومختصر للمناقصة"
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
            value={form.category}
            onChange={handleChange}
            placeholder="مثال: إنشاء، كهرباء، سباكة، تشطيبات"
            required
          />
        </div>

        {/* Visibility */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">نوع الرؤية</label>
          <select
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(form.visibility === 'invited' || form.visibility === 'matched') && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              سير عمل الدعوات والمطابقة التلقائية قيد التطوير. يمكن إنشاء المناقصة بهذا النوع لكن
              الوظائف الكاملة ستكون متاحة لاحقاً.
            </p>
          )}
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
          <label className="text-sm font-medium text-foreground">أنواع المشاركين المستهدفين</label>
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
            placeholder="وصف تفصيلي للمناقصة ومتطلباتها"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'جارٍ الإنشاء...' : 'إنشاء المناقصة (مسودة)'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/network/tenders')}
            disabled={submitting}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  )
}
