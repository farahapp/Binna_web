'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  getContract,
  getContractValue,
  listVariations,
  signContract,
  submitContractForApproval,
  createVariation,
  type Contract,
  type ContractVariation,
  type CreateVariationPayload,
  extractMessage,
} from '@/lib/api/commercial'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_VARIATION_FORM: CreateVariationPayload = {
  contract_id: '',
  reason: '',
  variation_number: '',
  scope_description: '',
  value_change: undefined,
  notes: '',
}

export default function ContractDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [contractValue, setContractValue] = useState<unknown>(null)
  const [variations, setVariations] = useState<ContractVariation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sign state
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [signSuccess, setSignSuccess] = useState<string | null>(null)

  // Submit for approval state
  const [requestedBy, setRequestedBy] = useState('')
  const [submittingApproval, setSubmittingApproval] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null)

  // Variation form state
  const [showVariationForm, setShowVariationForm] = useState(false)
  const [variationForm, setVariationForm] = useState<CreateVariationPayload>({
    ...INITIAL_VARIATION_FORM,
    contract_id: id,
  })
  const [variationFormError, setVariationFormError] = useState<string | null>(null)
  const [variationSubmitting, setVariationSubmitting] = useState(false)
  const [variationSuccess, setVariationSuccess] = useState<string | null>(null)

  const fetchAll = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([getContract(id), getContractValue(id), listVariations(id)])
      .then(([c, cv, v]) => {
        setContract(c)
        setContractValue(cv)
        setVariations(v)
      })
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات العقد')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleSign() {
    setSigning(true)
    setSignError(null)
    setSignSuccess(null)
    try {
      const updated = await signContract(id)
      setContract(updated)
      setSignSuccess('تم توقيع العقد بنجاح')
    } catch (err: unknown) {
      setSignError(extractMessage(err, 'فشل توقيع العقد'))
    } finally {
      setSigning(false)
    }
  }

  async function handleSubmitForApproval() {
    if (!requestedBy.trim()) {
      setApprovalError('يرجى إدخال اسم مقدّم الطلب')
      return
    }
    setSubmittingApproval(true)
    setApprovalError(null)
    setApprovalSuccess(null)
    try {
      await submitContractForApproval(id, requestedBy.trim())
      setApprovalSuccess('تم إرسال العقد للموافقة بنجاح')
      setRequestedBy('')
    } catch (err: unknown) {
      setApprovalError(extractMessage(err, 'فشل إرسال العقد للموافقة'))
    } finally {
      setSubmittingApproval(false)
    }
  }

  function handleVariationFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setVariationForm((prev) => ({
      ...prev,
      [name]: name === 'value_change' ? (value ? parseFloat(value) : undefined) : value,
    }))
  }

  async function handleVariationSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVariationFormError(null)
    setVariationSuccess(null)

    if (!variationForm.reason.trim()) {
      setVariationFormError('سبب التعديل مطلوب')
      return
    }

    setVariationSubmitting(true)
    try {
      await createVariation({
        contract_id: id,
        reason: variationForm.reason.trim(),
        variation_number: variationForm.variation_number?.trim() || undefined,
        scope_description: variationForm.scope_description?.trim() || undefined,
        value_change: variationForm.value_change,
        notes: variationForm.notes?.trim() || undefined,
      })
      setVariationSuccess('تم إضافة التعديل بنجاح')
      setVariationForm({ ...INITIAL_VARIATION_FORM, contract_id: id })
      setShowVariationForm(false)
      fetchAll()
    } catch (err: unknown) {
      setVariationFormError(extractMessage(err, 'فشل إضافة التعديل'))
    } finally {
      setVariationSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات العقد..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchAll} />
  if (!contract) return <ErrorDisplay message="العقد غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          عقد: {contract.contract_number}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">تفاصيل العقد والتعديلات</p>
      </div>

      {/* Contract Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات العقد</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">رقم العقد: </span>
            <span className="text-foreground font-medium">{contract.contract_number}</span>
          </div>
          <div>
            <span className="text-muted-foreground">معرّف العميل: </span>
            <span className="text-foreground">{contract.client_id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">قيمة العقد: </span>
            <span className="text-foreground font-medium">
              {contract.contract_value.toLocaleString('ar-SA')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">الحالة: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs">
              {contract.status ?? '—'}
            </span>
          </div>
          {contract.start_date && (
            <div>
              <span className="text-muted-foreground">تاريخ البداية: </span>
              <span className="text-foreground">{contract.start_date}</span>
            </div>
          )}
          {contract.end_date && (
            <div>
              <span className="text-muted-foreground">تاريخ الانتهاء: </span>
              <span className="text-foreground">{contract.end_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contract Value Breakdown */}
      {contractValue !== null && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">تفاصيل القيمة المالية</h2>
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto text-foreground">
            {JSON.stringify(contractValue, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>

        {/* Sign */}
        <div className="space-y-2">
          {signError && <ErrorDisplay message={signError} />}
          {signSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {signSuccess}
            </div>
          )}
          <Button onClick={handleSign} disabled={signing} variant="outline">
            {signing ? 'جارٍ التوقيع...' : '✍️ توقيع العقد'}
          </Button>
        </div>

        {/* Submit for approval */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">إرسال للموافقة</p>
          {approvalError && <ErrorDisplay message={approvalError} />}
          {approvalSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {approvalSuccess}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="اسم مقدّم الطلب"
              className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1 min-w-[200px]"
            />
            <Button
              onClick={handleSubmitForApproval}
              disabled={submittingApproval}
              variant="outline"
            >
              {submittingApproval ? 'جارٍ الإرسال...' : '📤 إرسال للموافقة'}
            </Button>
          </div>
        </div>
      </div>

      {/* Variations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">التعديلات (Variations)</h2>
          <Button
            onClick={() => {
              setShowVariationForm((v) => !v)
              setVariationFormError(null)
              setVariationSuccess(null)
            }}
            size="sm"
          >
            {showVariationForm ? 'إلغاء' : 'إضافة تعديل'}
          </Button>
        </div>

        {variationSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {variationSuccess}
          </div>
        )}

        {/* Variation form */}
        {showVariationForm && (
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">إضافة تعديل جديد</h3>
            {variationFormError && <ErrorDisplay message={variationFormError} />}
            <form onSubmit={handleVariationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="reason">
                    السبب <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="reason"
                    name="reason"
                    type="text"
                    value={variationForm.reason}
                    onChange={handleVariationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="سبب التعديل"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="variation_number">
                    رقم التعديل
                  </label>
                  <input
                    id="variation_number"
                    name="variation_number"
                    type="text"
                    value={variationForm.variation_number}
                    onChange={handleVariationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="VAR-001"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="value_change">
                    تغيير القيمة
                  </label>
                  <input
                    id="value_change"
                    name="value_change"
                    type="number"
                    step="0.01"
                    value={variationForm.value_change ?? ''}
                    onChange={handleVariationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="scope_description">
                    وصف النطاق
                  </label>
                  <textarea
                    id="scope_description"
                    name="scope_description"
                    value={variationForm.scope_description}
                    onChange={handleVariationFormChange}
                    rows={2}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="وصف نطاق التعديل (اختياري)"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="notes">
                    ملاحظات
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={variationForm.notes}
                    onChange={handleVariationFormChange}
                    rows={2}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="ملاحظات إضافية (اختياري)"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowVariationForm(false)
                    setVariationFormError(null)
                  }}
                  disabled={variationSubmitting}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={variationSubmitting}>
                  {variationSubmitting ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Variations list */}
        {variations.length === 0 ? (
          <EmptyState message="لا توجد تعديلات على هذا العقد بعد" />
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">رقم التعديل</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">السبب</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">تغيير القيمة</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {variations.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground">{v.variation_number ?? `#${v.id}`}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.value_change != null ? v.value_change.toLocaleString('ar-SA') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                          {v.status ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {variations.map((v) => (
                <div key={v.id} className="p-4 space-y-1">
                  <p className="font-medium text-foreground">{v.variation_number ?? `#${v.id}`}</p>
                  <p className="text-sm text-muted-foreground">{v.reason}</p>
                  {v.value_change != null && (
                    <p className="text-sm text-muted-foreground">
                      تغيير القيمة: {v.value_change.toLocaleString('ar-SA')}
                    </p>
                  )}
                  <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                    {v.status ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
