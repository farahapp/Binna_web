'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, addInvoiceItem, type CreateInvoicePayload } from '@/lib/api/finance'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

export default function NewInvoicePage() {
  const router = useRouter()

  const [form, setForm] = useState<Omit<CreateInvoicePayload, 'tenant_slug'>>({
    invoice_number: '',
    client_id: '',
    invoice_date: '',
    project_id: '',
    contract_id: '',
    due_date: '',
    notes: '',
  })

  const [items, setItems] = useState<
    Array<{ description: string; quantity: string; unit_price: string; tax_rate: string }>
  >([{ description: '', quantity: '1', unit_price: '0', tax_rate: '0' }])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleItemChange(
    index: number,
    field: 'description' | 'quantity' | 'unit_price' | 'tax_rate',
    value: string
  ) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: '1', unit_price: '0', tax_rate: '0' },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.invoice_number.trim()) {
      setError('رقم الفاتورة مطلوب')
      return
    }
    if (!form.client_id.trim()) {
      setError('معرّف العميل مطلوب')
      return
    }
    if (!form.invoice_date) {
      setError('تاريخ الفاتورة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateInvoicePayload = {
        tenant_slug: TENANT_SLUG,
        invoice_number: form.invoice_number.trim(),
        client_id: form.client_id.trim(),
        invoice_date: form.invoice_date,
        project_id: form.project_id?.trim() || undefined,
        contract_id: form.contract_id?.trim() || undefined,
        due_date: form.due_date || undefined,
        notes: form.notes?.trim() || undefined,
      }

      const invoice = await createInvoice(payload)

      // Add items
      for (const item of items) {
        if (!item.description.trim()) continue
        await addInvoiceItem(invoice.id, {
          tenant_slug: TENANT_SLUG,
          description: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          tax_rate: parseFloat(item.tax_rate) / 100 || 0,
        })
      }

      router.push('/finance/invoices')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: string; message?: string } } }).response?.data
              ?.error ??
            (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
              ?.message ??
            'حدث خطأ أثناء إنشاء الفاتورة')
          : 'حدث خطأ أثناء إنشاء الفاتورة'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">فاتورة جديدة</h1>
        <p className="text-muted-foreground text-sm mt-1">إنشاء فاتورة عميل جديدة</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Invoice Details */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">بيانات الفاتورة</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                رقم الفاتورة <span className="text-destructive">*</span>
              </label>
              <input
                name="invoice_number"
                value={form.invoice_number}
                onChange={handleChange}
                placeholder="INV-2024-001"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                معرّف العميل (UUID) <span className="text-destructive">*</span>
              </label>
              <input
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                تاريخ الفاتورة <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="invoice_date"
                value={form.invoice_date}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">تاريخ الاستحقاق</label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">معرّف المشروع (UUID)</label>
              <input
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
                placeholder="اختياري"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">معرّف العقد (UUID)</label>
              <input
                name="contract_id"
                value={form.contract_id}
                onChange={handleChange}
                placeholder="اختياري"
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

        {/* Invoice Items */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">بنود الفاتورة</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-primary hover:underline"
            >
              + إضافة بند
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-md"
              >
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground">الوصف</label>
                  <input
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="وصف البند"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">الكمية</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">سعر الوحدة</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">الضريبة %</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.tax_rate}
                      onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="ltr"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive/80 text-sm px-2"
                        aria-label="حذف البند"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
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
            {submitting ? 'جارٍ الإنشاء...' : 'إنشاء الفاتورة'}
          </button>
        </div>
      </form>
    </div>
  )
}
