'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getBudget,
  createBudget,
  approveBudget,
  type Budget,
  type CreateBudgetPayload,
  extractMessage,
} from '@/lib/api/cost-control'
import { listProjects, type Project } from '@/lib/api/projects'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateBudgetPayload = {
  name: '',
  total_amount: 0,
  project_id: '',
  currency: 'SAR',
  fiscal_year: undefined,
  description: '',
}

export default function BudgetsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  // Budget lookup by project
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [budget, setBudget] = useState<Budget | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateBudgetPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Approve
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  // Load projects list
  const fetchProjects = useCallback(() => {
    setProjectsLoading(true)
    setProjectsError(null)
    listProjects(1)
      .then((res) => setProjects(res.data))
      .catch((err: unknown) => setProjectsError(extractMessage(err, 'فشل تحميل المشاريع')))
      .finally(() => setProjectsLoading(false))
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Load budget for selected project
  function handleLoadBudget() {
    if (!selectedProjectId) return
    setBudgetLoading(true)
    setBudgetError(null)
    setBudget(null)
    getBudget(selectedProjectId)
      .then((b) => setBudget(b))
      .catch((err: unknown) => setBudgetError(extractMessage(err, 'لا توجد ميزانية لهذا المشروع')))
      .finally(() => setBudgetLoading(false))
  }

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

    if (!form.name.trim()) {
      setFormError('اسم الميزانية مطلوب')
      return
    }
    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setFormError('المبلغ الإجمالي يجب أن يكون أكبر من صفر')
      return
    }

    setSubmitting(true)
    try {
      await createBudget({
        name: form.name.trim(),
        total_amount: Number(form.total_amount),
        project_id: form.project_id?.trim() || undefined,
        currency: form.currency?.trim() || 'SAR',
        fiscal_year: form.fiscal_year ? Number(form.fiscal_year) : undefined,
        description: form.description?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء الميزانية بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      // Reload budget if project selected
      if (selectedProjectId) handleLoadBudget()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء الميزانية'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove() {
    if (!budget) return
    setApproving(true)
    setApproveError(null)
    try {
      const updated = await approveBudget(budget.id, {})
      setBudget(updated)
      setSuccessMsg('تمت الموافقة على الميزانية')
    } catch (err: unknown) {
      setApproveError(extractMessage(err, 'فشل الموافقة على الميزانية'))
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الميزانيات</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة ميزانيات المشاريع</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إنشاء ميزانية'}
        </Button>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إنشاء ميزانية جديدة</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  اسم الميزانية <span className="text-destructive">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="مثال: ميزانية مشروع الأبراج 2026"
                />
              </div>

              {/* Total amount */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  المبلغ الإجمالي <span className="text-destructive">*</span>
                </label>
                <input
                  name="total_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_amount}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="0.00"
                />
              </div>

              {/* Project */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">المشروع</label>
                {projectsLoading ? (
                  <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
                ) : (
                  <select
                    name="project_id"
                    value={form.project_id ?? ''}
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

              {/* Fiscal year */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">السنة المالية</label>
                <input
                  name="fiscal_year"
                  type="number"
                  value={form.fiscal_year ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="2026"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">الوصف</label>
              <textarea
                name="description"
                value={form.description ?? ''}
                onChange={handleFormChange}
                rows={2}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="وصف اختياري للميزانية"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الحفظ...' : 'حفظ الميزانية'}
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

      {/* Budget lookup by project */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">عرض ميزانية مشروع</h2>
        {projectsError && <ErrorDisplay message={projectsError} />}
        <div className="flex gap-2 flex-wrap">
          {projectsLoading ? (
            <LoadingSpinner />
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value)
                setBudget(null)
                setBudgetError(null)
              }}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
            >
              <option value="">— اختر مشروعاً —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={handleLoadBudget}
            disabled={!selectedProjectId || budgetLoading}
            variant="outline"
          >
            {budgetLoading ? 'جارٍ التحميل...' : 'عرض الميزانية'}
          </Button>
        </div>

        {budgetLoading && <LoadingSpinner />}
        {budgetError && <ErrorDisplay message={budgetError} />}

        {budget && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <BudgetField label="الاسم" value={budget.name} />
              <BudgetField
                label="المبلغ الإجمالي"
                value={`${Number(budget.total_amount).toLocaleString('ar-SA')} ${budget.currency ?? 'SAR'}`}
              />
              <BudgetField label="الحالة" value={budget.status ?? '—'} />
              <BudgetField label="السنة المالية" value={budget.fiscal_year?.toString() ?? '—'} />
              <BudgetField label="الوصف" value={budget.description ?? '—'} />
              <BudgetField
                label="تاريخ الموافقة"
                value={budget.approved_at ? new Date(budget.approved_at).toLocaleDateString('ar-SA') : '—'}
              />
            </div>

            {/* Approve button — only if not yet approved */}
            {budget.status !== 'approved' && (
              <div className="pt-2">
                {approveError && <ErrorDisplay message={approveError} />}
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  variant="outline"
                >
                  {approving ? 'جارٍ الموافقة...' : 'الموافقة على الميزانية'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BudgetField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
