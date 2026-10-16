'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listPeriods, isPeriodOpen, closePeriod, extractApiError } from '@/lib/api/accounting'
import type { AccountingPeriod, PeriodIsOpenResponse, PaginationMeta } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

const periodStatusLabel: Record<string, string> = {
  OPEN: 'مفتوحة',
  CLOSED: 'مغلقة',
  LOCKED: 'مقفلة',
  open: 'مفتوحة',
  closed: 'مغلقة',
}

const periodStatusColor: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
  LOCKED: 'bg-red-100 text-red-800',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}

export default function PeriodsPage() {
  // List
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null)
  const [listPage, setListPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  async function loadList(page: number) {
    setListLoading(true)
    setListError(null)
    try {
      const res = await listPeriods(page)
      setPeriods(res.data)
      setListMeta(res.meta)
    } catch (err) {
      setListError(extractApiError(err, 'حدث خطأ أثناء تحميل الفترات'))
    } finally {
      setListLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList(listPage) }, [listPage])
  // Period status check
  const [checkId, setCheckId] = useState('')
  const [checkResult, setCheckResult] = useState<PeriodIsOpenResponse | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  // Close period
  const [closeId, setCloseId] = useState('')
  const [closedPeriod, setClosedPeriod] = useState<AccountingPeriod | null>(null)
  const [closeLoading, setCloseLoading] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closeSuccess, setCloseSuccess] = useState<string | null>(null)

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    if (!checkId.trim()) return
    setCheckLoading(true)
    setCheckError(null)
    setCheckResult(null)
    try {
      const data = await isPeriodOpen(checkId.trim())
      setCheckResult(data)
    } catch (err) {
      setCheckError(extractApiError(err, 'فترة غير موجودة أو حدث خطأ'))
    } finally {
      setCheckLoading(false)
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!closeId.trim()) return
    setCloseLoading(true)
    setCloseError(null)
    setCloseSuccess(null)
    setClosedPeriod(null)
    try {
      const period = await closePeriod(closeId.trim(), TENANT_SLUG)
      setClosedPeriod(period)
      setCloseSuccess(`تم إغلاق الفترة: ${period.period_name ?? closeId}`)
      setCloseId('')
    } catch (err) {
      setCloseError(extractApiError(err, 'حدث خطأ أثناء إغلاق الفترة'))
    } finally {
      setCloseLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الفترات المحاسبية</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة الفترات المحاسبية</p>
        </div>
        <Link
          href="/accounting/periods/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + فترة جديدة
        </Link>
      </div>

      {/* Periods List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">قائمة الفترات</h2>
          <button
            onClick={() => loadList(listPage)}
            disabled={listLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {listLoading ? 'جارٍ التحميل...' : '🔄 تحديث'}
          </button>
        </div>

        {listLoading && (
          <div className="p-8 text-center text-muted-foreground text-sm">جارٍ تحميل الفترات...</div>
        )}
        {!listLoading && listError && (
          <div className="p-4 text-sm text-destructive bg-destructive/5">{listError}</div>
        )}
        {!listLoading && !listError && periods.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <p className="text-muted-foreground text-sm">لا توجد فترات بعد</p>
            <Link href="/accounting/periods/new" className="text-sm text-primary hover:underline">
              إنشاء أول فترة ←
            </Link>
          </div>
        )}
        {!listLoading && !listError && periods.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">الاسم</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">من</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">إلى</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{p.period_name}</td>
                    <td className="px-4 py-2.5 text-foreground">{p.start_date}</td>
                    <td className="px-4 py-2.5 text-foreground">{p.end_date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${periodStatusColor[p.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {periodStatusLabel[p.status] ?? p.status}
                      </span>
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
              صفحة {listMeta.current_page} من {listMeta.last_page} ({listMeta.total} فترة)
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

      {/* Period Status Check */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">التحقق من حالة فترة</h2>
        <form onSubmit={handleCheck} className="flex gap-3">
          <input
            type="text"
            value={checkId}
            onChange={(e) => setCheckId(e.target.value)}
            placeholder="UUID الفترة المحاسبية"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={checkLoading || !checkId.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checkLoading ? 'جارٍ البحث...' : '🔍 استعلام'}
          </button>
        </form>

        {checkError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {checkError}
          </div>
        )}

        {checkResult && (
          <div
            className={`rounded-md border p-4 text-sm ${
              checkResult.is_open
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <p className="font-medium">
              الفترة {checkResult.is_open ? '✅ مفتوحة' : '🔒 مغلقة'}
            </p>
            <p className="text-xs mt-1 font-mono" dir="ltr">{checkResult.period_id}</p>
          </div>
        )}
      </div>

      {/* Close Period */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">إغلاق فترة محاسبية</h2>
        <p className="text-sm text-muted-foreground">
          بعد الإغلاق لن يمكن ترحيل قيود جديدة على هذه الفترة.
        </p>
        <form onSubmit={handleClose} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              معرّف الفترة (UUID) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={closeId}
              onChange={(e) => setCloseId(e.target.value)}
              placeholder="UUID الفترة المراد إغلاقها"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={closeLoading || !closeId.trim()}
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {closeLoading ? 'جارٍ الإغلاق...' : '🔒 إغلاق الفترة'}
          </button>
        </form>

        {closeError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {closeError}
          </div>
        )}
        {closeSuccess && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            ✅ {closeSuccess}
          </div>
        )}
        {closedPeriod && (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-2 text-muted-foreground w-32">المعرّف</td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground" dir="ltr">{closedPeriod.id}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-muted-foreground">الاسم</td>
                  <td className="px-4 py-2 text-foreground">{closedPeriod.period_name}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-muted-foreground">من</td>
                  <td className="px-4 py-2 text-foreground">{closedPeriod.start_date}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-muted-foreground">إلى</td>
                  <td className="px-4 py-2 text-foreground">{closedPeriod.end_date}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-muted-foreground">الحالة</td>
                  <td className="px-4 py-2">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {closedPeriod.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
