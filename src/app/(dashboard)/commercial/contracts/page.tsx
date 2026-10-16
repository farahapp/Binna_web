'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listContracts,
  createContract,
  type Contract,
  type CreateContractPayload,
  extractMessage,
} from '@/lib/api/commercial'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_FORM: CreateContractPayload = {
  contract_number: '',
  client_id: '',
  contract_value: 0,
  start_date: '',
  end_date: '',
}

export default function ContractsPage() {
  // List state
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateContractPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [createdContract, setCreatedContract] = useState<{ id: number; contract_number: string } | null>(null)

  const fetchContracts = useCallback(() => {
    setLoading(true)
    setListError(null)
    listContracts(page)
      .then((res) => {
        setContracts(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) => setListError(extractMessage(err, 'فشل تحميل قائمة العقود')))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'contract_value' ? parseFloat(value) || 0 : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)
    setCreatedContract(null)

    if (!form.contract_number.trim()) {
      setFormError('رقم العقد مطلوب')
      return
    }
    if (!form.client_id.trim()) {
      setFormError('معرّف العميل مطلوب')
      return
    }
    if (!form.contract_value || form.contract_value <= 0) {
      setFormError('قيمة العقد يجب أن تكون أكبر من صفر')
      return
    }

    setSubmitting(true)
    try {
      const contract = await createContract({
        contract_number: form.contract_number.trim(),
        client_id: form.client_id.trim(),
        contract_value: form.contract_value,
        start_date: form.start_date?.trim() || undefined,
        end_date: form.end_date?.trim() || undefined,
      })
      setSuccessMsg('تم إنشاء العقد بنجاح')
      setCreatedContract({ id: contract.id, contract_number: contract.contract_number })
      setForm(INITIAL_FORM)
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء العقد'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العقود</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة العقود التجارية</p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة عقد'}
        </Button>
      </div>

      {/* Contracts list */}
      {loading && <LoadingSpinner />}
      {listError && <ErrorDisplay message={listError} />}
      {!loading && !listError && contracts.length === 0 && (
        <EmptyState message="لا توجد عقود بعد. أضف عقداً جديداً للبدء." />
      )}
      {!loading && contracts.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">رقم العقد</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">قيمة العقد</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">تاريخ البداية</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{c.contract_number}</td>
                  <td className="px-4 py-3 text-foreground">
                    {Number(c.contract_value).toLocaleString('ar-SA')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      {c.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString('ar-SA') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/commercial/contracts/${c.id}`}
                      className="text-primary text-xs hover:underline"
                    >
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {lastPage}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
              >
                التالي
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 space-y-1">
          <p>{successMsg}</p>
          {createdContract && (
            <p>
              رقم العقد:{' '}
              <a
                href={`/commercial/contracts/${createdContract.id}`}
                className="text-primary underline"
              >
                {createdContract.contract_number}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة عقد جديد</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Contract Number */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="contract_number">
                  رقم العقد <span className="text-destructive">*</span>
                </label>
                <input
                  id="contract_number"
                  name="contract_number"
                  type="text"
                  value={form.contract_number}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="CNT-2024-001"
                  required
                />
              </div>

              {/* Client ID */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="client_id">
                  معرّف العميل <span className="text-destructive">*</span>
                </label>
                <input
                  id="client_id"
                  name="client_id"
                  type="text"
                  value={form.client_id}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="معرّف العميل"
                  required
                />
              </div>

              {/* Contract Value */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="contract_value">
                  قيمة العقد <span className="text-destructive">*</span>
                </label>
                <input
                  id="contract_value"
                  name="contract_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contract_value || ''}
                  onChange={handleFormChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                  required
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
                {submitting ? 'جارٍ الحفظ...' : 'حفظ العقد'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
