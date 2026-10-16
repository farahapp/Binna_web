'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getAsset,
  allocateAsset,
  releaseAsset,
  scheduleMaintenance,
  completeMaintenance,
  decommissionAsset,
  createEquipmentCostAllocation,
  extractMessage,
  type Asset,
  type MaintenanceRecord,
} from '@/lib/api/equipment'

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
    allocated: { label: 'مخصص', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    maintenance: { label: 'صيانة', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    decommissioned: { label: 'مسحوب', className: 'bg-red-100 text-red-700 border-red-200' },
    completed: { label: 'مكتمل', className: 'bg-green-100 text-green-700 border-green-200' },
    scheduled: { label: 'مجدول', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  }
  const s = map[status ?? ''] ?? {
    label: status ?? '—',
    className: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

// ─── Allocate Form ────────────────────────────────────────────────────────────

function AllocateForm({ assetId, onDone }: { assetId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await allocateAsset(assetId, {
        project_id: projectId || undefined,
        allocation_date: date || undefined,
        notes: notes || undefined,
      })
      setProjectId(''); setDate(''); setNotes('')
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
      + تخصيص لمشروع
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-md p-4 border border-border">
      <p className="text-sm font-medium">تخصيص الأصل</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <input value={projectId} onChange={(e) => setProjectId(e.target.value)}
        placeholder="UUID المشروع"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
        placeholder="ملاحظات"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? 'جارٍ الحفظ…' : 'تخصيص'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-input bg-background px-4 py-1.5 text-sm hover:bg-muted transition-colors">
          إلغاء
        </button>
      </div>
    </form>
  )
}

// ─── Maintenance Form ─────────────────────────────────────────────────────────

function MaintenanceForm({ assetId, onDone }: { assetId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [mType, setMType] = useState('preventive')
  const [desc, setDesc] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [cost, setCost] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await scheduleMaintenance(assetId, {
        maintenance_type: mType,
        description: desc || undefined,
        scheduled_date: scheduledDate || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        performed_by: performedBy || undefined,
        notes: notes || undefined,
      })
      setMType('preventive'); setDesc(''); setScheduledDate(''); setCost(''); setPerformedBy(''); setNotes('')
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
      + جدولة صيانة
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/30 rounded-md p-4 border border-border">
      <p className="text-sm font-medium">جدولة صيانة</p>
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      <select value={mType} onChange={(e) => setMType(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="preventive">وقائية</option>
        <option value="corrective">تصحيحية</option>
        <option value="inspection">فحص</option>
      </select>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
        placeholder="وصف الصيانة"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تاريخ الجدولة</label>
          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">التكلفة</label>
          <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)}
        placeholder="المنفذ"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loading ? 'جارٍ الحفظ…' : 'جدولة'}
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

function CostAllocationForm({ assetId, onDone }: { assetId: string; onDone: () => void }) {
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
      await createEquipmentCostAllocation(assetId, {
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
          placeholder="الفترة"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [asset, setAsset] = useState<Asset | null>(null)
  const [maintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function loadAsset() {
    setLoading(true)
    setError(null)
    try {
      const a = await getAsset(id)
      setAsset(a)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadAsset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleRelease() {
    setActionLoading(true)
    setActionMsg(null)
    try {
      await releaseAsset(id)
      setActionMsg('✅ تم تحرير الأصل')
      await loadAsset()
    } catch (err) {
      setActionMsg('⚠️ ' + extractMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDecommission() {
    if (!confirm('هل أنت متأكد من سحب هذا الأصل من الخدمة؟')) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const updated = await decommissionAsset(id)
      setAsset(updated)
      setActionMsg('✅ تم سحب الأصل من الخدمة')
    } catch (err) {
      setActionMsg('⚠️ ' + extractMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCompleteMaintenance(maintenanceId: string) {
    setActionLoading(true)
    setActionMsg(null)
    try {
      await completeMaintenance(maintenanceId)
      setActionMsg('✅ تم إغلاق سجل الصيانة')
      await loadAsset()
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

  if (!asset) return (
    <div className="text-center py-20 text-muted-foreground text-sm">لم يُعثر على الأصل.</div>
  )

  const isActive = asset.status === 'active'
  const isAllocated = asset.status === 'allocated'
  const isDecommissioned = asset.status === 'decommissioned'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {asset.asset_code}
            {asset.category ? ` — ${asset.category}` : ''}
            {asset.asset_type === 'leased' ? ' | مستأجر' : ' | مملوك'}
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

      {/* Asset Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-1">
        <h2 className="text-base font-semibold text-foreground mb-3">بيانات الأصل</h2>
        <FieldRow label="كود الأصل" value={asset.asset_code} />
        <FieldRow label="الاسم" value={asset.name} />
        <FieldRow label="الفئة" value={asset.category} />
        <FieldRow label="النوع" value={asset.asset_type === 'leased' ? 'مستأجر' : 'مملوك'} />
        <FieldRow label="تاريخ الاقتناء" value={asset.acquisition_date} />
        <FieldRow label="تكلفة الاقتناء" value={asset.acquisition_cost ? `${asset.acquisition_cost} ${asset.currency ?? ''}` : undefined} />
        <FieldRow label="معدل الإهلاك" value={asset.depreciation_rate ? `${asset.depreciation_rate}%` : undefined} />
        <FieldRow label="الوصف" value={asset.description} />
        <FieldRow label="ملاحظات" value={asset.notes} />
      </div>

      {/* Lifecycle Actions */}
      {!isDecommissioned && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">إجراءات دورة الحياة</h2>
          <div className="flex flex-wrap gap-2">
            {isActive && (
              <div className="contents">
                <AllocateForm assetId={id} onDone={loadAsset} />
              </div>
            )}
            {isAllocated && (
              <button
                disabled={actionLoading}
                onClick={handleRelease}
                className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                تحرير الأصل
              </button>
            )}
            <button
              disabled={actionLoading}
              onClick={handleDecommission}
              className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              سحب من الخدمة
            </button>
          </div>
        </div>
      )}

      {/* Maintenance */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">سجلات الصيانة</h2>
        {maintenanceRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد سجلات صيانة.</p>
        ) : (
          <div className="space-y-2">
            {maintenanceRecords.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-md border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">{m.maintenance_type} — {m.scheduled_date ?? '—'}</p>
                  {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={m.status} />
                  {m.status === 'scheduled' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleCompleteMaintenance(m.id)}
                      className="rounded-md bg-green-600 text-white px-3 py-1 text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      إغلاق
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {!isDecommissioned && <MaintenanceForm assetId={id} onDone={loadAsset} />}
      </div>

      {/* Cost Allocation */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">تخصيصات التكاليف</h2>
        <p className="text-sm text-muted-foreground">تخصيص تكاليف الأصل على المشاريع.</p>
        {!isDecommissioned && <CostAllocationForm assetId={id} onDone={loadAsset} />}
      </div>
    </div>
  )
}
