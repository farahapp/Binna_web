'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  getClients,
  createClient,
  type CrmClient,
  type ClientType,
  type CreateClientPayload,
  extractMessage,
} from '@/lib/api/crm'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: 'شركة',
  individual: 'فرد',
}

const INITIAL_FORM: CreateClientPayload = {
  name: '',
  type: 'company',
  trade_name: '',
  email: '',
  phone: '',
  country: '',
  city: '',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateClientPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchClients = useCallback(() => {
    setLoading(true)
    setError(null)
    getClients()
      .then(setClients)
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل قائمة العملاء')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.name.trim()) {
      setFormError('اسم العميل مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await createClient({
        name: form.name.trim(),
        type: form.type,
        trade_name: form.trade_name?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        country: form.country?.trim() || undefined,
        city: form.city?.trim() || undefined,
      })
      setSuccessMsg('تم إضافة العميل بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchClients()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إضافة العميل'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">قائمة جميع العملاء المسجلين</p>
        </div>
        <Button onClick={() => { setShowForm((v) => !v); setFormError(null); setSuccessMsg(null) }}>
          {showForm ? 'إلغاء' : 'إضافة عميل'}
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
          <h2 className="text-base font-semibold text-foreground">إضافة عميل جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="name">
                  الاسم <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="اسم العميل"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="type">
                  النوع
                </label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="company">شركة</option>
                  <option value="individual">فرد</option>
                </select>
              </div>

              {/* Trade name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="trade_name">
                  الاسم التجاري
                </label>
                <input
                  id="trade_name"
                  name="trade_name"
                  type="text"
                  value={form.trade_name}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="الاسم التجاري (اختياري)"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="example@domain.com"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="phone">
                  رقم الهاتف
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="+966 5x xxx xxxx"
                />
              </div>

              {/* Country */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="country">
                  الدولة
                </label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={form.country}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="المملكة العربية السعودية"
                />
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="city">
                  المدينة
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="الرياض"
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
                {submitting ? 'جارٍ الحفظ...' : 'حفظ العميل'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل العملاء..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchClients} />
      ) : clients.length === 0 ? (
        <EmptyState message="لا يوجد عملاء مسجلون بعد" />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">الاسم</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">النوع</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">البريد الإلكتروني</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">الهاتف</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">المدينة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {client.name}
                      {client.trade_name && (
                        <span className="block text-xs text-muted-foreground">{client.trade_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {CLIENT_TYPE_LABELS[client.type]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{client.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client.city ?? '—'}</td>
                    <td className="px-4 py-3 text-left">
                      <Link
                        href={`/crm/clients/${client.id}`}
                        className="text-primary text-xs hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {clients.map((client) => (
              <div key={client.id} className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    {client.trade_name && (
                      <p className="text-xs text-muted-foreground">{client.trade_name}</p>
                    )}
                  </div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                    {CLIENT_TYPE_LABELS[client.type]}
                  </span>
                </div>
                {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
                {client.city && <p className="text-sm text-muted-foreground">{client.city}</p>}
                <Link
                  href={`/crm/clients/${client.id}`}
                  className="inline-block text-primary text-sm hover:underline mt-1"
                >
                  عرض التفاصيل
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
