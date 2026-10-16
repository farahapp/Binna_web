'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { issueInvoice } from '@/lib/api/finance'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

export default function IssueInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleIssue() {
    setSubmitting(true)
    setError(null)
    try {
      await issueInvoice(invoiceId, TENANT_SLUG)
      setSuccess(true)
      setTimeout(() => router.push('/finance/invoices'), 1500)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: string; message?: string } } }).response?.data
              ?.error ??
            (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
              ?.message ??
            'حدث خطأ أثناء إصدار الفاتورة')
          : 'حدث خطأ أثناء إصدار الفاتورة'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <div className="text-4xl">✅</div>
        <p className="text-lg font-semibold text-foreground">تم إصدار الفاتورة بنجاح</p>
        <p className="text-sm text-muted-foreground">جارٍ التحويل...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إصدار الفاتورة</h1>
        <p className="text-muted-foreground text-sm mt-1">
          تأكيد إصدار الفاتورة وتحويلها من مسودة إلى صادرة
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <p className="text-sm text-foreground">
          هل أنت متأكد من إصدار الفاتورة{' '}
          <span className="font-mono text-primary" dir="ltr">
            {invoiceId}
          </span>
          ؟
        </p>
        <p className="text-sm text-muted-foreground">
          بعد الإصدار، لن يمكن تعديل الفاتورة. تأكد من صحة جميع البيانات والبنود قبل المتابعة.
        </p>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleIssue}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'جارٍ الإصدار...' : 'تأكيد الإصدار'}
          </button>
        </div>
      </div>
    </div>
  )
}
