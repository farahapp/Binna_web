'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listAccounts, getAccountBalance, deactivateAccount, extractApiError } from '@/lib/api/accounting'
import type { Account, AccountBalance, PaginationMeta } from '@/lib/api/accounting'
import { PageHeader } from '@/components/ui/page-header'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

const accountTypeLabel: Record<string, string> = {
  ASSET: 'أصول',
  LIABILITY: 'التزامات',
  EQUITY: 'حقوق ملكية',
  REVENUE: 'إيرادات',
  EXPENSE: 'مصروفات',
}

export default function AccountsPage() {
  // List
  const [accounts, setAccounts] = useState<Account[]>([])
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null)
  const [listPage, setListPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  async function loadList(page: number) {
    setListLoading(true)
    setListError(null)
    try {
      const res = await listAccounts(page)
      setAccounts(res.data)
      setListMeta(res.meta)
    } catch (err) {
      setListError(extractApiError(err, 'حدث خطأ أثناء تحميل الحسابات'))
    } finally {
      setListLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList(listPage) }, [listPage])

  // Lookup by ID
  const [lookupId, setLookupId] = useState('')
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [lookupPeriodId, setLookupPeriodId] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // Deactivate
  const [deactivateId, setDeactivateId] = useState('')
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [deactivateSuccess, setDeactivateSuccess] = useState<string | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!lookupId.trim()) return
    setLookupLoading(true)
    setLookupError(null)
    setBalance(null)
    try {
      const data = await getAccountBalance(lookupId.trim(), lookupPeriodId.trim() || undefined)
      setBalance(data)
    } catch (err) {
      setLookupError(extractApiError(err, 'حساب غير موجود أو حدث خطأ'))
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleDeactivate(e: React.FormEvent) {
    e.preventDefault()
    if (!deactivateId.trim()) return
    setDeactivating(true)
    setDeactivateError(null)
    setDeactivateSuccess(null)
    try {
      const acct = await deactivateAccount(deactivateId.trim(), TENANT_SLUG)
      setDeactivateSuccess(`تم إلغاء تفعيل الحساب: ${acct.name ?? deactivateId}`)
      setDeactivateId('')
    } catch (err) {
      setDeactivateError(extractApiError(err, 'حدث خطأ أثناء إلغاء تفعيل الحساب'))
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="دليل الحسابات" description="إنشاء الحسابات وعرض أرصدتها">
        <Link
          href="/accounting/accounts/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + حساب جديد
        </Link>
      </PageHeader>

      {/* Accounts List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">قائمة الحسابات</h2>
          <button
            onClick={() => loadList(listPage)}
            disabled={listLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {listLoading ? 'جارٍ التحميل...' : '🔄 تحديث'}
          </button>
        </div>

        {listLoading && (
          <div className="p-8 text-center text-muted-foreground text-sm">جارٍ تحميل الحسابات...</div>
        )}
        {!listLoading && listError && (
          <div className="p-4 text-sm text-destructive bg-destructive/5">{listError}</div>
        )}
        {!listLoading && !listError && accounts.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <p className="text-muted-foreground text-sm">لا توجد حسابات بعد</p>
            <Link href="/accounting/accounts/new" className="text-sm text-primary hover:underline">
              إنشاء أول حساب ←
            </Link>
          </div>
        )}
        {!listLoading && !listError && accounts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">رمز الحساب</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">الاسم</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">النوع</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">الحالة</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">حساب مراقبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((acct) => (
                  <tr key={acct.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground" dir="ltr">{acct.account_code}</td>
                    <td className="px-4 py-2.5 text-foreground">{acct.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {accountTypeLabel[acct.account_type] ?? acct.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        acct.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {acct.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {acct.is_control_account ? '✅ نعم' : '—'}
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
              صفحة {listMeta.current_page} من {listMeta.last_page} ({listMeta.total} حساب)
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

      {/* Balance Lookup */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الاستعلام عن رصيد حساب</h2>
        <form onSubmit={handleLookup} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                معرّف الحساب <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="UUID الحساب"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                معرّف الفترة (اختياري)
              </label>
              <input
                type="text"
                value={lookupPeriodId}
                onChange={(e) => setLookupPeriodId(e.target.value)}
                placeholder="UUID الفترة المحاسبية"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !lookupId.trim()}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {lookupLoading ? 'جارٍ البحث...' : '🔍 استعلام'}
          </button>
        </form>

        {lookupError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {lookupError}
          </div>
        )}

        {balance && (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">البيان</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">القيمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-2 text-foreground">معرّف الحساب</td>
                  <td className="px-4 py-2 text-foreground font-mono text-xs" dir="ltr">{balance.account_id}</td>
                </tr>
                {balance.period_id && (
                  <tr>
                    <td className="px-4 py-2 text-foreground">الفترة</td>
                    <td className="px-4 py-2 text-foreground font-mono text-xs" dir="ltr">{balance.period_id}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-4 py-2 text-foreground">إجمالي المدين</td>
                  <td className="px-4 py-2 text-foreground" dir="ltr">{balance.debit_total?.toLocaleString('ar-SA') ?? '—'}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">إجمالي الدائن</td>
                  <td className="px-4 py-2 text-foreground" dir="ltr">{balance.credit_total?.toLocaleString('ar-SA') ?? '—'}</td>
                </tr>
                <tr className="bg-primary/5">
                  <td className="px-4 py-2 font-semibold text-foreground">الرصيد</td>
                  <td className="px-4 py-2 font-semibold text-foreground" dir="ltr">{balance.balance?.toLocaleString('ar-SA') ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deactivate Account */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">إلغاء تفعيل حساب</h2>
        <form onSubmit={handleDeactivate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              معرّف الحساب <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={deactivateId}
              onChange={(e) => setDeactivateId(e.target.value)}
              placeholder="UUID الحساب المراد إلغاء تفعيله"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={deactivating || !deactivateId.trim()}
            className="inline-flex items-center justify-center rounded-md border border-destructive text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deactivating ? 'جارٍ التنفيذ...' : '🚫 إلغاء التفعيل'}
          </button>
        </form>

        {deactivateError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {deactivateError}
          </div>
        )}
        {deactivateSuccess && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            ✅ {deactivateSuccess}
          </div>
        )}
      </div>
    </div>
  )
}
