'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  getQuotation,
  acceptQuotation,
  submitQuotationForApproval,
  type Quotation,
  extractMessage,
} from '@/lib/api/commercial'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

export default function QuotationDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Accept state
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null)

  // Submit for approval state
  const [requestedBy, setRequestedBy] = useState('')
  const [submittingApproval, setSubmittingApproval] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null)

  const fetchQuotation = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getQuotation(id)
      .then(setQuotation)
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات عرض السعر')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchQuotation()
  }, [fetchQuotation])

  async function handleAccept() {
    setAccepting(true)
    setAcceptError(null)
    setAcceptSuccess(null)
    try {
      const updated = await acceptQuotation(id)
      setQuotation(updated)
      setAcceptSuccess('تم قبول عرض السعر بنجاح')
    } catch (err: unknown) {
      setAcceptError(extractMessage(err, 'فشل قبول عرض السعر'))
    } finally {
      setAccepting(false)
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
      await submitQuotationForApproval(id, requestedBy.trim())
      setApprovalSuccess('تم إرسال عرض السعر للموافقة بنجاح')
      setRequestedBy('')
    } catch (err: unknown) {
      setApprovalError(extractMessage(err, 'فشل إرسال عرض السعر للموافقة'))
    } finally {
      setSubmittingApproval(false)
    }
  }

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات عرض السعر..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchQuotation} />
  if (!quotation) return <ErrorDisplay message="عرض السعر غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          عرض السعر: {quotation.quotation_number}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">تفاصيل عرض السعر</p>
      </div>

      {/* Quotation Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات عرض السعر</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">رقم عرض السعر: </span>
            <span className="text-foreground font-medium">{quotation.quotation_number}</span>
          </div>
          <div>
            <span className="text-muted-foreground">معرّف العميل: </span>
            <span className="text-foreground">{quotation.client_id}</span>
          </div>
          {quotation.title && (
            <div>
              <span className="text-muted-foreground">العنوان: </span>
              <span className="text-foreground">{quotation.title}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">الحالة: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs">
              {quotation.status ?? '—'}
            </span>
          </div>
          {quotation.total_value != null && (
            <div>
              <span className="text-muted-foreground">القيمة الإجمالية: </span>
              <span className="text-foreground font-medium">
                {quotation.total_value.toLocaleString('ar-SA')}
              </span>
            </div>
          )}
          {quotation.tender_id && (
            <div>
              <span className="text-muted-foreground">معرّف المناقصة: </span>
              <span className="text-foreground">{quotation.tender_id}</span>
            </div>
          )}
          {quotation.boq_id && (
            <div>
              <span className="text-muted-foreground">معرّف BOQ: </span>
              <span className="text-foreground">{quotation.boq_id}</span>
            </div>
          )}
          {quotation.quotation_date && (
            <div>
              <span className="text-muted-foreground">تاريخ عرض السعر: </span>
              <span className="text-foreground">{quotation.quotation_date}</span>
            </div>
          )}
          {quotation.validity_date && (
            <div>
              <span className="text-muted-foreground">تاريخ انتهاء الصلاحية: </span>
              <span className="text-foreground">{quotation.validity_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>

        {/* Accept */}
        <div className="space-y-2">
          {acceptError && <ErrorDisplay message={acceptError} />}
          {acceptSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {acceptSuccess}
            </div>
          )}
          <Button onClick={handleAccept} disabled={accepting} variant="outline">
            {accepting ? 'جارٍ القبول...' : '✅ قبول عرض السعر'}
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
    </div>
  )
}
