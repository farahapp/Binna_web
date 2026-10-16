'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listInvoices, getInvoice, type Invoice } from '@/lib/api/finance'

const statusLabel: Record<string, string> = {
  DRAFT: 'مسودة',
  ISSUED: 'صادرة',
  PAID: 'مدفوعة',
  PARTIALLY_PAID: 'مدفوعة جزئياً',
  CANCELLED: 'ملغاة',
  draft: 'مسودة',
  issued: 'صادرة',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
}

const statusColor: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  ISSUED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
  draft: 'bg-yellow-100 text-yellow-800',
  issued: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [invoiceId, setInvoiceId] = useState('')
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  function extractError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
      const r = (err as { response?: { data?: { error?: string; message?: string } } }).response
      return r?.data?.error ?? r?.data?.message ?? fallback
    }
    return fallback
  }

  async function loadList() {
    setListLoading(true)
    setListError(null)
    try {
      const data = await listInvoices()
      setInvoices(data)
    } catch (err) {
      setListError(extractError(err, 'حدث خطأ أثناء تحميل الفواتير'))
    } finally {
      setListLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList() }, [])

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!invoiceId.trim()) return
    setLookupLoading(true)
    setLookupError(null)
    setInvoice(null)
    try {
      const data = await getInvoice(invoiceId.trim())
      setInvoice(data)
    } catch (err) {
      setLookupError(extractError(err, 'فاتورة غير موجودة'))
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الفواتير</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وعرض فواتير العملاء</p>
        </div>
        <Link
          href="/finance/invoices/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + فاتورة جديدة
        </Link>
      </div>

      {/* Invoice List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">قائمة الفواتير</h2>
          <button
            onClick={loadList}
            disabled={listLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {listLoading ? 'جارٍ التحميل...' : '🔄 تحديث'}
          </button>
        </div>

        {listLoading && (
          <div className="p-8 text-center text-muted-foreground text-sm">جارٍ تحميل الفواتير...</div>
        )}

        {!listLoading && listError && (
          <div className="p-4 text-sm text-destructive bg-destructive/5">{listError}</div>
        )}

        {!listLoading && !listError && invoices.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <div className="text-3xl">🧾</div>
            <p className="text-muted-foreground text-sm">لا توجد فواتير مسجلة</p>
          </div>
        )}

        {!listLoading && !listError && invoices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-muted-foreground">
                  <th className="text-right py-3 px-4">رقم الفاتورة</th>
                  <th className="text-right py-3 px-4">التاريخ</th>
                  <th className="text-right py-3 px-4">الاستحقاق</th>
                  <th className="text-right py-3 px-4">الإجمالي</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-foreground">{String(inv.invoice_date)}</td>
                    <td className="py-3 px-4 text-foreground">{inv.due_date ? String(inv.due_date) : '—'}</td>
                    <td className="py-3 px-4 text-foreground">
                      {inv.total_amount !== undefined
                        ? Number(inv.total_amount).toLocaleString('ar-QA')
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColor[inv.status] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {statusLabel[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {(inv.status === 'DRAFT' || inv.status === 'draft') && (
                        <Link
                          href={`/finance/invoices/${inv.id}/issue`}
                          className="text-primary text-xs hover:underline"
                        >
                          إصدار
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lookup by ID */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">البحث عن فاتورة بالمعرّف</h2>
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            placeholder="أدخل معرّف الفاتورة (UUID)"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={lookupLoading || !invoiceId.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lookupLoading ? 'جارٍ البحث...' : 'بحث'}
          </button>
        </form>

        {lookupError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {lookupError}
          </div>
        )}

        {invoice && (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-foreground">فاتورة رقم: {invoice.invoice_number}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[invoice.status] ?? 'bg-muted text-muted-foreground'}`}>
                {statusLabel[invoice.status] ?? invoice.status}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">تاريخ الفاتورة: </span><span className="text-foreground">{String(invoice.invoice_date)}</span></div>
              {invoice.due_date && <div><span className="text-muted-foreground">تاريخ الاستحقاق: </span><span className="text-foreground">{String(invoice.due_date)}</span></div>}
              {invoice.total_amount !== undefined && <div><span className="text-muted-foreground">الإجمالي: </span><span className="text-foreground font-medium">{Number(invoice.total_amount).toLocaleString('ar-QA')} ر.ق</span></div>}
            </div>
            {(invoice.status === 'DRAFT' || invoice.status === 'draft') && (
              <Link href={`/finance/invoices/${invoice.id}/issue`} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                إصدار الفاتورة
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
