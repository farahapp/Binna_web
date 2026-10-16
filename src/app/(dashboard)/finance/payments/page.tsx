'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordPayment, type RecordPaymentPayload, type PaymentMethod, type PaymentType, type PartyType } from '@/lib/api/finance'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

export default function PaymentsPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    payment_number: '',
    payment_type: 'SUPPLIER' as PaymentType,
    payment_method: 'BANK_TRANSFER' as PaymentMethod,
    party_id: '',
    party_type: 'supplier' as PartyType,
    amount: '',
    payment_date: '',
    invoice_id: '',
    bank_account_id: '',
    reference: '',
    notes: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const updated = { ...prev, [name]: value }
      // Sync party_type with payment_type
      if (name === 'payment_type') {
        updated.party_type = value === 'SUPPLIER' ? 'supplier' : 'client'
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.payment_number.trim()) { setError('رقم الدفعة مطلوب'); return }
    if (!form.party_id.trim()) { setError('معرّف الطرف مطلوب'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('المبلغ يجب أن يكون أكبر من صفر'); return }
    if (!form.payment_date) { setError('تاريخ الدفع مطلوب'); return }

    setSubmitting(true)
    try {
      const payload: RecordPaymentPayload = {
        tenant_slug: TENANT_SLUG,
        payment_number: form.payment_number.trim(),
        payment_type: form.payment_type,
        payment_method: form.payment_method,
        party_id: form.party_id.trim(),
        party_type: form.party_type,
        amount: parseFloat(form.amount),
        payment_date: form.payment_date,
        invoice_id: form.invoice_id.trim() || undefined,
        bank_account_id: form.bank_account_id.trim() || undefined,
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      await recordPayment(payload)
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ??
            (err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message ??
            'حدث خطأ أثناء تسجيل الدفعة')
          : 'حدث خطأ أثناء تسجيل الدفعة'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <div className="text-4xl">✅</div>
        <p className="text-lg font-semibold text-foreground">تم تسجيل الدفعة بنجاح</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setSuccess(false); setForm({ payment_number: '', payment_type: 'SUPPLIER', payment_method: 'BANK_TRANSFER', party_id: '', party_type: 'supplier', amount: '', payment_date: '', invoice_id: '', bank_account_id: '', reference: '', notes: '' }) }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            تسجيل دفعة أخرى
          </button>
          <button
            onClick={() => router.push('/finance')}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            العودة للمالية
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">تسجيل دفعة</h1>
        <p className="text-muted-foreground text-sm mt-1">تسجيل دفعة لمورد أو عميل</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">بيانات الدفعة</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                رقم الدفعة <span className="text-destructive">*</span>
              </label>
              <input
                name="payment_number"
                value={form.payment_number}
                onChange={handleChange}
                placeholder="PAY-2024-001"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">نوع الدفعة</label>
              <select
                name="payment_type"
                value={form.payment_type}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="SUPPLIER">مورد</option>
                <option value="CLIENT">عميل</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">طريقة الدفع</label>
              <select
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="CASH">نقداً</option>
                <option value="CHEQUE">شيك</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                معرّف الطرف (UUID) <span className="text-destructive">*</span>
              </label>
              <input
                name="party_id"
                value={form.party_id}
                onChange={handleChange}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                المبلغ <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                min="0.0001"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                تاريخ الدفع <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="payment_date"
                value={form.payment_date}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">معرّف الفاتورة (UUID)</label>
              <input
                name="invoice_id"
                value={form.invoice_id}
                onChange={handleChange}
                placeholder="اختياري"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">معرّف الحساب البنكي (UUID)</label>
              <input
                name="bank_account_id"
                value={form.bank_account_id}
                onChange={handleChange}
                placeholder="اختياري"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">المرجع</label>
              <input
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="رقم مرجعي"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">ملاحظات</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="ملاحظات إضافية..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'جارٍ التسجيل...' : 'تسجيل الدفعة'}
          </button>
        </div>
      </form>
    </div>
  )
}
