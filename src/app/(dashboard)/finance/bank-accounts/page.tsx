'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createBankAccount,
  recordBankTransaction,
  reconcileBank,
  getBankBalance,
  listBankAccounts,
  type CreateBankAccountPayload,
  type RecordBankTransactionPayload,
  type ReconcileBankPayload,
  type BankBalance,
  type BankAccount,
} from '@/lib/api/finance'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

type ActiveTab = 'list' | 'create' | 'transaction' | 'reconcile' | 'balance'

export default function BankAccountsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('create')

  // Create Bank Account
  const [createForm, setCreateForm] = useState<Omit<CreateBankAccountPayload, 'tenant_slug'>>({
    account_code: '',
    bank_name: '',
    account_number: '',
    iban: '',
    currency: 'QAR',
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Record Bank Transaction
  const [txForm, setTxForm] = useState<Omit<RecordBankTransactionPayload, 'tenant_slug'>>({
    bank_account_id: '',
    type: 'CREDIT',
    amount: 0,
    transaction_date: '',
    reference: '',
    description: '',
  })
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [txSuccess, setTxSuccess] = useState(false)

  // Reconcile
  const [recForm, setRecForm] = useState<Omit<ReconcileBankPayload, 'tenant_slug'>>({
    bank_account_id: '',
    period_start: '',
    period_end: '',
    statement_balance: 0,
    notes: '',
  })
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const [recSuccess, setRecSuccess] = useState(false)

  // Balance
  const [balanceId, setBalanceId] = useState('')
  const [balance, setBalance] = useState<BankBalance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // List
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [listLoaded, setListLoaded] = useState(false)

  async function loadList() {
    setListLoading(true)
    setListError(null)
    try {
      const data = await listBankAccounts()
      setAccounts(data)
      setListLoaded(true)
    } catch (err) {
      setListError(extractError(err, 'حدث خطأ أثناء تحميل الحسابات'))
    } finally {
      setListLoading(false)
    }
  }

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
    if (!createForm.account_code.trim() || !createForm.bank_name.trim() || !createForm.account_number.trim()) {
      setCreateError('كود الحساب واسم البنك ورقم الحساب مطلوبة')
      return
    }
    setCreateLoading(true)
    try {
      await createBankAccount({ tenant_slug: TENANT_SLUG, ...createForm, iban: createForm.iban || undefined })
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
    if (!txForm.bank_account_id.trim() || !txForm.amount || !txForm.transaction_date) {
      setTxError('معرّف الحساب والمبلغ والتاريخ مطلوبة')
      return
    }
    setTxLoading(true)
    try {
      await recordBankTransaction({ tenant_slug: TENANT_SLUG, ...txForm })
      setTxSuccess(true)
    } catch (err) {
      setTxError(extractError(err, 'حدث خطأ أثناء تسجيل المعاملة'))
    } finally {
      setTxLoading(false)
    }
  }

  async function handleReconcile(e: React.FormEvent) {
    e.preventDefault()
    setRecError(null)
    if (!recForm.bank_account_id.trim() || !recForm.period_start || !recForm.period_end) {
      setRecError('معرّف الحساب والفترة مطلوبة')
      return
    }
    setRecLoading(true)
    try {
      await reconcileBank({ tenant_slug: TENANT_SLUG, ...recForm })
      setRecSuccess(true)
    } catch (err) {
      setRecError(extractError(err, 'حدث خطأ أثناء التسوية'))
    } finally {
      setRecLoading(false)
    }
  }

  async function handleBalance(e: React.FormEvent) {
    e.preventDefault()
    setBalanceError(null)
    setBalance(null)
    if (!balanceId.trim()) { setBalanceError('معرّف الحساب مطلوب'); return }
    setBalanceLoading(true)
    try {
      const data = await getBankBalance(balanceId.trim())
      setBalance(data)
    } catch (err) {
      setBalanceError(extractError(err, 'حساب غير موجود'))
    } finally {
      setBalanceLoading(false)
    }
  }

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'list', label: 'قائمة الحسابات' },
    { id: 'create', label: 'إنشاء حساب' },
    { id: 'transaction', label: 'معاملة بنكية' },
    { id: 'reconcile', label: 'تسوية بنكية' },
    { id: 'balance', label: 'الرصيد' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الحسابات البنكية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة الحسابات البنكية والمعاملات والتسويات
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-0">
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

      {/* List Bank Accounts */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={loadList} disabled={listLoading} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
              {listLoading ? 'جارٍ التحميل...' : '🔄 تحميل الحسابات'}
            </button>
          </div>
          {listError && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{listError}</div>}
          {listLoaded && accounts.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[150px] space-y-2 bg-card border border-border rounded-lg">
              <div className="text-3xl">🏦</div>
              <p className="text-muted-foreground text-sm">لا توجد حسابات بنكية مسجلة</p>
            </div>
          )}
          {accounts.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-muted-foreground">
                      <th className="text-right py-3 px-4">كود الحساب</th>
                      <th className="text-right py-3 px-4">اسم البنك</th>
                      <th className="text-right py-3 px-4">رقم الحساب</th>
                      <th className="text-right py-3 px-4">العملة</th>
                      <th className="text-right py-3 px-4">الرصيد</th>
                      <th className="text-right py-3 px-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono text-foreground">{acc.account_code}</td>
                        <td className="py-3 px-4 text-foreground">{acc.bank_name}</td>
                        <td className="py-3 px-4 font-mono text-foreground" dir="ltr">{acc.account_number}</td>
                        <td className="py-3 px-4 text-foreground">{acc.currency}</td>
                        <td className="py-3 px-4 text-foreground font-medium">
                          {(acc as unknown as { balance?: number }).balance !== undefined
                            ? Number((acc as unknown as { balance: number }).balance).toLocaleString('ar-QA')
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(acc as unknown as { status?: string }).status === 'active' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                            {(acc as unknown as { status?: string }).status === 'active' ? 'نشط' : ((acc as unknown as { status?: string }).status ?? '—')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Bank Account */}
      {activeTab === 'create' && (
        <div className="max-w-lg">
          {createSuccess ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-semibold text-foreground">تم إنشاء الحساب البنكي بنجاح</p>
              <button
                onClick={() => { setCreateSuccess(false); setCreateForm({ account_code: '', bank_name: '', account_number: '', iban: '', currency: 'QAR' }) }}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                إنشاء حساب آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">إنشاء حساب بنكي جديد</h2>
              {createError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{createError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'account_code', label: 'كود الحساب', required: true, dir: 'ltr' },
                  { name: 'bank_name', label: 'اسم البنك', required: true, dir: 'rtl' },
                  { name: 'account_number', label: 'رقم الحساب', required: true, dir: 'ltr' },
                  { name: 'iban', label: 'IBAN', required: false, dir: 'ltr' },
                  { name: 'currency', label: 'العملة', required: false, dir: 'ltr' },
                ].map((field) => (
                  <div key={field.name} className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </label>
                    <input
                      name={field.name}
                      value={(createForm as Record<string, string>)[field.name] ?? ''}
                      onChange={(e) => setCreateForm((p) => ({ ...p, [e.target.name]: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      dir={field.dir as 'ltr' | 'rtl'}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={createLoading} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {createLoading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Record Bank Transaction */}
      {activeTab === 'transaction' && (
        <div className="max-w-lg">
          {txSuccess ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-semibold text-foreground">تم تسجيل المعاملة بنجاح</p>
              <button onClick={() => { setTxSuccess(false); setTxForm({ bank_account_id: '', type: 'CREDIT', amount: 0, transaction_date: '', reference: '', description: '' }) }} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">تسجيل معاملة أخرى</button>
            </div>
          ) : (
            <form onSubmit={handleTransaction} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">تسجيل معاملة بنكية</h2>
              {txError && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{txError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">معرّف الحساب البنكي (UUID) <span className="text-destructive">*</span></label>
                  <input name="bank_account_id" value={txForm.bank_account_id} onChange={(e) => setTxForm((p) => ({ ...p, bank_account_id: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">النوع</label>
                  <select value={txForm.type} onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value as 'CREDIT' | 'DEBIT' }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="CREDIT">إيداع (CREDIT)</option>
                    <option value="DEBIT">سحب (DEBIT)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">المبلغ <span className="text-destructive">*</span></label>
                  <input type="number" min="0.0001" step="0.01" value={txForm.amount || ''} onChange={(e) => setTxForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">التاريخ <span className="text-destructive">*</span></label>
                  <input type="date" value={txForm.transaction_date} onChange={(e) => setTxForm((p) => ({ ...p, transaction_date: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">المرجع</label>
                  <input value={txForm.reference ?? ''} onChange={(e) => setTxForm((p) => ({ ...p, reference: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">الوصف</label>
                  <input value={txForm.description ?? ''} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={txLoading} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {txLoading ? 'جارٍ التسجيل...' : 'تسجيل المعاملة'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reconcile */}
      {activeTab === 'reconcile' && (
        <div className="max-w-lg">
          {recSuccess ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-lg font-semibold text-foreground">تمت التسوية البنكية بنجاح</p>
              <button onClick={() => { setRecSuccess(false); setRecForm({ bank_account_id: '', period_start: '', period_end: '', statement_balance: 0, notes: '' }) }} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">تسوية أخرى</button>
            </div>
          ) : (
            <form onSubmit={handleReconcile} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">تسوية بنكية</h2>
              {recError && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{recError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">معرّف الحساب البنكي (UUID) <span className="text-destructive">*</span></label>
                  <input value={recForm.bank_account_id} onChange={(e) => setRecForm((p) => ({ ...p, bank_account_id: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">بداية الفترة <span className="text-destructive">*</span></label>
                  <input type="date" value={recForm.period_start} onChange={(e) => setRecForm((p) => ({ ...p, period_start: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">نهاية الفترة <span className="text-destructive">*</span></label>
                  <input type="date" value={recForm.period_end} onChange={(e) => setRecForm((p) => ({ ...p, period_end: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">رصيد كشف الحساب</label>
                  <input type="number" step="0.01" value={recForm.statement_balance || ''} onChange={(e) => setRecForm((p) => ({ ...p, statement_balance: parseFloat(e.target.value) || 0 }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">ملاحظات</label>
                  <input value={recForm.notes ?? ''} onChange={(e) => setRecForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={recLoading} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {recLoading ? 'جارٍ التسوية...' : 'تنفيذ التسوية'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Balance */}
      {activeTab === 'balance' && (
        <div className="max-w-lg space-y-4">
          <form onSubmit={handleBalance} className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">الاستعلام عن الرصيد</h2>
            {balanceError && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{balanceError}</div>}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">معرّف الحساب البنكي (UUID) <span className="text-destructive">*</span></label>
              <input value={balanceId} onChange={(e) => setBalanceId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" dir="ltr" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={balanceLoading} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {balanceLoading ? 'جارٍ الاستعلام...' : 'استعلام'}
              </button>
            </div>
          </form>

          {balance && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-2">
              <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
              <p className="text-3xl font-bold text-foreground">
                {balance.balance.toLocaleString('ar-QA')} <span className="text-base font-normal text-muted-foreground">ر.ق</span>
              </p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">{balance.bank_account_id}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
