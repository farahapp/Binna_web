'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  extractApiError,
} from '@/lib/api/accounting'
import type { JournalEntry } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  posted: 'مرحّل',
  reversed: 'معكوس',
}

const statusColor: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  reversed: 'bg-gray-100 text-gray-600',
}

export default function JournalEntryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Post
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState<string | null>(null)

  // Reverse form
  const [reversalDate, setReversalDate] = useState('')
  const [reversalPeriodId, setReversalPeriodId] = useState('')
  const [reversalNarration, setReversalNarration] = useState('')
  const [reverseLoading, setReverseLoading] = useState(false)
  const [reverseError, setReverseError] = useState<string | null>(null)
  const [reverseSuccess, setReverseSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getJournalEntry(id)
      .then((data) => setEntry(data))
      .catch((err) => setError(extractApiError(err, 'قيد غير موجود أو حدث خطأ')))
      .finally(() => setLoading(false))
  }, [id])

  async function handlePost() {
    if (!entry) return
    setPostLoading(true)
    setPostError(null)
    setPostSuccess(null)
    try {
      const updated = await postJournalEntry(entry.id, TENANT_SLUG)
      setEntry(updated)
      setPostSuccess('تم ترحيل القيد بنجاح')
    } catch (err) {
      setPostError(extractApiError(err, 'حدث خطأ أثناء الترحيل'))
    } finally {
      setPostLoading(false)
    }
  }

  async function handleReverse(e: React.FormEvent) {
    e.preventDefault()
    if (!entry) return
    if (!reversalDate) {
      setReverseError('تاريخ العكس مطلوب')
      return
    }
    if (!reversalPeriodId.trim()) {
      setReverseError('معرّف الفترة مطلوب')
      return
    }
    setReverseLoading(true)
    setReverseError(null)
    setReverseSuccess(null)
    try {
      const reversed = await reverseJournalEntry(entry.id, {
        tenant_slug: TENANT_SLUG,
        reversal_date: reversalDate,
        period_id: reversalPeriodId.trim(),
        narration: reversalNarration.trim() || undefined,
      })
      setReverseSuccess(`تم إنشاء قيد العكس. المعرّف: ${reversed.id}`)
    } catch (err) {
      setReverseError(extractApiError(err, 'حدث خطأ أثناء عكس القيد'))
    } finally {
      setReverseLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        جارٍ تحميل القيد...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
        </div>
        <Link
          href="/accounting/journal-entries"
          className="text-sm text-primary hover:underline"
        >
          ← العودة إلى قيود اليومية
        </Link>
      </div>
    )
  }

  if (!entry) return null

  const totalDebit = (entry.lines ?? []).reduce((s, l) => s + (l.debit ?? 0), 0)
  const totalCredit = (entry.lines ?? []).reduce((s, l) => s + (l.credit ?? 0), 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/accounting/journal-entries"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              قيود اليومية
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-foreground">{entry.reference}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{entry.reference}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[entry.status] ?? ''}`}
            >
              {statusLabel[entry.status] ?? entry.status}
            </span>
            <span className="text-sm text-muted-foreground">{entry.posting_date}</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/accounting/journal-entries')}
          className="self-start inline-flex items-center justify-center rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          ← رجوع
        </button>
      </div>

      {/* Details */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3">
          <span className="font-medium text-foreground text-sm">تفاصيل القيد</span>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-2.5 text-muted-foreground w-40">المعرّف</td>
              <td className="px-4 py-2.5 font-mono text-xs text-foreground" dir="ltr">{entry.id}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-muted-foreground">تاريخ الترحيل</td>
              <td className="px-4 py-2.5 text-foreground">{entry.posting_date}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-muted-foreground">الفترة</td>
              <td className="px-4 py-2.5 font-mono text-xs text-foreground" dir="ltr">{entry.period_id}</td>
            </tr>
            {entry.narration && (
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">البيان</td>
                <td className="px-4 py-2.5 text-foreground">{entry.narration}</td>
              </tr>
            )}
            {entry.source_module && (
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">الوحدة المصدر</td>
                <td className="px-4 py-2.5 text-foreground">{entry.source_module}</td>
              </tr>
            )}
            {entry.source_document_type && (
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">نوع المستند</td>
                <td className="px-4 py-2.5 text-foreground">{entry.source_document_type}</td>
              </tr>
            )}
            {entry.created_at && (
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">تاريخ الإنشاء</td>
                <td className="px-4 py-2.5 text-foreground">
                  {new Date(entry.created_at).toLocaleString('ar-SA')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lines */}
      {entry.lines && entry.lines.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3">
            <span className="font-medium text-foreground text-sm">سطور القيد</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">الحساب</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">مدين</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">دائن</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">البيان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entry.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground" dir="ltr">
                      {line.account_id}
                    </td>
                    <td className="px-4 py-2.5 text-foreground" dir="ltr">
                      {(line.debit ?? 0) > 0 ? (line.debit).toLocaleString('ar-SA') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-foreground" dir="ltr">
                      {(line.credit ?? 0) > 0 ? (line.credit).toLocaleString('ar-SA') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{line.description ?? '—'}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5 text-foreground">الإجمالي</td>
                  <td className="px-4 py-2.5 text-foreground" dir="ltr">{totalDebit.toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-2.5 text-foreground" dir="ltr">{totalCredit.toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-2.5 text-sm">
                    {Math.abs(totalDebit - totalCredit) < 0.001 ? (
                      <span className="text-green-700">✅ متوازن</span>
                    ) : (
                      <span className="text-destructive">⚠️ غير متوازن</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      {entry.status === 'draft' && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-base font-semibold text-foreground">ترحيل القيد</h2>
          <p className="text-sm text-muted-foreground">
            بعد الترحيل يصبح القيد نهائياً وغير قابل للتعديل.
          </p>
          <button
            onClick={handlePost}
            disabled={postLoading}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {postLoading ? 'جارٍ الترحيل...' : '✅ ترحيل القيد'}
          </button>
          {postError && <p className="text-sm text-destructive">{postError}</p>}
          {postSuccess && <p className="text-sm text-green-700">{postSuccess}</p>}
        </div>
      )}

      {entry.status === 'posted' && (
        <form onSubmit={handleReverse} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">عكس القيد</h2>
          <p className="text-sm text-muted-foreground">
            إنشاء قيد عكسي يلغي تأثير هذا القيد.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                تاريخ العكس <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                فترة العكس (UUID) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={reversalPeriodId}
                onChange={(e) => setReversalPeriodId(e.target.value)}
                placeholder="UUID الفترة"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                بيان العكس (اختياري)
              </label>
              <input
                type="text"
                value={reversalNarration}
                onChange={(e) => setReversalNarration(e.target.value)}
                placeholder="سبب العكس"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={reverseLoading}
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {reverseLoading ? 'جارٍ العكس...' : '↩️ عكس القيد'}
          </button>
          {reverseError && <p className="text-sm text-destructive">{reverseError}</p>}
          {reverseSuccess && <p className="text-sm text-green-700">{reverseSuccess}</p>}
        </form>
      )}
    </div>
  )
}
