'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getRFQ,
  sendRFQ,
  closeRFQ,
  submitRFQQuotation,
  compareRFQQuotations,
  selectRFQQuotation,
  type RFQ,
  type CreateSupplierQuotationPayload,
  extractMessage,
} from '@/lib/api/procurement'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const INITIAL_QUOTATION_FORM: CreateSupplierQuotationPayload = {
  supplier_id: '',
  total_amount: 0,
  currency: '',
  notes: '',
  valid_until: '',
}

export default function RFQDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Quotation form
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  const [quotationForm, setQuotationForm] = useState<CreateSupplierQuotationPayload>(
    INITIAL_QUOTATION_FORM
  )
  const [quotationFormError, setQuotationFormError] = useState<string | null>(null)
  const [quotationSubmitting, setQuotationSubmitting] = useState(false)
  const [quotationSuccess, setQuotationSuccess] = useState<string | null>(null)

  // Compare quotations
  const [compareResult, setCompareResult] = useState<unknown>(null)
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)

  // Select quotation
  const [selectQuotationId, setSelectQuotationId] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [selectError, setSelectError] = useState<string | null>(null)
  const [selectSuccess, setSelectSuccess] = useState<string | null>(null)

  const fetchRFQ = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getRFQ(id)
      .then((data) => setRfq(data))
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات طلب عرض السعر')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchRFQ()
  }, [fetchRFQ])

  async function handleAction(
    action: 'send' | 'close',
    fn: (id: string) => Promise<RFQ>,
    successText: string
  ) {
    setActionLoading(action)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await fn(id)
      setRfq(updated)
      setActionSuccess(successText)
    } catch (err: unknown) {
      setActionError(extractMessage(err, 'فشل تنفيذ الإجراء'))
    } finally {
      setActionLoading(null)
    }
  }

  function handleQuotationFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setQuotationForm((prev) => ({
      ...prev,
      [name]: name === 'total_amount' ? (value ? parseFloat(value) : 0) : value,
    }))
  }

  async function handleQuotationSubmit(e: React.FormEvent) {
    e.preventDefault()
    setQuotationFormError(null)
    setQuotationSuccess(null)

    if (!quotationForm.supplier_id.trim()) {
      setQuotationFormError('معرّف المورد مطلوب')
      return
    }
    if (!quotationForm.total_amount || quotationForm.total_amount <= 0) {
      setQuotationFormError('المبلغ الإجمالي مطلوب ويجب أن يكون أكبر من صفر')
      return
    }

    setQuotationSubmitting(true)
    try {
      await submitRFQQuotation(id, {
        supplier_id: quotationForm.supplier_id.trim(),
        total_amount: quotationForm.total_amount,
        currency: quotationForm.currency?.trim() || undefined,
        notes: quotationForm.notes?.trim() || undefined,
        valid_until: quotationForm.valid_until?.trim() || undefined,
      })
      setQuotationSuccess('تم إضافة عرض السعر بنجاح')
      setQuotationForm(INITIAL_QUOTATION_FORM)
      setShowQuotationForm(false)
    } catch (err: unknown) {
      setQuotationFormError(extractMessage(err, 'فشل إضافة عرض السعر'))
    } finally {
      setQuotationSubmitting(false)
    }
  }

  async function handleCompare() {
    setComparing(true)
    setCompareError(null)
    setCompareResult(null)
    try {
      const result = await compareRFQQuotations(id)
      setCompareResult(result)
    } catch (err: unknown) {
      setCompareError(extractMessage(err, 'فشل مقارنة العروض'))
    } finally {
      setComparing(false)
    }
  }

  async function handleSelectQuotation(e: React.FormEvent) {
    e.preventDefault()
    if (!selectQuotationId.trim()) {
      setSelectError('معرّف العرض مطلوب')
      return
    }
    setSelecting(true)
    setSelectError(null)
    setSelectSuccess(null)
    try {
      await selectRFQQuotation(id, selectQuotationId.trim())
      setSelectSuccess('تم اختيار العرض بنجاح')
      setSelectQuotationId('')
    } catch (err: unknown) {
      setSelectError(extractMessage(err, 'فشل اختيار العرض'))
    } finally {
      setSelecting(false)
    }
  }

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات طلب عرض السعر..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchRFQ} />
  if (!rfq) return <ErrorDisplay message="طلب عرض السعر غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/procurement/rfqs" className="hover:text-primary">
              طلبات عروض الأسعار
            </Link>
            <span>/</span>
            <span>{rfq.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{rfq.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">تفاصيل طلب عرض السعر وعروض الموردين</p>
        </div>
        <span className="inline-block bg-muted px-3 py-1 rounded-full text-sm text-foreground">
          {rfq.status ?? '—'}
        </span>
      </div>

      {/* Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات الطلب</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">المعرّف: </span>
            <span className="text-foreground font-mono text-xs">{rfq.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">الحالة: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-foreground">
              {rfq.status ?? '—'}
            </span>
          </div>
          {rfq.purchase_request_id && (
            <div>
              <span className="text-muted-foreground">طلب الشراء: </span>
              <Link
                href={`/procurement/purchase-requests/${rfq.purchase_request_id}`}
                className="text-primary hover:underline font-mono text-xs"
              >
                {rfq.purchase_request_id.slice(0, 8)}…
              </Link>
            </div>
          )}
          {rfq.deadline && (
            <div>
              <span className="text-muted-foreground">الموعد النهائي: </span>
              <span className="text-foreground">{rfq.deadline}</span>
            </div>
          )}
          {rfq.created_at && (
            <div>
              <span className="text-muted-foreground">تاريخ الإنشاء: </span>
              <span className="text-foreground">
                {new Date(rfq.created_at).toLocaleDateString('ar-SA')}
              </span>
            </div>
          )}
          {rfq.description && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">الوصف: </span>
              <span className="text-foreground">{rfq.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions: Send / Close */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>

        {actionError && <ErrorDisplay message={actionError} />}
        {actionSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {actionSuccess}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Send */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('send', sendRFQ, 'تم إرسال الطلب للموردين بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'send' ? 'جارٍ الإرسال...' : '📤 إرسال للموردين'}
          </Button>

          {/* Close */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('close', closeRFQ, 'تم إغلاق الطلب بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'close' ? 'جارٍ الإغلاق...' : '🔒 إغلاق'}
          </Button>
        </div>
      </div>

      {/* Supplier Quotations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">عروض أسعار الموردين</h2>
          <Button
            size="sm"
            onClick={() => {
              setShowQuotationForm((v) => !v)
              setQuotationFormError(null)
              setQuotationSuccess(null)
            }}
          >
            {showQuotationForm ? 'إلغاء' : 'إضافة عرض سعر'}
          </Button>
        </div>

        {quotationSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {quotationSuccess}
          </div>
        )}

        {showQuotationForm && (
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">إضافة عرض سعر مورد</h3>
            {quotationFormError && <ErrorDisplay message={quotationFormError} />}
            <form onSubmit={handleQuotationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier ID */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="q_supplier_id">
                    معرّف المورد <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="q_supplier_id"
                    name="supplier_id"
                    type="text"
                    value={quotationForm.supplier_id}
                    onChange={handleQuotationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="UUID المورد"
                    required
                  />
                </div>

                {/* Total Amount */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="q_total_amount">
                    المبلغ الإجمالي <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="q_total_amount"
                    name="total_amount"
                    type="number"
                    step="0.01"
                    value={quotationForm.total_amount || ''}
                    onChange={handleQuotationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="q_currency">
                    العملة
                  </label>
                  <input
                    id="q_currency"
                    name="currency"
                    type="text"
                    value={quotationForm.currency}
                    onChange={handleQuotationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="SAR"
                  />
                </div>

                {/* Valid Until */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="q_valid_until">
                    صالح حتى
                  </label>
                  <input
                    id="q_valid_until"
                    name="valid_until"
                    type="date"
                    value={quotationForm.valid_until}
                    onChange={handleQuotationFormChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="q_notes">
                    ملاحظات
                  </label>
                  <textarea
                    id="q_notes"
                    name="notes"
                    value={quotationForm.notes}
                    onChange={handleQuotationFormChange}
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
                    setShowQuotationForm(false)
                    setQuotationFormError(null)
                  }}
                  disabled={quotationSubmitting}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={quotationSubmitting}>
                  {quotationSubmitting ? 'جارٍ الحفظ...' : 'إضافة العرض'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Compare Quotations */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">مقارنة العروض</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompare}
            disabled={comparing}
          >
            {comparing ? 'جارٍ المقارنة...' : '📊 مقارنة العروض'}
          </Button>
        </div>

        {compareError && <ErrorDisplay message={compareError} />}

        {compareResult !== null && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">نتيجة المقارنة:</p>
            <pre className="text-xs bg-muted rounded p-3 overflow-x-auto text-foreground">
              {JSON.stringify(compareResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Select Quotation */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">اختيار عرض سعر</h2>

        {selectError && <ErrorDisplay message={selectError} />}
        {selectSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {selectSuccess}
          </div>
        )}

        <form onSubmit={handleSelectQuotation} className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={selectQuotationId}
            onChange={(e) => setSelectQuotationId(e.target.value)}
            placeholder="معرّف العرض (UUID)"
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 flex-1 min-w-[200px]"
          />
          <Button type="submit" disabled={selecting} variant="outline">
            {selecting ? 'جارٍ الاختيار...' : '✅ اختيار العرض'}
          </Button>
        </form>
      </div>
    </div>
  )
}
