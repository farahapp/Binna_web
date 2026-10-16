'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getSubcontractAgreement,
  getAgreementProgress,
  submitAgreementForApproval,
  activateAgreement,
  completeAgreement,
  cancelAgreement,
  addSubcontractScope,
  recordProgress,
  issueCertificate,
  extractMessage,
  type SubcontractAgreement,
  type SubcontractProgress,
} from '@/lib/api/subcontracts'

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: 'مسودة', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    active: { label: 'نشط', className: 'bg-green-100 text-green-700 border-green-200' },
    completed: { label: 'مكتمل', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    cancelled: { label: 'ملغى', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[status] ?? {
    label: status,
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

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium">{value ?? '—'}</span>
    </div>
  )
}

// ─── Add Scope Form ───────────────────────────────────────────────────────────

function AddScopeForm({
  agreementId,
  onAdded,
}: {
  agreementId: string
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [rate, setRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await addSubcontractScope(agreementId, {
        description: desc,
        quantity: qty ? parseFloat(qty) : undefined,
        unit: unit || undefined,
        unit_rate: rate ? parseFloat(rate) : undefined,
      })
      setDesc('')
      setQty('')
      setUnit('')
      setRate('')
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
        + إضافة بند نطاق
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-muted/30 rounded-md p-4 border border-border"
    >
      <p className="text-sm font-medium text-foreground">إضافة بند نطاق</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <input
        required
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="وصف البند *"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="الكمية"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="الوحدة"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="سعر الوحدة"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Record Progress Form ─────────────────────────────────────────────────────

function RecordProgressForm({
  agreementId,
  onRecorded,
}: {
  agreementId: string
  onRecorded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('')
  const [pct, setPct] = useState('')
  const [cumPct, setCumPct] = useState('')
  const [amount, setAmount] = useState('')
  const [cumAmount, setCumAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await recordProgress(agreementId, {
        progress_period: period,
        percentage_complete: parseFloat(pct),
        cumulative_percentage: parseFloat(cumPct),
        amount_certified: amount ? parseFloat(amount) : undefined,
        cumulative_amount: cumAmount ? parseFloat(cumAmount) : undefined,
        notes: notes || undefined,
      })
      setPeriod('')
      setPct('')
      setCumPct('')
      setAmount('')
      setCumAmount('')
      setNotes('')
      setOpen(false)
      onRecorded()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
        + تسجيل تقدم
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-muted/30 rounded-md p-4 border border-border"
    >
      <p className="text-sm font-medium text-foreground">تسجيل تقدم</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <input
        required
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        placeholder="الفترة (مثال: أكتوبر 2026) *"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">نسبة الإنجاز (%) *</label>
          <input
            required
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">النسبة التراكمية (%) *</label>
          <input
            required
            value={cumPct}
            onChange={(e) => setCumPct(e.target.value)}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المبلغ المعتمد</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المبلغ التراكمي</label>
          <input
            value={cumAmount}
            onChange={(e) => setCumAmount(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="ملاحظات"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Issue Certificate Form ───────────────────────────────────────────────────

function IssueCertificateForm({
  agreementId,
  progressRecords,
  onIssued,
}: {
  agreementId: string
  progressRecords: SubcontractProgress[]
  onIssued: () => void
}) {
  const [open, setOpen] = useState(false)
  const [certNum, setCertNum] = useState('')
  const [progressId, setProgressId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await issueCertificate(agreementId, {
        certificate_number: certNum,
        subcontract_progress_id: progressId,
        certified_amount: parseFloat(amount),
        issued_date: date,
        notes: notes || undefined,
      })
      setCertNum('')
      setProgressId('')
      setAmount('')
      setDate('')
      setNotes('')
      setOpen(false)
      onIssued()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-primary hover:underline">
        + إصدار شهادة دفع
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-muted/30 rounded-md p-4 border border-border"
    >
      <p className="text-sm font-medium text-foreground">إصدار شهادة دفع</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <input
        required
        value={certNum}
        onChange={(e) => setCertNum(e.target.value)}
        placeholder="رقم الشهادة *"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">سجل التقدم المرتبط *</label>
        <select
          required
          value={progressId}
          onChange={(e) => setProgressId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">اختر سجل التقدم</option>
          {progressRecords.map((p) => (
            <option key={p.id} value={p.id}>
              {p.progress_period} — {p.percentage_complete}%
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المبلغ المعتمد *</label>
          <input
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تاريخ الإصدار *</label>
          <input
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="ملاحظات"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'جارٍ الإصدار…' : 'إصدار'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubcontractAgreementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [agreement, setAgreement] = useState<SubcontractAgreement | null>(null)
  const [progress, setProgress] = useState<SubcontractProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  async function loadAgreement() {
    setLoading(true)
    setError(null)
    try {
      const [agr, prog] = await Promise.all([
        getSubcontractAgreement(id),
        getAgreementProgress(id).catch(() => [] as SubcontractProgress[]),
      ])
      setAgreement(agr)
      setProgress(prog)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadAgreement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleAction(
    action: () => Promise<SubcontractAgreement>,
    successMsg: string
  ) {
    setActionLoading(true)
    setActionMsg(null)
    try {
      const updated = await action()
      setAgreement(updated)
      setActionMsg(successMsg)
    } catch (err) {
      setActionMsg('⚠️ ' + extractMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        جارٍ التحميل…
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          ⚠️ {error}
        </div>
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
          ← رجوع
        </button>
      </div>
    )
  }

  if (!agreement) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        لم يُعثر على العقد.
      </div>
    )
  }

  const canSubmit = agreement.status === 'draft'
  const canActivate = agreement.status === 'draft' || agreement.status === 'submitted'
  const canComplete = agreement.status === 'active'
  const canCancel = agreement.status === 'draft' || agreement.status === 'active'
  const canAddScope = agreement.status === 'draft' || agreement.status === 'active'
  const canRecordProgress = agreement.status === 'active'
  const canIssueCert = agreement.status === 'active' && progress.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{agreement.title}</h1>
            <StatusBadge status={agreement.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {agreement.agreement_number} — {agreement.subcontractor_name}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← رجوع
        </button>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div
          className={`rounded-md p-3 text-sm border ${
            actionMsg.startsWith('⚠️')
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          {actionMsg}
        </div>
      )}

      {/* Agreement Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-1">
        <h2 className="text-base font-semibold text-foreground mb-3">بيانات العقد</h2>
        <FieldRow label="رقم العقد" value={agreement.agreement_number} />
        <FieldRow label="المقاول من الباطن" value={agreement.subcontractor_name} />
        <FieldRow
          label="قيمة العقد"
          value={`${agreement.contract_value} ${agreement.currency ?? 'SAR'}`}
        />
        <FieldRow
          label="نسبة الاستقطاع"
          value={agreement.retention_percentage ? `${agreement.retention_percentage}%` : '—'}
        />
        <FieldRow label="تاريخ البدء" value={agreement.start_date} />
        <FieldRow label="تاريخ الانتهاء" value={agreement.end_date} />
        <FieldRow label="ملخص النطاق" value={agreement.scope_summary} />
        <FieldRow label="ملاحظات" value={agreement.notes} />
        <FieldRow label="تاريخ الإنشاء" value={agreement.created_at} />
      </div>

      {/* Lifecycle Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">إجراءات دورة الحياة</h2>
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <button
              disabled={actionLoading}
              onClick={() =>
                handleAction(
                  () => submitAgreementForApproval(id),
                  '✅ تم تقديم العقد للاعتماد'
                )
              }
              className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              تقديم للاعتماد
            </button>
          )}
          {canActivate && (
            <button
              disabled={actionLoading}
              onClick={() => handleAction(() => activateAgreement(id), '✅ تم تفعيل العقد')}
              className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              تفعيل العقد
            </button>
          )}
          {canComplete && (
            <button
              disabled={actionLoading}
              onClick={() =>
                handleAction(() => completeAgreement(id), '✅ تم إغلاق العقد كمكتمل')
              }
              className="rounded-md bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              إغلاق كمكتمل
            </button>
          )}
          {canCancel && (
            <button
              disabled={actionLoading}
              onClick={() => {
                if (confirm('هل أنت متأكد من إلغاء هذا العقد؟')) {
                  handleAction(() => cancelAgreement(id), '✅ تم إلغاء العقد')
                }
              }}
              className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              إلغاء العقد
            </button>
          )}
        </div>
        {!canSubmit && !canActivate && !canComplete && !canCancel && (
          <p className="text-sm text-muted-foreground">لا توجد إجراءات متاحة لهذه الحالة.</p>
        )}
      </div>

      {/* Scope Items */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بنود النطاق</h2>
        <p className="text-sm text-muted-foreground">بنود النطاق المضافة لهذا العقد.</p>
        {canAddScope && <AddScopeForm agreementId={id} onAdded={loadAgreement} />}
      </div>

      {/* Progress Records */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">سجلات التقدم</h2>
        {progress.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد سجلات تقدم بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-right">
                  <th className="pb-2 font-medium">الفترة</th>
                  <th className="pb-2 font-medium">نسبة الإنجاز</th>
                  <th className="pb-2 font-medium">التراكمية</th>
                  <th className="pb-2 font-medium">المبلغ المعتمد</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2">{p.progress_period}</td>
                    <td className="py-2">{p.percentage_complete}%</td>
                    <td className="py-2">{p.cumulative_percentage}%</td>
                    <td className="py-2">{p.amount_certified ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canRecordProgress && (
          <RecordProgressForm agreementId={id} onRecorded={loadAgreement} />
        )}
      </div>

      {/* Certificates */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">شهادات الدفع</h2>
        <p className="text-sm text-muted-foreground">
          إصدار شهادات الدفع المرتبطة بسجلات التقدم.
        </p>
        {canIssueCert && (
          <IssueCertificateForm
            agreementId={id}
            progressRecords={progress}
            onIssued={loadAgreement}
          />
        )}
        {!canIssueCert && agreement.status === 'active' && progress.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            يجب تسجيل تقدم أولاً قبل إصدار شهادة دفع.
          </p>
        )}
      </div>
    </div>
  )
}
