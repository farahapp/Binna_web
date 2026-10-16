'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getLeads,
  createLead,
  updateLeadStage,
  getClients,
  type Lead,
  type LeadStage,
  type CrmClient,
  type CreateLeadPayload,
  extractMessage,
} from '@/lib/api/crm'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  converted: 'محوّل',
  lost: 'خسارة',
}

const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  converted: 'bg-purple-100 text-purple-700',
  lost: 'bg-red-100 text-red-700',
}

const ALL_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

const INITIAL_FORM: CreateLeadPayload = {
  client_id: 0,
  title: '',
  description: '',
  source: '',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('')

  // Clients for the create form
  const [clients, setClients] = useState<CrmClient[]>([])

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateLeadPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Stage update
  const [updatingStage, setUpdatingStage] = useState<number | null>(null)

  const fetchLeads = useCallback(() => {
    setLoading(true)
    setError(null)
    getLeads(stageFilter || undefined)
      .then(setLeads)
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل العملاء المحتملين')))
      .finally(() => setLoading(false))
  }, [stageFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => {/* non-critical */})
  }, [])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'client_id' ? Number(value) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.title.trim()) {
      setFormError('عنوان العميل المحتمل مطلوب')
      return
    }
    if (!form.client_id) {
      setFormError('يرجى اختيار العميل')
      return
    }

    setSubmitting(true)
    try {
      await createLead({
        client_id: form.client_id,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        source: form.source?.trim() || undefined,
      })
      setSuccessMsg('تم إضافة العميل المحتمل بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchLeads()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إضافة العميل المحتمل'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStageChange(leadId: number, newStage: LeadStage) {
    setUpdatingStage(leadId)
    try {
      const updated = await updateLeadStage(leadId, newStage)
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: updated.stage } : l)))
    } catch (err: unknown) {
      alert(extractMessage(err, 'فشل تحديث المرحلة'))
    } finally {
      setUpdatingStage(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العملاء المحتملون</h1>
          <p className="text-muted-foreground text-sm mt-1">تتبع ومتابعة العملاء المحتملين</p>
        </div>
        <Button onClick={() => { setShowForm((v) => !v); setFormError(null); setSuccessMsg(null) }}>
          {showForm ? 'إلغاء' : 'إضافة عميل محتمل'}
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
          <h2 className="text-base font-semibold text-foreground">إضافة عميل محتمل جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="client_id">
                  العميل <span className="text-destructive">*</span>
                </label>
                <select
                  id="client_id"
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
                <label className="text-sm font-medium text-foreground" htmlFor="title">
                  العنوان <span className="text-destructive">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="عنوان العميل المحتمل"
                  required
                />
              </div>

              {/* Source */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="source">
                  المصدر
                </label>
                <input
                  id="source"
                  name="source"
                  type="text"
                  value={form.source}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="مثال: موقع الويب، إحالة..."
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
                  placeholder="وصف مختصر (اختياري)"
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
            {LEAD_STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل العملاء المحتملين..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchLeads} />
      ) : leads.length === 0 ? (
        <EmptyState message="لا يوجد عملاء محتملون في هذه المرحلة" />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-card border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{lead.title}</p>
                  {lead.client && (
                    <p className="text-xs text-muted-foreground">{lead.client.name}</p>
                  )}
                  {lead.source && (
                    <p className="text-xs text-muted-foreground">المصدر: {lead.source}</p>
                  )}
                  {lead.description && (
                    <p className="text-sm text-muted-foreground mt-1">{lead.description}</p>
                  )}
                </div>
                <span
                  className={[
                    'text-xs px-2.5 py-1 rounded-full font-medium shrink-0',
                    LEAD_STAGE_COLORS[lead.stage],
                  ].join(' ')}
                >
                  {LEAD_STAGE_LABELS[lead.stage]}
                </span>
              </div>

              {/* Stage update */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">تغيير المرحلة:</span>
                {ALL_STAGES.filter((s) => s !== lead.stage).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStageChange(lead.id, s)}
                    disabled={updatingStage === lead.id}
                    className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {updatingStage === lead.id ? '...' : LEAD_STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
