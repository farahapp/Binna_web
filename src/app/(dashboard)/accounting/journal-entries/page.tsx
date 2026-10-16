'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listJournalEntries, getJournalEntry, postJournalEntry, reverseJournalEntry, extractApiError } from '@/lib/api/accounting'
import type { JournalEntry, PaginationMeta } from '@/lib/api/accounting'
import { StatusBadge } from '@/components/ui/status-badge'
import { Input } from '@/components/ui/input'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  posted: 'مرحّل',
  reversed: 'معكوس',
  DRAFT: 'مسودة',
  POSTED: 'مرحّل',
  REVERSED: 'معكوس',
}

export default function JournalEntriesPage() {
  // List
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null)
  const [listPage, setListPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  async function loadList(page: number) {
    setListLoading(true)
    setListError(null)
    try {
      const res = await listJournalEntries(page)
      setEntries(res.data)
      setListMeta(res.meta)
    } catch (err) {
      setListError(extractApiError(err, 'حدث خطأ أثناء تحميل القيود'))
    } finally {
      setListLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList(listPage) }, [listPage])

  // Lookup by ID
  const [lookupId, setLookupId] = useState('')
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // Post
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState<string | null>(null)

  // Reverse
  const [reversalDate, setReversalDate] = useState('')
  const [reversalPeriodId, setReversalPeriodId] = useState('')
  const [reversalNarration, setReversalNarration] = useState('')
  const [reverseLoading, setReverseLoading] = useState(false)
  const [reverseError, setReverseError] = useState<string | null>(null)
  const [reverseSuccess, setReverseSuccess] = useState<string | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!lookupId.trim()) return
    setLookupLoading(true)
    setLookupError(null)
    setEntry(null)
    setPostError(null)
    setPostSuccess(null)
    setReverseError(null)
    setReverseSuccess(null)
    try {
      const data = await getJournalEntry(lookupId.trim())
      setEntry(data)
    } catch (err) {
      setLookupError(extractApiError(err, 'قيد غير موجود أو حدث خطأ'))
    } finally {
      setLookupLoading(false)
    }
  }

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
      setReverseError('معرّف الفترة مطلوب للعكس')
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
      setReverseSuccess(`تم إنشاء قيد العكس: ${reversed.id}`)
    } catch (err) {
      setReverseError(extractApiError(err, 'حدث خطأ أثناء عكس القيد'))
    } finally {
      setReverseLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">قيود اليومية</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وترحيل وعرض قيود اليومية</p>
        </div>
        <Link
          href="/accounting/journal-entries/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + قيد يومية جديد
        </Link>
      </div>

      {/* Journal Entries List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">قائمة القيود</h2>
          <button
            onClick={() => loadList(listPage)}
            disabled={listLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {listLoading ? 'جارٍ التحميل...' : '🔄 تحديث'}
          </button>
        </div>

        {listLoading && (
          <div className="p-8 text-center text-muted-foreground text-sm">جارٍ تحميل القيود...</div>
        )}
        {!listLoading && listError && (
          <div className="p-4 text-sm text-destructive bg-destructive/5">{listError}</div>
        )}
        {!listLoading && !listError && entries.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <p className="text-muted-foreground text-sm">لا توجد قيود بعد</p>
            <Link href="/accounting/journal-entries/new" className="text-sm text-primary hover:underline">
              إنشاء أول قيد يومية ←
            </Link>
          </div>
        )}
        {!listLoading && !listError && entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">المرجع</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">تاريخ الترحيل</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">الحالة</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">البيان</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{e.reference}</td>
                    <td className="px-4 py-2.5 text-foreground">{e.posting_date}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={e.status} label={statusLabel[e.status] ?? e.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.narration ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/accounting/journal-entries/${e.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {listMeta && listMeta.last_page > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              صفحة {listMeta.current_page} من {listMeta.last_page} ({listMeta.total} قيد)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                disabled={listMeta.current_page <= 1}
                className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setListPage((p) => Math.min(listMeta.last_page, p + 1))}
                disabled={listMeta.current_page >= listMeta.last_page}
                className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lookup */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الاستعلام عن قيد يومية</h2>
        <form onSubmit={handleLookup} className="flex gap-3">
          <Input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="UUID القيد"
            className="flex-1"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={lookupLoading || !lookupId.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {lookupLoading ? 'جارٍ البحث...' : '🔍 بحث'}
          </button>
        </form>

        {lookupError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {lookupError}
          </div>
        )}

        {entry && (
          <div className="space-y-4">
            {/* Entry Info */}
            <div className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                <span className="font-medium text-foreground text-sm">بيانات القيد</span>
                <StatusBadge status={entry.status} label={statusLabel[entry.status] ?? entry.status} />
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground w-40">المعرّف</td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground" dir="ltr">{entry.id}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground">المرجع</td>
                    <td className="px-4 py-2 text-foreground">{entry.reference}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground">تاريخ الترحيل</td>
                    <td className="px-4 py-2 text-foreground">{entry.posting_date}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted-foreground">الفترة</td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground" dir="ltr">{entry.period_id}</td>
                  </tr>
                  {entry.narration && (
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground">البيان</td>
                      <td className="px-4 py-2 text-foreground">{entry.narration}</td>
                    </tr>
                  )}
                  {entry.source_module && (
                    <tr>
                      <td className="px-4 py-2 text-muted-foreground">المصدر</td>
                      <td className="px-4 py-2 text-foreground">{entry.source_module}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Lines */}
            {entry.lines && entry.lines.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="bg-muted/50 px-4 py-2">
                  <span className="font-medium text-foreground text-sm">سطور القيد</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">الحساب</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">مدين</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">دائن</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">البيان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {entry.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2 font-mono text-xs text-foreground" dir="ltr">{line.account_id}</td>
                          <td className="px-4 py-2 text-foreground" dir="ltr">
                            {line.debit > 0 ? line.debit.toLocaleString('ar-SA') : '—'}
                          </td>
                          <td className="px-4 py-2 text-foreground" dir="ltr">
                            {line.credit > 0 ? line.credit.toLocaleString('ar-SA') : '—'}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{line.description ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            {entry.status === 'draft' && (
              <div className="space-y-2">
                <button
                  onClick={handlePost}
                  disabled={postLoading}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {postLoading ? 'جارٍ الترحيل...' : '✅ ترحيل القيد'}
                </button>
                {postError && (
                  <p className="text-sm text-destructive">{postError}</p>
                )}
                {postSuccess && (
                  <p className="text-sm text-green-700">{postSuccess}</p>
                )}
              </div>
            )}

            {entry.status === 'posted' && (
              <form onSubmit={handleReverse} className="space-y-3 border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground">عكس القيد</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
                <div>
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
        )}
      </div>
    </div>
  )
}
