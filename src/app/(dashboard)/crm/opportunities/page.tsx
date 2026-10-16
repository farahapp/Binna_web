'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getOpportunities,
  createOpportunity,
  updateOpportunityStage,
  markOpportunityWon,
  markOpportunityLost,
  getClients,
  type Opportunity,
  type OpportunityStage,
  type CrmClient,
  type CreateOpportunityPayload,
  extractMessage,
} from '@/lib/api/crm'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const OPP_STAGE_LABELS: Record<OpportunityStage, string> = {
  open: 'مفتوحة',
  won: 'فوز',
  lost: 'خسارة',
  cancelled: 'ملغاة',
}

const OPP_STAGE_COLORS: Record<OpportunityStage, string> = {
  open: 'bg-blue-100 text-blue-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const ALL_STAGES: OpportunityStage[] = ['open', 'won', 'lost', 'cancelled']

const INITIAL_FORM: CreateOpportunityPayload = {
  client_id: 0,
  title: '',
  value: undefined,
  expected_close_date: '',
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<OpportunityStage | ''>('')

  // Clients for the create form
  const [clients, setClients] = useState<CrmClient[]>([])

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateOpportunityPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Action loading
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Lost reason modal
  const [lostModal, setLostModal] = useState<{ id: number } | null>(null)
  const [lostReason, setLostReason] = useState('')

  const fetchOpportunities = useCallback(() => {
    setLoading(true)
    setError(null)
    getOpportunities(stageFilter || undefined)
      .then(setOpportunities)
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل الفرص')))
      .finally(() => setLoading(false))
  }, [stageFilter])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => {/* non-critical */})
  }, [])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    if (name === 'client_id') {
      setForm((prev) => ({ ...prev, client_id: Number(value) }))
    } else if (name === 'value') {
      setForm((prev) => ({ ...prev, value: value ? Number(value) : undefined }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.title.trim()) {
      setFormError('عنوان الفرصة مطلوب')
      return
    }
    if (!form.client_id) {
      setFormError('يرجى اختيار العميل')
      return
    }

    setSubmitting(true)
    try {
      await createOpportunity({
        client_id: form.client_id,
        title: form.title.trim(),
        value: form.value,
        expected_close_date: form.expected_close_date?.trim() || undefined,
      })
      setSuccessMsg('تم إضافة الفرصة بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchOpportunities()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إضافة الفرصة'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMarkWon(id: number) {
    setActionLoading(id)
    try {
      const updated = await markOpportunityWon(id)
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, stage: updated.stage } : o))
      )
    } catch (err: unknown) {
      alert(extractMessage(err, 'فشل تحديث الفرصة'))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleMarkLost() {
    if (!lostModal) return
    setActionLoading(lostModal.id)
    try {
      const updated = await markOpportunityLost(lostModal.id, lostReason.trim() || undefined)
      setOpportunities((prev) =>
        prev.map((o) => (o.id === lostModal.id ? { ...o, stage: updated.stage } : o))
      )
      setLostModal(null)
      setLostReason('')
    } catch (err: unknown) {
      alert(extractMessage(err, 'فشل تحديث الفرصة'))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleStageChange(id: number, stage: OpportunityStage) {
    setActionLoading(id)
    try {
      const updated = await updateOpportunityStage(id, stage)
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, stage: updated.stage } : o))
      )
    } catch (err: unknown) {
      alert(extractMessage(err, 'فشل تحديث المرحلة'))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الفرص</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة فرص البيع ومتابعة حالتها</p>
        </div>
        <Button onClick={() => { setShowForm((v) => !v); setFormError(null); setSuccessMsg(null) }}>
          {showForm ? 'إلغاء' : 'إضافة فرصة'}
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
          <h2 className="text-base font-semibold text-foreground">إضافة فرصة جديدة</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="opp_client_id">
                  العميل <span className="text-destructive">*</span>
                </label>
                <select
                  id="opp_client_id"
                  name="client_id"
                  value={form.client_id || ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="">اختر العميل</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="opp_title">
                  العنوان <span className="text-destructive">*</span>
                </label>
                <input
                  id="opp_title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="عنوان الفرصة"
                  required
                />
              </div>

              {/* Value */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="opp_value">
                  القيمة المتوقعة
                </label>
                <input
                  id="opp_value"
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                />
              </div>

              {/* Expected close date */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="opp_date">
                  تاريخ الإغلاق المتوقع
                </label>
                <input
                  id="opp_date"
                  name="expected_close_date"
                  type="date"
                  value={form.expected_close_date ?? ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setFormError(null) }}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStageFilter('')}
          className={[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            stageFilter === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          ].join(' ')}
        >
          الكل
        </button>
        {ALL_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={[
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              stageFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            ].join(' ')}
          >
            {OPP_STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل الفرص..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchOpportunities} />
      ) : opportunities.length === 0 ? (
        <EmptyState message="لا توجد فرص في هذه المرحلة" />
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-card border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{opp.title}</p>
                  {opp.client && (
                    <p className="text-xs text-muted-foreground">{opp.client.name}</p>
                  )}
                  {opp.value !== undefined && opp.value !== null && (
                    <p className="text-sm text-muted-foreground">
                      القيمة: {opp.value.toLocaleString('ar-SA')} ر.س
                    </p>
                  )}
                  {opp.expected_close_date && (
                    <p className="text-xs text-muted-foreground">
                      الإغلاق المتوقع: {opp.expected_close_date}
                    </p>
                  )}
                </div>
                <span
                  className={[
                    'text-xs px-2.5 py-1 rounded-full font-medium shrink-0',
                    OPP_STAGE_COLORS[opp.stage],
                  ].join(' ')}
                >
                  {OPP_STAGE_LABELS[opp.stage]}
                </span>
              </div>

              {/* Actions — only for open opportunities */}
              {opp.stage === 'open' && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleMarkWon(opp.id)}
                    disabled={actionLoading === opp.id}
                    className="text-xs px-3 py-1.5 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === opp.id ? '...' : '✓ تحديد كفوز'}
                  </button>
                  <button
                    onClick={() => { setLostModal({ id: opp.id }); setLostReason('') }}
                    disabled={actionLoading === opp.id}
                    className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    ✗ تحديد كخسارة
                  </button>
                  <button
                    onClick={() => handleStageChange(opp.id, 'cancelled')}
                    disabled={actionLoading === opp.id}
                    className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    إلغاء الفرصة
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lost reason modal */}
      {lostModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">سبب الخسارة</h3>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground" htmlFor="lost_reason">
                سبب الخسارة (اختياري)
              </label>
              <input
                id="lost_reason"
                type="text"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="أدخل سبب الخسارة..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setLostModal(null); setLostReason('') }}
                disabled={actionLoading !== null}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleMarkLost}
                disabled={actionLoading !== null}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {actionLoading !== null ? 'جارٍ التحديث...' : 'تأكيد الخسارة'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
