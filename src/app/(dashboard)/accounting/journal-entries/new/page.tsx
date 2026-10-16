'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createJournalEntry, extractApiError } from '@/lib/api/accounting'
import type { CreateJournalEntryPayload, JournalLineInput } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

interface LineForm {
  account_id: string
  debit: string
  credit: string
  description: string
  project_id: string
  cost_code_id: string
}

const emptyLine = (): LineForm => ({
  account_id: '',
  debit: '',
  credit: '',
  description: '',
  project_id: '',
  cost_code_id: '',
})

export default function NewJournalEntryPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    reference: '',
    posting_date: '',
    period_id: '',
    narration: '',
    source_module: '',
    source_document_id: '',
    source_document_type: '',
  })

  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleLineChange(
    index: number,
    field: keyof LineForm,
    value: string,
  ) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function validateBalance(): boolean {
    let totalDebit = 0
    let totalCredit = 0
    for (const l of lines) {
      totalDebit += parseFloat(l.debit) || 0
      totalCredit += parseFloat(l.credit) || 0
    }
    return Math.abs(totalDebit - totalCredit) < 0.001
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.reference.trim()) {
      setError('المرجع مطلوب')
      return
    }
    if (!form.posting_date) {
      setError('تاريخ الترحيل مطلوب')
      return
    }
    if (!form.period_id.trim()) {
      setError('معرّف الفترة المحاسبية مطلوب')
      return
    }

    const validLines = lines.filter((l) => l.account_id.trim())
    if (validLines.length < 2) {
      setError('يجب وجود سطرين على الأقل في القيد')
      return
    }

    if (!validateBalance()) {
      setError('القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateJournalEntryPayload = {
        tenant_slug: TENANT_SLUG,
        reference: form.reference.trim(),
        posting_date: form.posting_date,
        period_id: form.period_id.trim(),
        narration: form.narration.trim() || undefined,
        source_module: form.source_module.trim() || undefined,
        source_document_id: form.source_document_id.trim() || undefined,
        source_document_type: form.source_document_type.trim() || undefined,
        lines: validLines.map(
          (l): JournalLineInput => ({
            account_id: l.account_id.trim(),
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            description: l.description.trim() || undefined,
            project_id: l.project_id.trim() || undefined,
            cost_code_id: l.cost_code_id.trim() || undefined,
          }),
        ),
      }

      const entry = await createJournalEntry(payload)
      router.push(`/accounting/journal-entries/${entry.id}`)
    } catch (err) {
      setError(extractApiError(err, 'حدث خطأ أثناء إنشاء القيد'))
    } finally {
      setSubmitting(false)
    }
  }

  // Live balance
  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">قيد يومية جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">إنشاء قيد يومية محاسبي متوازن</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">بيانات القيد</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                المرجع <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="مثال: JE-2024-001"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                تاريخ الترحيل <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                name="posting_date"
                value={form.posting_date}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                الفترة المحاسبية (UUID) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="period_id"
                value={form.period_id}
                onChange={handleChange}
                placeholder="UUID الفترة"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                البيان (اختياري)
              </label>
              <input
                type="text"
                name="narration"
                value={form.narration}
                onChange={handleChange}
                placeholder="وصف القيد"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                الوحدة المصدر (اختياري)
              </label>
              <input
                type="text"
                name="source_module"
                value={form.source_module}
                onChange={handleChange}
                placeholder="مثال: finance، procurement"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                نوع المستند المصدر (اختياري)
              </label>
              <input
                type="text"
                name="source_document_type"
                value={form.source_document_type}
                onChange={handleChange}
                placeholder="مثال: invoice، payment"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                معرّف المستند المصدر (UUID، اختياري)
              </label>
              <input
                type="text"
                name="source_document_id"
                value={form.source_document_id}
                onChange={handleChange}
                placeholder="UUID المستند"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">سطور القيد</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-primary hover:underline"
            >
              + إضافة سطر
            </button>
          </div>

          {/* Balance indicator */}
          <div
            className={`text-sm px-3 py-2 rounded-md ${
              balanced
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            }`}
          >
            <span className="font-medium">إجمالي المدين:</span>{' '}
            {totalDebit.toLocaleString('ar-SA')} |{' '}
            <span className="font-medium">إجمالي الدائن:</span>{' '}
            {totalCredit.toLocaleString('ar-SA')} |{' '}
            {balanced ? '✅ القيد متوازن' : '⚠️ القيد غير متوازن'}
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div
                key={index}
                className="border border-border rounded-md p-4 space-y-3 relative"
              >
                <div className="absolute top-2 start-2 text-xs text-muted-foreground font-medium">
                  سطر {index + 1}
                </div>
                {lines.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="absolute top-2 end-2 text-xs text-destructive hover:underline"
                  >
                    حذف
                  </button>
                )}
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      الحساب (UUID) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={line.account_id}
                      onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                      placeholder="UUID الحساب"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">مدين</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">دائن</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">البيان</label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                      placeholder="وصف السطر"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      المشروع (UUID، اختياري)
                    </label>
                    <input
                      type="text"
                      value={line.project_id}
                      onChange={(e) => handleLineChange(index, 'project_id', e.target.value)}
                      placeholder="UUID المشروع"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/accounting/journal-entries')}
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting || !balanced}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'جارٍ الحفظ...' : 'حفظ القيد (مسودة)'}
          </button>
        </div>
      </form>
    </div>
  )
}
