'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProject,
  getProjectStatus,
  getProjectTeam,
  canCloseProject,
  activateProject,
  closeProject,
  updateProgress,
  addActivity,
  submitDailyReport,
  addMilestone,
  markMilestoneReached,
  assignTeamMember,
  updateActivityStatus,
  type Project,
  type ProjectStatus,
  type ProjectTeamMember,
  type CreateActivityPayload,
  type CreateDailyReportPayload,
  type CreateMilestonePayload,
  type ActivityStatus,
  extractMessage,
} from '@/lib/api/projects'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

// ─── Section: Project Info ────────────────────────────────────────────────────

function ProjectInfoSection({
  project,
  status,
  onRefresh,
}: {
  project: Project
  status: ProjectStatus | null
  onRefresh: () => void
}) {
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null)

  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closeSuccess, setCloseSuccess] = useState<string | null>(null)

  const [progressValue, setProgressValue] = useState<string>(
    project.progress_percentage != null ? String(project.progress_percentage) : ''
  )
  const [updatingProgress, setUpdatingProgress] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [progressSuccess, setProgressSuccess] = useState<string | null>(null)

  async function handleActivate() {
    setActivating(true)
    setActivateError(null)
    setActivateSuccess(null)
    try {
      await activateProject(project.id)
      setActivateSuccess('تم تفعيل المشروع بنجاح')
      onRefresh()
    } catch (err: unknown) {
      setActivateError(extractMessage(err, 'فشل تفعيل المشروع'))
    } finally {
      setActivating(false)
    }
  }

  async function handleClose() {
    setClosing(true)
    setCloseError(null)
    setCloseSuccess(null)
    try {
      const check = await canCloseProject(project.id)
      if (!check.can_close) {
        setCloseError('لا يمكن إغلاق المشروع في الوقت الحالي')
        setClosing(false)
        return
      }
      await closeProject(project.id)
      setCloseSuccess('تم إغلاق المشروع بنجاح')
      onRefresh()
    } catch (err: unknown) {
      setCloseError(extractMessage(err, 'فشل إغلاق المشروع'))
    } finally {
      setClosing(false)
    }
  }

  async function handleUpdateProgress(e: React.FormEvent) {
    e.preventDefault()
    setProgressError(null)
    setProgressSuccess(null)
    const val = parseInt(progressValue, 10)
    if (isNaN(val) || val < 0 || val > 100) {
      setProgressError('يجب أن تكون نسبة التقدم بين 0 و 100')
      return
    }
    setUpdatingProgress(true)
    try {
      await updateProgress(project.id, val)
      setProgressSuccess('تم تحديث نسبة التقدم بنجاح')
      onRefresh()
    } catch (err: unknown) {
      setProgressError(extractMessage(err, 'فشل تحديث نسبة التقدم'))
    } finally {
      setUpdatingProgress(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">معلومات المشروع</h2>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">الاسم: </span>
          <span className="text-foreground font-medium">{project.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">الحالة: </span>
          <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-foreground">
            {status?.status ?? project.status ?? '—'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">نسبة التقدم: </span>
          <span className="text-foreground">
            {status?.progress_percentage ?? project.progress_percentage ?? '—'}
            {(status?.progress_percentage != null || project.progress_percentage != null) && '%'}
          </span>
        </div>
        {project.start_date && (
          <div>
            <span className="text-muted-foreground">تاريخ البداية: </span>
            <span className="text-foreground">{project.start_date}</span>
          </div>
        )}
        {project.end_date && (
          <div>
            <span className="text-muted-foreground">تاريخ الانتهاء: </span>
            <span className="text-foreground">{project.end_date}</span>
          </div>
        )}
        {project.description && (
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">الوصف: </span>
            <span className="text-foreground">{project.description}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2 border-t border-border">
        <p className="text-sm font-medium text-foreground">الإجراءات</p>

        {/* Activate */}
        <div className="space-y-2">
          {activateError && <ErrorDisplay message={activateError} />}
          {activateSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {activateSuccess}
            </div>
          )}
          <Button onClick={handleActivate} disabled={activating} variant="outline">
            {activating ? 'جارٍ التفعيل...' : '✅ تفعيل المشروع'}
          </Button>
        </div>

        {/* Close */}
        <div className="space-y-2">
          {closeError && <ErrorDisplay message={closeError} />}
          {closeSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {closeSuccess}
            </div>
          )}
          <Button onClick={handleClose} disabled={closing} variant="outline">
            {closing ? 'جارٍ الإغلاق...' : '🔒 إغلاق المشروع'}
          </Button>
        </div>

        {/* Update Progress */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">تحديث نسبة التقدم</p>
          {progressError && <ErrorDisplay message={progressError} />}
          {progressSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {progressSuccess}
            </div>
          )}
          <form onSubmit={handleUpdateProgress} className="flex gap-2 flex-wrap">
            <input
              type="number"
              min={0}
              max={100}
              value={progressValue}
              onChange={(e) => setProgressValue(e.target.value)}
              placeholder="0 - 100"
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-32"
            />
            <Button type="submit" disabled={updatingProgress} variant="outline">
              {updatingProgress ? 'جارٍ التحديث...' : 'تحديث التقدم'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Section: Team ────────────────────────────────────────────────────────────

function TeamSection({
  projectId,
  team,
  teamLoading,
  teamError,
  onRefresh,
}: {
  projectId: string
  team: ProjectTeamMember[]
  teamLoading: boolean
  teamError: string | null
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)
    if (!userId.trim()) {
      setFormError('معرّف المستخدم مطلوب')
      return
    }
    setSubmitting(true)
    try {
      await assignTeamMember(projectId, userId.trim(), role.trim() || undefined)
      setSuccessMsg('تم إضافة العضو بنجاح')
      setUserId('')
      setRole('')
      setShowForm(false)
      onRefresh()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إضافة العضو'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">الفريق</h2>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة عضو'}
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Add member form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">إضافة عضو جديد</h3>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="team_user_id">
                  معرّف المستخدم <span className="text-destructive">*</span>
                </label>
                <input
                  id="team_user_id"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID المستخدم"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="team_role">
                  الدور
                </label>
                <input
                  id="team_role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="الدور (اختياري)"
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
                {submitting ? 'جارٍ الإضافة...' : 'إضافة العضو'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Team list */}
      {teamLoading ? (
        <LoadingSpinner message="جارٍ تحميل الفريق..." />
      ) : teamError ? (
        <ErrorDisplay message={teamError} onRetry={onRefresh} />
      ) : team.length === 0 ? (
        <EmptyState message="لا يوجد أعضاء في الفريق بعد" />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">معرّف المستخدم</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">الدور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((member, idx) => (
                  <tr key={member.id ?? idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-mono text-xs">{member.user_id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{member.role ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-border">
            {team.map((member, idx) => (
              <div key={member.id ?? idx} className="p-4 space-y-1">
                <p className="text-xs font-mono text-foreground">{member.user_id}</p>
                {member.role && (
                  <p className="text-sm text-muted-foreground">الدور: {member.role}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section: Activity Status Update — API-GAP-M2-01 ─────────────────────────

const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  pending: 'معلّق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

const VALID_TRANSITIONS: Record<ActivityStatus, ActivityStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function ActivityStatusUpdateSection() {
  const [activityId, setActivityId] = useState('')
  const [currentStatus, setCurrentStatus] = useState<ActivityStatus>('pending')
  const [newStatus, setNewStatus] = useState<ActivityStatus | ''>('')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)
  const [updatedActivity, setUpdatedActivity] = useState<{ id?: string; status?: string; actual_start?: string; actual_end?: string } | null>(null)

  const allowedNext = VALID_TRANSITIONS[currentStatus]

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault()
    setUpdateError(null)
    setUpdateSuccess(null)
    setUpdatedActivity(null)

    if (!activityId.trim()) {
      setUpdateError('معرّف النشاط مطلوب')
      return
    }
    if (!newStatus) {
      setUpdateError('يجب اختيار الحالة الجديدة')
      return
    }

    setUpdating(true)
    try {
      const result = await updateActivityStatus(activityId.trim(), newStatus as ActivityStatus)
      setUpdatedActivity(result)
      setUpdateSuccess(`تم تحديث حالة النشاط إلى "${ACTIVITY_STATUS_LABELS[newStatus as ActivityStatus]}" بنجاح`)
      // Reflect new status locally so transitions update immediately
      setCurrentStatus(newStatus as ActivityStatus)
      setNewStatus('')
    } catch (err: unknown) {
      setUpdateError(extractMessage(err, 'فشل تحديث حالة النشاط'))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">تحديث حالة نشاط WBS</h2>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="activity_id_input">
                معرّف النشاط (UUID) <span className="text-destructive">*</span>
              </label>
              <input
                id="activity_id_input"
                type="text"
                value={activityId}
                onChange={(e) => {
                  setActivityId(e.target.value)
                  setUpdateError(null)
                  setUpdateSuccess(null)
                  setUpdatedActivity(null)
                }}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="current_status_select">
                الحالة الحالية
              </label>
              <select
                id="current_status_select"
                value={currentStatus}
                onChange={(e) => {
                  setCurrentStatus(e.target.value as ActivityStatus)
                  setNewStatus('')
                  setUpdateError(null)
                  setUpdateSuccess(null)
                }}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {(Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[]).map((s) => (
                  <option key={s} value={s}>{ACTIVITY_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="new_status_select">
                الحالة الجديدة <span className="text-destructive">*</span>
              </label>
              {allowedNext.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  الحالة &quot;{ACTIVITY_STATUS_LABELS[currentStatus]}&quot; نهائية — لا توجد انتقالات متاحة.
                </p>
              ) : (
                <select
                  id="new_status_select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ActivityStatus)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— اختر الحالة الجديدة —</option>
                  {allowedNext.map((s) => (
                    <option key={s} value={s}>{ACTIVITY_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {updateError && <ErrorDisplay message={updateError} />}

          {updateSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {updateSuccess}
            </div>
          )}

          {updatedActivity && (
            <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground space-y-1">
              <p><span className="font-medium">ID:</span> {updatedActivity.id ?? '—'}</p>
              <p><span className="font-medium">الحالة:</span> {updatedActivity.status ?? '—'}</p>
              {updatedActivity.actual_start && (
                <p><span className="font-medium">بداية فعلية:</span> {updatedActivity.actual_start}</p>
              )}
              {updatedActivity.actual_end && (
                <p><span className="font-medium">نهاية فعلية:</span> {updatedActivity.actual_end}</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updating || allowedNext.length === 0 || !newStatus}
            >
              {updating ? 'جارٍ التحديث...' : 'تحديث الحالة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Section: Activities ──────────────────────────────────────────────────────

function ActivitiesSection({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateActivityPayload>({
    name: '',
    description: '',
    planned_start: '',
    planned_end: '',
    parent_activity_id: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
      setFormError('اسم النشاط مطلوب')
      return
    }
    setSubmitting(true)
    try {
      await addActivity(projectId, {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        planned_start: form.planned_start?.trim() || undefined,
        planned_end: form.planned_end?.trim() || undefined,
        parent_activity_id: form.parent_activity_id?.trim() || undefined,
      })
      setSuccessMsg('تم إضافة النشاط بنجاح')
      setForm({ name: '', description: '', planned_start: '', planned_end: '', parent_activity_id: '' })
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إضافة النشاط'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">الأنشطة</h2>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة نشاط'}
        </Button>
      </div>

      {/* Open Item Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
        ⚠️ قائمة الأنشطة غير متاحة — لا يوجد GET endpoint في Backend
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Add activity form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">إضافة نشاط جديد</h3>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="activity_name">
                  اسم النشاط <span className="text-destructive">*</span>
                </label>
                <input
                  id="activity_name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اسم النشاط"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="parent_activity_id">
                  النشاط الأب
                </label>
                <input
                  id="parent_activity_id"
                  name="parent_activity_id"
                  type="text"
                  value={form.parent_activity_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID النشاط الأب (اختياري)"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="planned_start">
                  تاريخ البداية المخطط
                </label>
                <input
                  id="planned_start"
                  name="planned_start"
                  type="date"
                  value={form.planned_start}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="planned_end">
                  تاريخ الانتهاء المخطط
                </label>
                <input
                  id="planned_end"
                  name="planned_end"
                  type="date"
                  value={form.planned_end}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="activity_description">
                  الوصف
                </label>
                <textarea
                  id="activity_description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="وصف النشاط (اختياري)"
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
                {submitting ? 'جارٍ الحفظ...' : 'حفظ النشاط'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Section: Milestones ──────────────────────────────────────────────────────

function MilestonesSection({ projectId }: { projectId: string }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState<CreateMilestonePayload>({
    name: '',
    description: '',
    due_date: '',
  })
  const [milestoneFormError, setMilestoneFormError] = useState<string | null>(null)
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false)
  const [milestoneSuccess, setMilestoneSuccess] = useState<string | null>(null)

  const [reachMilestoneId, setReachMilestoneId] = useState('')
  const [reachError, setReachError] = useState<string | null>(null)
  const [reachSuccess, setReachSuccess] = useState<string | null>(null)
  const [reaching, setReaching] = useState(false)

  function handleMilestoneFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setMilestoneForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleMilestoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMilestoneFormError(null)
    setMilestoneSuccess(null)
    if (!milestoneForm.name.trim()) {
      setMilestoneFormError('اسم المعلم مطلوب')
      return
    }
    setMilestoneSubmitting(true)
    try {
      await addMilestone(projectId, {
        name: milestoneForm.name.trim(),
        description: milestoneForm.description?.trim() || undefined,
        due_date: milestoneForm.due_date?.trim() || undefined,
      })
      setMilestoneSuccess('تم إضافة المعلم بنجاح')
      setMilestoneForm({ name: '', description: '', due_date: '' })
      setShowAddForm(false)
    } catch (err: unknown) {
      setMilestoneFormError(extractMessage(err, 'فشل إضافة المعلم'))
    } finally {
      setMilestoneSubmitting(false)
    }
  }

  async function handleMarkReached(e: React.FormEvent) {
    e.preventDefault()
    setReachError(null)
    setReachSuccess(null)
    if (!reachMilestoneId.trim()) {
      setReachError('معرّف المعلم مطلوب')
      return
    }
    setReaching(true)
    try {
      await markMilestoneReached(reachMilestoneId.trim())
      setReachSuccess('تم تحديد المعلم كمنجز بنجاح')
      setReachMilestoneId('')
    } catch (err: unknown) {
      setReachError(extractMessage(err, 'فشل تحديد المعلم كمنجز'))
    } finally {
      setReaching(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">المعالم (Milestones)</h2>
        <Button
          size="sm"
          onClick={() => {
            setShowAddForm((v) => !v)
            setMilestoneFormError(null)
            setMilestoneSuccess(null)
          }}
        >
          {showAddForm ? 'إلغاء' : 'إضافة معلم'}
        </Button>
      </div>

      {/* Open Item Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
        ⚠️ قائمة المعالم غير متاحة — لا يوجد GET endpoint في Backend
      </div>

      {milestoneSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {milestoneSuccess}
        </div>
      )}

      {/* Add milestone form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">إضافة معلم جديد</h3>
          {milestoneFormError && <ErrorDisplay message={milestoneFormError} />}
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="milestone_name">
                  اسم المعلم <span className="text-destructive">*</span>
                </label>
                <input
                  id="milestone_name"
                  name="name"
                  type="text"
                  value={milestoneForm.name}
                  onChange={handleMilestoneFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اسم المعلم"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="milestone_due_date">
                  تاريخ الاستحقاق
                </label>
                <input
                  id="milestone_due_date"
                  name="due_date"
                  type="date"
                  value={milestoneForm.due_date}
                  onChange={handleMilestoneFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="milestone_description">
                  الوصف
                </label>
                <textarea
                  id="milestone_description"
                  name="description"
                  value={milestoneForm.description}
                  onChange={handleMilestoneFormChange}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="وصف المعلم (اختياري)"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setMilestoneFormError(null)
                }}
                disabled={milestoneSubmitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={milestoneSubmitting}>
                {milestoneSubmitting ? 'جارٍ الحفظ...' : 'حفظ المعلم'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Mark milestone as reached */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">تحديد معلم كمنجز</h3>
        {reachError && <ErrorDisplay message={reachError} />}
        {reachSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {reachSuccess}
          </div>
        )}
        <form onSubmit={handleMarkReached} className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={reachMilestoneId}
            onChange={(e) => setReachMilestoneId(e.target.value)}
            placeholder="UUID المعلم"
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1 min-w-[200px]"
          />
          <Button type="submit" disabled={reaching} variant="outline">
            {reaching ? 'جارٍ التحديث...' : '🏁 تحديد كمنجز'}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Section: Daily Reports ───────────────────────────────────────────────────

function DailyReportsSection({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateDailyReportPayload>({
    report_date: '',
    submitted_by: '',
    weather: '',
    work_done: '',
    issues: '',
    progress_percentage: undefined,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'progress_percentage'
          ? value
            ? parseInt(value, 10)
            : undefined
          : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)
    if (!form.report_date.trim()) {
      setFormError('تاريخ التقرير مطلوب')
      return
    }
    if (!form.submitted_by.trim()) {
      setFormError('معرّف مقدّم التقرير مطلوب')
      return
    }
    setSubmitting(true)
    try {
      await submitDailyReport(projectId, {
        report_date: form.report_date.trim(),
        submitted_by: form.submitted_by.trim(),
        weather: form.weather?.trim() || undefined,
        work_done: form.work_done?.trim() || undefined,
        issues: form.issues?.trim() || undefined,
        progress_percentage: form.progress_percentage,
      })
      setSuccessMsg('تم إرسال التقرير اليومي بنجاح')
      setForm({
        report_date: '',
        submitted_by: '',
        weather: '',
        work_done: '',
        issues: '',
        progress_percentage: undefined,
      })
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إرسال التقرير اليومي'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">التقارير اليومية</h2>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة تقرير'}
        </Button>
      </div>

      {/* Open Item Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
        ⚠️ قائمة التقارير غير متاحة — لا يوجد GET endpoint في Backend
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Add report form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">إضافة تقرير يومي</h3>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="report_date">
                  تاريخ التقرير <span className="text-destructive">*</span>
                </label>
                <input
                  id="report_date"
                  name="report_date"
                  type="date"
                  value={form.report_date}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="submitted_by">
                  مقدّم التقرير (UUID) <span className="text-destructive">*</span>
                </label>
                <input
                  id="submitted_by"
                  name="submitted_by"
                  type="text"
                  value={form.submitted_by}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="UUID المستخدم"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="weather">
                  حالة الطقس
                </label>
                <input
                  id="weather"
                  name="weather"
                  type="text"
                  value={form.weather}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="مثال: مشمس، غائم (اختياري)"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="report_progress">
                  نسبة التقدم
                </label>
                <input
                  id="report_progress"
                  name="progress_percentage"
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress_percentage ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0 - 100 (اختياري)"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="work_done">
                  الأعمال المنجزة
                </label>
                <textarea
                  id="work_done"
                  name="work_done"
                  value={form.work_done}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="وصف الأعمال المنجزة (اختياري)"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="issues">
                  المشكلات والعوائق
                </label>
                <textarea
                  id="issues"
                  name="issues"
                  value={form.issues}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="المشكلات والعوائق (اختياري)"
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
                {submitting ? 'جارٍ الإرسال...' : 'إرسال التقرير'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const [team, setTeam] = useState<ProjectTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<
    'info' | 'team' | 'activities' | 'activity-status' | 'milestones' | 'reports'
  >('info')

  const fetchProject = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([getProject(id), getProjectStatus(id)])
      .then(([p, s]) => {
        setProject(p)
        setStatus(s)
      })
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات المشروع')))
      .finally(() => setLoading(false))
  }, [id])

  const fetchTeam = useCallback(() => {
    if (!id) return
    setTeamLoading(true)
    setTeamError(null)
    getProjectTeam(id)
      .then(setTeam)
      .catch((err: unknown) => setTeamError(extractMessage(err, 'فشل تحميل الفريق')))
      .finally(() => setTeamLoading(false))
  }, [id])

  useEffect(() => {
    fetchProject()
    fetchTeam()
  }, [fetchProject, fetchTeam])

  const tabs = [
    { key: 'info' as const, label: 'معلومات المشروع' },
    { key: 'team' as const, label: 'الفريق' },
    { key: 'activities' as const, label: 'الأنشطة' },
    { key: 'activity-status' as const, label: 'حالة النشاط' },
    { key: 'milestones' as const, label: 'المعالم' },
    { key: 'reports' as const, label: 'التقارير اليومية' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← المشاريع
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold text-foreground">
          {loading ? 'جارٍ التحميل...' : (project?.name ?? 'تفاصيل المشروع')}
        </h1>
      </div>

      {loading ? (
        <LoadingSpinner message="جارٍ تحميل بيانات المشروع..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchProject} />
      ) : !project ? (
        <EmptyState message="لم يتم العثور على المشروع" />
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="flex gap-1 overflow-x-auto" aria-label="أقسام المشروع">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'info' && (
              <ProjectInfoSection
                project={project}
                status={status}
                onRefresh={fetchProject}
              />
            )}
            {activeTab === 'team' && (
              <TeamSection
                projectId={id}
                team={team}
                teamLoading={teamLoading}
                teamError={teamError}
                onRefresh={fetchTeam}
              />
            )}
            {activeTab === 'activities' && <ActivitiesSection projectId={id} />}
            {activeTab === 'activity-status' && <ActivityStatusUpdateSection />}
            {activeTab === 'milestones' && <MilestonesSection projectId={id} />}
            {activeTab === 'reports' && <DailyReportsSection projectId={id} />}
          </div>
        </>
      )}
    </div>
  )
}
