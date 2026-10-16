import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

// CAP-110 — Cash Management

export interface CashAccount {
  id: string
  tenant_slug: string
  account_code: string
  name: string
  description?: string
  currency: string
  created_at?: string
  updated_at?: string
}

export interface CreateCashAccountPayload {
  tenant_slug: string
  account_code: string
  name: string
  description?: string
  currency?: string
}

export type CashTransactionType = 'IN' | 'OUT'

export interface CashTransaction {
  id: string
  cash_account_id: string
  type: CashTransactionType
  amount: number
  transaction_date: string
  reference?: string
  description?: string
  created_at?: string
}

export interface RecordCashTransactionPayload {
  tenant_slug: string
  cash_account_id: string
  type: CashTransactionType
  amount: number
  transaction_date: string
  reference?: string
  description?: string
}

export interface CashPosition {
  tenant_slug: string
  accounts: Array<{
    id: string
    account_code: string
    name: string
    currency: string
    balance: number
  }>
  total_balance?: number
}

// CAP-111 — Bank Management

export interface BankAccount {
  id: string
  tenant_slug: string
  account_code: string
  bank_name: string
  account_number: string
  iban?: string
  currency: string
  created_at?: string
  updated_at?: string
}

export interface CreateBankAccountPayload {
  tenant_slug: string
  account_code: string
  bank_name: string
  account_number: string
  iban?: string
  currency?: string
}

export type BankTransactionType = 'CREDIT' | 'DEBIT'

export interface BankTransaction {
  id: string
  bank_account_id: string
  type: BankTransactionType
  amount: number
  transaction_date: string
  reference?: string
  description?: string
  created_at?: string
}

export interface RecordBankTransactionPayload {
  tenant_slug: string
  bank_account_id: string
  type: BankTransactionType
  amount: number
  transaction_date: string
  reference?: string
  description?: string
}

export interface BankReconciliation {
  id: string
  bank_account_id: string
  period_start: string
  period_end: string
  statement_balance: number
  notes?: string
  created_at?: string
}

export interface ReconcileBankPayload {
  tenant_slug: string
  bank_account_id: string
  period_start: string
  period_end: string
  statement_balance: number
  notes?: string
}

export interface BankBalance {
  bank_account_id: string
  balance: number
}

// CAP-180 — Client Billing & Invoicing

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED'

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  subtotal?: number
  tax_amount?: number
  total?: number
}

export interface Invoice {
  id: string
  tenant_slug: string
  invoice_number: string
  client_id: string
  invoice_date: string
  project_id?: string
  contract_id?: string
  due_date?: string
  notes?: string
  status: InvoiceStatus
  items?: InvoiceItem[]
  total_amount?: number
  created_at?: string
  updated_at?: string
}

export interface CreateInvoicePayload {
  tenant_slug: string
  invoice_number: string
  client_id: string
  invoice_date: string
  project_id?: string
  contract_id?: string
  due_date?: string
  notes?: string
}

export interface AddInvoiceItemPayload {
  tenant_slug: string
  description: string
  quantity: number
  unit_price: number
  tax_rate?: number
}

// CAP-181 — Receivables & Collections

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'

export interface Collection {
  id: string
  receivable_id: string
  amount: number
  collection_date: string
  payment_method: PaymentMethod
  reference?: string
  notes?: string
  bank_account_id?: string
  cash_account_id?: string
  created_at?: string
}

export interface RecordCollectionPayload {
  tenant_slug: string
  receivable_id: string
  amount: number
  collection_date: string
  payment_method: PaymentMethod
  reference?: string
  notes?: string
  bank_account_id?: string
  cash_account_id?: string
}

export type PaymentType = 'SUPPLIER' | 'CLIENT'
export type PartyType = 'supplier' | 'client'

export interface Payment {
  id: string
  payment_number: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  party_id: string
  party_type: PartyType
  amount: number
  payment_date: string
  invoice_id?: string
  bank_account_id?: string
  reference?: string
  notes?: string
  created_at?: string
}

export interface RecordPaymentPayload {
  tenant_slug: string
  payment_number: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  party_id: string
  party_type: PartyType
  amount: number
  payment_date: string
  invoice_id?: string
  bank_account_id?: string
  reference?: string
  notes?: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function extractData<T>(res: { data: T | { data: T } }): T {
  if (
    res.data &&
    typeof res.data === 'object' &&
    'data' in (res.data as object) &&
    !Array.isArray(res.data)
  ) {
    return (res.data as { data: T }).data
  }
  return res.data as T
}

// ─── List helpers ─────────────────────────────────────────────────────────────

function extractList<T>(res: { data: unknown }): T[] {
  const d = res.data
  if (Array.isArray(d)) return d as T[]
  if (d && typeof d === 'object' && 'data' in d && Array.isArray((d as { data: unknown }).data)) {
    return (d as { data: T[] }).data
  }
  return []
}

// ─── CAP-110: Cash Management ─────────────────────────────────────────────────

export async function createCashAccount(
  payload: CreateCashAccountPayload
): Promise<CashAccount> {
  const res = await apiClient.post<CashAccount | { data: CashAccount }>(
    '/v1/finance/cash-accounts',
    payload
  )
  return extractData(res)
}

export async function recordCashTransaction(
  payload: RecordCashTransactionPayload
): Promise<CashTransaction> {
  const res = await apiClient.post<CashTransaction | { data: CashTransaction }>(
    '/v1/finance/cash-transactions',
    payload
  )
  return extractData(res)
}

export async function getCashPosition(tenantSlug: string): Promise<CashPosition> {
  const res = await apiClient.get<CashPosition | { data: CashPosition }>(
    '/v1/finance/cash-position',
    { params: { tenant_slug: tenantSlug } }
  )
  return extractData(res)
}

// ─── CAP-111: Bank Management ─────────────────────────────────────────────────

export async function createBankAccount(
  payload: CreateBankAccountPayload
): Promise<BankAccount> {
  const res = await apiClient.post<BankAccount | { data: BankAccount }>(
    '/v1/finance/bank-accounts',
    payload
  )
  return extractData(res)
}

export async function recordBankTransaction(
  payload: RecordBankTransactionPayload
): Promise<BankTransaction> {
  const res = await apiClient.post<BankTransaction | { data: BankTransaction }>(
    '/v1/finance/bank-transactions',
    payload
  )
  return extractData(res)
}

export async function reconcileBank(
  payload: ReconcileBankPayload
): Promise<BankReconciliation> {
  const res = await apiClient.post<BankReconciliation | { data: BankReconciliation }>(
    '/v1/finance/bank-reconciliations',
    payload
  )
  return extractData(res)
}

export async function getBankBalance(bankAccountId: string): Promise<BankBalance> {
  const res = await apiClient.get<BankBalance | { data: BankBalance }>(
    `/v1/finance/bank-accounts/${bankAccountId}/balance`
  )
  return extractData(res)
}

// ─── CAP-180: Client Billing & Invoicing ──────────────────────────────────────

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const res = await apiClient.post<Invoice | { data: Invoice }>(
    '/v1/finance/invoices',
    payload
  )
  return extractData(res)
}

export async function addInvoiceItem(
  invoiceId: string,
  payload: AddInvoiceItemPayload
): Promise<InvoiceItem> {
  const res = await apiClient.post<InvoiceItem | { data: InvoiceItem }>(
    `/v1/finance/invoices/${invoiceId}/items`,
    payload
  )
  return extractData(res)
}

export async function issueInvoice(
  invoiceId: string,
  tenantSlug: string
): Promise<Invoice> {
  const res = await apiClient.patch<Invoice | { data: Invoice }>(
    `/v1/finance/invoices/${invoiceId}/issue`,
    { tenant_slug: tenantSlug }
  )
  return extractData(res)
}

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const res = await apiClient.get<Invoice | { data: Invoice }>(
    `/v1/finance/invoices/${invoiceId}`
  )
  return extractData(res)
}

// ─── CAP-181: Receivables & Collections ──────────────────────────────────────

export async function recordCollection(
  payload: RecordCollectionPayload
): Promise<Collection> {
  const res = await apiClient.post<Collection | { data: Collection }>(
    '/v1/finance/collections',
    payload
  )
  return extractData(res)
}

export async function recordPayment(payload: RecordPaymentPayload): Promise<Payment> {
  const res = await apiClient.post<Payment | { data: Payment }>(
    '/v1/finance/payments',
    payload
  )
  return extractData(res)
}

// ─── WEB-001L: List Endpoints ─────────────────────────────────────────────────

export async function listInvoices(): Promise<Invoice[]> {
  const res = await apiClient.get<Invoice[] | { data: Invoice[] }>('/v1/finance/invoices')
  return extractList(res)
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const res = await apiClient.get<BankAccount[] | { data: BankAccount[] }>(
    '/v1/finance/bank-accounts'
  )
  return extractList(res)
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  const res = await apiClient.get<CashAccount[] | { data: CashAccount[] }>(
    '/v1/finance/cash-accounts'
  )
  return extractList(res)
}

export async function listPayments(): Promise<Payment[]> {
  const res = await apiClient.get<Payment[] | { data: Payment[] }>('/v1/finance/payments')
  return extractList(res)
}

export async function listCollections(): Promise<Collection[]> {
  const res = await apiClient.get<Collection[] | { data: Collection[] }>(
    '/v1/finance/collections'
  )
  return extractList(res)
}
