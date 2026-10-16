'use client'

import { useState } from 'react'
import {
  createCashAccount,
  recordCashTransaction,
  type CreateCashAccountPayload,
  type RecordCashTransactionPayload,
} from '@/lib/api/finance'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

type ActiveTab = 'create' | 'transaction'

export default function CashAccountsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('create')

  // Create Cash Account
  const [createForm, setCreateForm] = useState<Omit<CreateCashAccountPayload, 'tenant_slug'>>({
    account_code: '',
    name: '',
    description: '',
    currency: 'QAR',
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Record Cash Transaction
  const [txForm, setTxForm] = useState<Omit<RecordCashTransactionPayload, 'tenant_slug'>>({
    cash_account_id: '',
    type: 'IN',
    amount: 0,
    transaction_date: '',
    reference: '',
    description: '',
  })
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [txSuccess, setTxSuccess] = useState(false)

  function extractError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
      const r = (err as { response?: { data?: { error?: string; message?: string } } }).response
      return r?.data?.error ?? r?.data?.message ?? fallback
    }
    return fallback
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!createForm.account_code.trim() || !createForm.name.trim()) {
      setCreateError('كود الحساب والاسم مطلوبان')
      return
    }
    setCreateLoading(true)
    try {
      await createCashAccount({
        tenant_slug: TENANT_SLUG,
        ...createForm,
        description: createForm.description || undefined,
      })
      setCreateSuccess(true)
    } catch (err) {
      setCreateError(extractError(err, 'حدث خطأ أثناء إنشاء الحساب'))
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault()
    setTxError(null)
    if (!txForm.cash_account_id.trim() || !txForm.amount || !txForm.transaction_date) {
      setTxError('معرّف الحساب والمبلغ والتاريخ مطلوبة')
      return
    }
    setTxLoading(true)
    try {
      await recordCashTransaction({ tenant_slug: TENANT_SLUG, ...txForm })
      setTxSuccess(true)
    } catch (err) {
      setTxError(extractError(err, 'حدث خطأ أثناء تسجيل المعاملة'))
    } finally {
      setTxLoading(false)
    }
  }

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'create', label: 'إنشاء حساب نقدي' },
    { id: 'transaction', label: 'معاملة نقدية' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الحسابات النقدية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة الصناديق النقدية وتسجيل المعاملات
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Create Cash Account */}
      {activeTab === 'create' && (
        <div className="max-w-lg">
          {createSuccess ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-semibold text-foreground">تم إنشاء الحساب النقدي بنجاح</p>
              <button
                onClick={() => {
                  setCreateSuccess(false)
                  setCreateForm({ account_code: '', name: '', description: '', currency: 'QAR' })
                }}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                إنشاء حساب آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">إنشاء حساب نقدي جديد</h2>
              {createError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    كود الحساب <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={createForm.account_code}
                    onChange={(e) => setCreateForm((p) => ({ ...p, account_code: e.target.value }))}
                    placeholder="CASH-001"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    الاسم <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="الصندوق الرئيسي"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">العملة</label>
                  <input
                    value={createForm.currency}
                    onChange={(e) => setCreateForm((p) => ({ ...p, currency: e.target.value }))}
                    placeholder="QAR"
                    maxLength={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">الوصف</label>
                  <input
                    value={createForm.description ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="وصف اختياري"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createLoading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Record Cash Transaction */}
      {activeTab === 'transaction' && (
        <div className="max-w-lg">
          {txSuccess ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-semibold text-foreground">تم تسجيل المعاملة النقدية بنجاح</p>
              <button
                onClick={() => {
                  setTxSuccess(false)
                  setTxForm({ cash_account_id: '', type: 'IN', amount: 0, transaction_date: '', reference: '', description: '' })
                }}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                تسجيل معاملة أخرى
              </button>
            </div>
          ) : (
            <form onSubmit={handleTransaction} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">تسجيل معاملة نقدية</h2>
              {txError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {txError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">
                    معرّف الحساب النقدي (UUID) <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={txForm.cash_account_id}
                    onChange={(e) => setTxForm((p) => ({ ...p, cash_account_id: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">النوع</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value as 'IN' | 'OUT' }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="IN">وارد (IN)</option>
                    <option value="OUT">صادر (OUT)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    المبلغ <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.01"
                    value={txForm.amount || ''}
                    onChange={(e) => setTxForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">
                    التاريخ <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={txForm.transaction_date}
                    onChange={(e) => setTxForm((p) => ({ ...p, transaction_date: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">المرجع</label>
                  <input
                    value={txForm.reference ?? ''}
                    onChange={(e) => setTxForm((p) => ({ ...p, reference: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">الوصف</label>
                  <input
                    value={txForm.description ?? ''}
                    onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={txLoading}
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {txLoading ? 'جارٍ التسجيل...' : 'تسجيل المعاملة'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
