'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listProjects,
  createProject,
  type Project,
  type CreateProjectPayload,
  extractMessage,
} from '@/lib/api/projects'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateProjectPayload = {
  name: '',
  description: '',
  client_id: '',
  contract_id: '',
  start_date: '',
  end_date: '',
  manager_id: '',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateProjectPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchProjects = useCallback(() => {
    setLoading(true)
    setError(null)
    listProjects(page)
      .then((res) => {
        setProjects(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل قائمة المشاريع')))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.name.trim()) {
      setFormError('اسم المشروع مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await createProject({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        client_id: form.client_id?.trim() || undefined,
        contract_id: form.contract_id?.trim() || undefined,
        start_date: form.start_date?.trim() || undefined,
        end_date: form.end_date?.trim() || undefined,
        manager_id: form.manager_id?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء المشروع بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchProjects()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء المشروع'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المشاريع</h1>
          <p className="text-muted-foreground text-sm mt-1">قائمة جميع المشاريع وإدارتها</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة مشروع'}
        </Button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة مشروع جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="name">
                  اسم المشروع <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اسم المشروع"
                  required
                />
              </div>

              {/* Manager ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="manager_id">
                  معرّف المدير
                </label>
                <input
                  id="manager_id"
                  name="manager_id"
                  type="text"
                  value={form.manager_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID المدير (اختياري)"
                />
              </div>

              {/* Client ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="client_id">
                  معرّف العميل
                </label>
                <input
                  id="client_id"
                  name="client_id"
                  type="text"
                  value={form.client_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID العميل (اختياري)"
                />
              </div>

              {/* Contract ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="contract_id">
                  معرّف العقد
                </label>
                <input
                  id="contract_id"
                  name="contract_id"
                  type="text"
                  value={form.contract_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID العقد (اختياري)"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="start_date">
                  تاريخ البداية
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="end_date">
                  تاريخ الانتهاء
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="description">
                  الوصف
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="وصف المشروع (اختياري)"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الحفظ...' : 'حفظ المشروع'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل المشاريع..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchProjects} />
      ) : projects.length === 0 ? (
        <EmptyState message="لا توجد مشاريع مسجلة بعد" />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">اسم المشروع</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">التقدم</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">تاريخ البداية</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">تاريخ الانتهاء</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{project.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs">
                        {project.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.progress_percentage != null
                        ? `${project.progress_percentage}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{project.start_date ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{project.end_date ?? '—'}</td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm text-primary font-medium hover:underline"
                      >
                        عرض التفاصيل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {projects.map((project) => (
              <div key={project.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{project.name}</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                    {project.status ?? '—'}
                  </span>
                </div>
                {project.progress_percentage != null && (
                  <p className="text-sm text-muted-foreground">
                    التقدم: {project.progress_percentage}%
                  </p>
                )}
                {project.start_date && (
                  <p className="text-sm text-muted-foreground">البداية: {project.start_date}</p>
                )}
                {project.end_date && (
                  <p className="text-sm text-muted-foreground">الانتهاء: {project.end_date}</p>
                )}
                <Link
                  href={`/projects/${project.id}`}
                  className="inline-block text-sm text-primary font-medium hover:underline"
                >
                  عرض التفاصيل ←
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage || loading}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
