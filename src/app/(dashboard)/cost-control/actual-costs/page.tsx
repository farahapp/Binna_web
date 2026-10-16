'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  recordActualCost,
  type RecordActualCostPayload,
  extractMessage,
} from '@/lib/api/cost-control'
import { listProjects, type Project } from '@/lib/api/projects'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: RecordActualCostPayload = {
  project_id: '',
  budget_id: '',
  description: '',
  amount: 0,
  currency: 'SAR',
  cost_date: '',
}

export default function ActualCostsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<RecordActualCostPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchProjects = useCallback(() => {
    setProjectsLoading(true)
    listProjects(1)
      .then((res) => setProjects(res.data))
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.project_id) {
      setFormError('يجب اختيار المشروع')
      return
    }
    if (!form.description.trim()) {
      setFormError('وصف التكلفة مطلوب')
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    setSubmitting(true)
    try {
      await recordActualCost({
        project_id: form.project_id,
        budget_id: form.budget_id?.trim() || undefined,
        description: form.description.trim(),
        amount: Number(form.amount),
        currency: form.currency?.trim() || 'SAR',
        cost_date: form.cost_date?.trim() || undefined,
      })
      setSuccessMsg('تم تسجيل التكلفة الفعلية بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل تسجيل التكلفة الفعلية'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التكاليف الفعلية</h1>
          <p className="text-muted-foreground text-sm mt-1">تسجيل التكاليف الفعلية للمشاريع</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'تسجيل تكلفة'}
        </Button>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Record form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">تسجيل تكلفة فعلية</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  المشروع <span className="text-destructive">*</span>
                </label>
                {projectsLoading ? (
                  <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
                ) : (
                  <select
                    name="project_id"
                    value={form.project_id}
                    onChange={handleFormChange}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— اختر مشروعاً —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  المبلغ <span className="text-destructive">*</span>
                </label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0.00"
                />
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">العملة</label>
                <input
                  name="currency"
                  value={form.currency ?? 'SAR'}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="SAR"
                />
              </div>

              {/* Cost date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">تاريخ التكلفة</label>
                <input
                  name="cost_date"
                  type="date"
                  value={form.cost_date ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Budget ID (optional) */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">معرّف الميزانية (اختياري)</label>
                <input
                  name="budget_id"
                  value={form.budget_id ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="UUID الميزانية"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                الوصف <span className="text-destructive">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                rows={2}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="وصف التكلفة الفعلية"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الحفظ...' : 'حفظ التكلفة'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Info note */}
      {!showForm && (
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground">
            استخدم زر &quot;تسجيل تكلفة&quot; لإضافة تكلفة فعلية جديدة لأحد المشاريع.
            يمكن الاطلاع على الموقف التكليفي الكامل من صفحة{' '}
            <a href="/cost-control/cost-position" className="text-primary hover:underline">
              الموقف التكليفي
            </a>
            .
          </p>
        </div>
      )}
    </div>
  )
}
