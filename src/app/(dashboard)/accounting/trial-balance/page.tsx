'use client'

import { useState } from 'react'
import { getTrialBalance, extractApiError } from '@/lib/api/accounting'
import type { TrialBalance } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

const accountTypeLabel: Record<string, string> = {
  ASSET: 'أصول',
  LIABILITY: 'التزامات',
  EQUITY: 'حقوق ملكية',
  REVENUE: 'إيرادات',
  EXPENSE: 'مصروفات',
}

export default function TrialBalancePage() {
  const [periodId, setPeriodId] = useState('')
  const [data, setData] = useState<TrialBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const result = await getTrialBalance(TENANT_SLUG, periodId.trim() || undefined)
      setData(result)
    } catch (err) {
      setError(extractApiError(err, 'حدث خطأ أثناء تحميل ميزان المراجعة'))
    } finally {
      setLoading(false)
    }
  }

  const isBalanced = data
    ? Math.abs((data.total_debit ?? 0) - (data.total_credit ?? 0)) < 0.001
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">ميزان المراجعة</h1>
        <p className="text-muted-foreground text-sm mt-1">
          عرض ميزان المراجعة للفترة المحددة أو الإجمالي
        </p>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <form onSubmit={handleLoad} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              الفترة المحاسبية (UUID، اختياري)
            </label>
            <input
              type="text"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              placeholder="اتركه فارغاً لعرض الإجمالي"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'جارٍ التحميل...' : '⚖️ عرض الميزان'}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">إجمالي المدين</p>
              <p className="text-2xl font-bold text-foreground mt-1" dir="ltr">
                {(data.total_debit ?? 0).toLocaleString('ar-SA')}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">إجمالي الدائن</p>
              <p className="text-2xl font-bold text-foreground mt-1" dir="ltr">
                {(data.total_credit ?? 0).toLocaleString('ar-SA')}
              </p>
            </div>
            <div
              className={`rounded-lg p-4 text-center border ${
                isBalanced
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p className="text-sm text-muted-foreground">الحالة</p>
              <p
                className={`text-lg font-bold mt-1 ${
                  isBalanced ? 'text-green-700' : 'text-destructive'
                }`}
              >
                {isBalanced ? '✅ متوازن' : '⚠️ غير متوازن'}
              </p>
            </div>
          </div>

          {/* Lines Table */}
          {data.lines && data.lines.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                <span className="font-medium text-foreground text-sm">تفاصيل الأرصدة</span>
                <span className="text-xs text-muted-foreground">{data.lines.length} حساب</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">رمز الحساب</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">اسم الحساب</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">النوع</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">مدين</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">دائن</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.lines.map((line) => (
                      <tr key={line.account_id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground" dir="ltr">
                          {line.account_code}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{line.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {accountTypeLabel[line.account_type] ?? line.account_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-foreground" dir="ltr">
                          {(line.debit_total ?? 0) > 0
                            ? (line.debit_total).toLocaleString('ar-SA')
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-foreground" dir="ltr">
                          {(line.credit_total ?? 0) > 0
                            ? (line.credit_total).toLocaleString('ar-SA')
                            : '—'}
                        </td>
                        <td
                          className={`px-4 py-2.5 font-medium ${
                            (line.balance ?? 0) >= 0 ? 'text-foreground' : 'text-destructive'
                          }`}
                          dir="ltr"
                        >
                          {(line.balance ?? 0).toLocaleString('ar-SA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                      <td className="px-4 py-2.5 text-foreground" colSpan={3}>
                        الإجمالي
                      </td>
                      <td className="px-4 py-2.5 text-foreground" dir="ltr">
                        {(data.total_debit ?? 0).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-4 py-2.5 text-foreground" dir="ltr">
                        {(data.total_credit ?? 0).toLocaleString('ar-SA')}
                      </td>
                      <td className="px-4 py-2.5 text-foreground" dir="ltr">
                        {((data.total_debit ?? 0) - (data.total_credit ?? 0)).toLocaleString(
                          'ar-SA',
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center space-y-2">
              <p className="text-muted-foreground text-sm">لا توجد بيانات لهذه الفترة</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
