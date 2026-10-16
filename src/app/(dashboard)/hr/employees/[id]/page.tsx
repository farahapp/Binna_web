'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getEmployee,
  getEmployeeAttendance,
  getEmployeeLeaveRequests,
  getEmployeeCostAllocations,
  terminateEmployee,
  assignEmployeeToProject,
  recordAttendance,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  createCostAllocation,
  extractMessage,
  type Employee,
  type AttendanceRecord,
  type LeaveRequest,
  type CostAllocation,
} from '@/lib/api/hr'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium">{value ?? '—'}</span>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'نشط', className: 'bg-green-100 text-green-700 border-green-200' },
    terminated: { label: 'منتهي', className: 'bg-red-100 text-red-700 border-red-200' },
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    approved: { label: 'معتمد', className: 'bg-green-100 text-green-700 border-green-200' },
    rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[status ?? ''] ?? {
    label: status ?? '—',
    className: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  )
}

// ─── Project Assignment Form ──────────────────────────────────────────────────

function AssignProjectForm({
  employeeId,
  onDone,
}: {
  employeeId: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [role, setRole] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [alloc, setAlloc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await assignEmployeeToProject(employeeId, {
        project_id: projectId,
        role: role || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        allocation_percentage: alloc ? parseFloat(alloc) : undefined,
      })
      setProjectId(''); setRole(''); setStartDate(''); setEndDate(''); setAlloc('')
      setOpen(false)
      onDone()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
      + تعيين على مشروع
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-md p-4 border border-border">
      <p className="text-sm font-medium">تعيين على مشروع</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <input required value={projectId} onChange={(e) => setProjectId(e.target.value)}
        placeholder="UUID المشروع *"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <input value={role} onChange={(e) => setRole(e.target.value)}
        placeholder="الدور"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="number" min="0" max="100" step="1" value={alloc}
          onChange={(e) => setAlloc(e.target.value)} placeholder="% التخصيص"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Attendance Form ──────────────────────────────────────────────────────────

function AttendanceForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [hours, setHours] = useState('')
  const [status, setStatus] = useState('present')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await recordAttendance(employeeId, {
        date,
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        hours_worked: hours ? parseFloat(hours) : undefined,
        status,
        notes: notes || undefined,
      })
      setDate(''); setCheckIn(''); setCheckOut(''); setHours(''); setNotes('')
      setOpen(false)
      onDone()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
      + تسجيل حضور
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-md p-4 border border-border">
      <p className="text-sm font-medium">تسجيل حضور</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">التاريخ *</label>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">الحالة</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="half_day">نصف يوم</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">وقت الدخول</label>
          <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">وقت الخروج</label>
          <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ساعات العمل</label>
          <input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)}
            placeholder="0.0"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ملاحظات</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Leave Request Form ───────────────────────────────────────────────────────

function LeaveRequestForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createLeaveRequest(employeeId, {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      })
      setLeaveType('annual'); setStartDate(''); setEndDate(''); setReason('')
      setOpen(false)
      onDone()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
      + طلب إجازة
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-md p-4 border border-border">
      <p className="text-sm font-medium">طلب إجازة</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="annual">إجازة سنوية</option>
        <option value="sick">إجازة مرضية</option>
        <option value="emergency">إجازة طارئة</option>
        <option value="unpaid">إجازة بدون راتب</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">من *</label>
          <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">إلى *</label>
          <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
        placeholder="سبب الإجازة"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? 'جارٍ الإرسال…' : 'إرسال'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Cost Allocation Form ─────────────────────────────────────────────────────

function CostAllocationForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [costCode, setCostCode] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createCostAllocation(employeeId, {
        project_id: projectId || undefined,
        cost_code: costCode || undefined,
        amount: parseFloat(amount),
        period: period || undefined,
        notes: notes || undefined,
      })
      setProjectId(''); setCostCode(''); setAmount(''); setPeriod(''); setNotes('')
      setOpen(false)
      onDone()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
      + تخصيص تكلفة
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-md p-4 border border-border">
      <p className="text-sm font-medium">تخصيص تكلفة</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input value={projectId} onChange={(e) => setProjectId(e.target.value)}
          placeholder="UUID المشروع"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={costCode} onChange={(e) => setCostCode(e.target.value)}
          placeholder="رمز التكلفة"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المبلغ *</label>
          <input required type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <input value={period} onChange={(e) => setPeriod(e.target.value)}
          placeholder="الفترة (مثال: أكتوبر 2026)"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
        placeholder="ملاحظات"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [costs, setCosts] = useState<CostAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [emp, att, lv, co] = await Promise.all([
        getEmployee(id),
        getEmployeeAttendance(id).catch(() => [] as AttendanceRecord[]),
        getEmployeeLeaveRequests(id).catch(() => [] as LeaveRequest[]),
        getEmployeeCostAllocations(id).catch(() => [] as CostAllocation[]),
      ])
      setEmployee(emp)
      setAttendance(att)
      setLeaves(lv)
      setCosts(co)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleTerminate() {
    if (!confirm('هل أنت متأكد من إنهاء خدمة هذا الموظف؟')) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const updated = await terminateEmployee(id, {})
      setEmployee(updated)
      setActionMsg('✅ تم إنهاء خدمة الموظف')
    } catch (err) {
      setActionMsg('⚠️ ' + extractMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLeaveAction(leaveId: string, action: 'approve' | 'reject') {
    setActionLoading(true)
    setActionMsg(null)
    try {
      if (action === 'approve') {
        await approveLeaveRequest(leaveId)
        setActionMsg('✅ تم اعتماد طلب الإجازة')
      } else {
        await rejectLeaveRequest(leaveId)
        setActionMsg('✅ تم رفض طلب الإجازة')
      }
      await loadAll()
    } catch (err) {
      setActionMsg('⚠️ ' + extractMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      جارٍ التحميل…
    </div>
  )

  if (error) return (
    <div className="space-y-4">
      <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800 text-sm">⚠️ {error}</div>
      <button onClick={() => router.back()} className="text-sm text-primary hover:underline">← رجوع</button>
    </div>
  )

  if (!employee) return (
    <div className="text-center py-20 text-muted-foreground text-sm">لم يُعثر على الموظف.</div>
  )

  const isActive = employee.status !== 'terminated'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">
              {employee.first_name} {employee.last_name}
            </h1>
            <StatusBadge status={employee.status ?? 'active'} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {employee.employee_number}
            {employee.job_title ? ` — ${employee.job_title}` : ''}
            {employee.department ? ` | ${employee.department}` : ''}
          </p>
        </div>
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">
          ← رجوع
        </button>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div className={`rounded-md p-3 text-sm border ${actionMsg.startsWith('⚠️') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
          {actionMsg}
        </div>
      )}

      {/* Employee Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-1">
        <h2 className="text-base font-semibold text-foreground mb-3">بيانات الموظف</h2>
        <FieldRow label="رقم الموظف" value={employee.employee_number} />
        <FieldRow label="الاسم الكامل" value={`${employee.first_name} ${employee.last_name}`} />
        <FieldRow label="المسمى الوظيفي" value={employee.job_title} />
        <FieldRow label="القسم" value={employee.department} />
        <FieldRow label="نوع التوظيف" value={employee.employment_type} />
        <FieldRow label="تاريخ التعيين" value={employee.hire_date} />
        <FieldRow label="الأجر اليومي" value={employee.daily_rate ? `${employee.daily_rate} ${employee.currency ?? 'SAR'}` : undefined} />
        <FieldRow label="الأجر بالساعة" value={employee.hourly_rate ? `${employee.hourly_rate} ${employee.currency ?? 'SAR'}` : undefined} />
      </div>

      {/* Actions */}
      {isActive && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={actionLoading}
              onClick={handleTerminate}
              className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              إنهاء الخدمة
            </button>
          </div>
        </div>
      )}

      {/* Project Assignment */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">التعيين على المشاريع</h2>
        {isActive && <AssignProjectForm employeeId={id} onDone={loadAll} />}
        {!isActive && <p className="text-sm text-muted-foreground">الموظف غير نشط.</p>}
      </div>

      {/* Attendance */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">سجلات الحضور</h2>
        {attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد سجلات حضور.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-right">
                  <th className="pb-2 font-medium">التاريخ</th>
                  <th className="pb-2 font-medium">الحالة</th>
                  <th className="pb-2 font-medium">دخول</th>
                  <th className="pb-2 font-medium">خروج</th>
                  <th className="pb-2 font-medium">الساعات</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map((a) => (
                  <tr key={a.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2">{a.date}</td>
                    <td className="py-2"><StatusBadge status={a.status} /></td>
                    <td className="py-2">{a.check_in ?? '—'}</td>
                    <td className="py-2">{a.check_out ?? '—'}</td>
                    <td className="py-2">{a.hours_worked ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isActive && <AttendanceForm employeeId={id} onDone={loadAll} />}
      </div>

      {/* Leave Requests */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">طلبات الإجازة</h2>
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد طلبات إجازة.</p>
        ) : (
          <div className="space-y-2">
            {leaves.map((lv) => (
              <div key={lv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-md border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">{lv.leave_type} — {lv.start_date} إلى {lv.end_date}</p>
                  {lv.reason && <p className="text-xs text-muted-foreground mt-0.5">{lv.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lv.status} />
                  {lv.status === 'pending' && (
                    <>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleLeaveAction(lv.id, 'approve')}
                        className="rounded-md bg-green-600 text-white px-3 py-1 text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        اعتماد
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleLeaveAction(lv.id, 'reject')}
                        className="rounded-md bg-red-600 text-white px-3 py-1 text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        رفض
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {isActive && <LeaveRequestForm employeeId={id} onDone={loadAll} />}
      </div>

      {/* Cost Allocations */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">تخصيصات التكاليف</h2>
        {costs.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تخصيصات تكاليف.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-right">
                  <th className="pb-2 font-medium">الفترة</th>
                  <th className="pb-2 font-medium">المبلغ</th>
                  <th className="pb-2 font-medium">رمز التكلفة</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2">{c.period ?? '—'}</td>
                    <td className="py-2">{c.amount}</td>
                    <td className="py-2">{c.cost_code ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isActive && <CostAllocationForm employeeId={id} onDone={loadAll} />}
      </div>
    </div>
  )
}
