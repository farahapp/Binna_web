'use client'

import { useEffect, useState } from 'react'
import { getCashPosition, type CashPosition } from '@/lib/api/finance'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

export default function CashPositionPage() {
  const [position, setPosition] = useState<CashPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getCashPosition(TENANT_SLUG)
      setPosition(data)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: string; message?: string } } }).response?.data
              ?.error ??
            (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
              ?.message ??
            'حدث خطأ أثناء تحميل المركز المالي')
          : 'حدث خطأ أثناء تحميل المركز المالي'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المركز المالي النقدي</h1>
          <p className="text-muted-foreground text-sm mt-1">
            الوضع النقدي الإجمالي لجميع الحسابات
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          {loading ? 'جارٍ التحميل...' : '🔄 تحديث'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-muted-foreground text-sm">جارٍ تحميل البيانات...</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <p className="font-medium">خطأ في تحميل البيانات</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Data */}
      {!loading && !error && position && (
        <div className="space-y-4">
          {/* Total */}
          {position.total_balance !== undefined && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <p className="text-sm text-muted-foreground">إجمالي الرصيد النقدي</p>
              <p className="text-4xl font-bold text-foreground mt-1">
                {position.total_balance.toLocaleString('ar-QA')}{' '}
                <span className="text-lg font-normal text-muted-foreground">ر.ق</span>
              </p>
            </div>
          )}

          {/* Accounts */}
          {position.accounts && position.accounts.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">الحسابات النقدية</h2>
              </div>
              <div className="divide-y divide-border">
                {position.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="text-sm text-muted-foreground font-mono" dir="ltr">
                        {account.account_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {account.balance.toLocaleString('ar-QA')}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                          {account.currency}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-3 bg-card border border-border rounded-lg">
              <div className="text-4xl">💵</div>
              <p className="text-muted-foreground text-sm">لا توجد حسابات نقدية مسجلة</p>
            </div>
          )}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && !position && (
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-3 bg-card border border-border rounded-lg">
          <div className="text-4xl">📊</div>
          <p className="text-muted-foreground text-sm">لا توجد بيانات متاحة</p>
        </div>
      )}
    </div>
  )
}
