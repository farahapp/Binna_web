import { apiClient } from '@/lib/api/client'
import type { AxiosError } from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

// CAP-120 — Chart of Accounts

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
export type AccountStatus = 'active' | 'inactive'

export interface Account {
  id: string
  tenant_slug: string
  account_code: string
  name: string
  account_type: AccountType
  parent_id?: string | null
  is_control_account: boolean
  description?: string | null
  status: AccountStatus
  created_at?: string
  updated_at?: string
}

export interface CreateAccountPayload {
  tenant_slug: string
  account_code: string
  name: string
  account_type: AccountType
  parent_id?: string | null
  is_control_account?: boolean
  description?: string | null
}

export interface AccountBalance {
  account_id: string
  period_id?: string | null
  debit_total: number
  credit_total: number
  balance: number
}

// CAP-120 — Accounting Periods

export type PeriodStatus = 'open' | 'closed'

export interface AccountingPeriod {
  id: string
  tenant_slug: string
  period_name: string
  start_date: string
  end_date: string
  status: PeriodStatus
  created_at?: string
  updated_at?: string
}

export interface CreatePeriodPayload {
  tenant_slug: string
  period_name: string
  start_date: string
  end_date: string
}

export interface PeriodIsOpenResponse {
  period_id: string
  is_open: boolean
}

// CAP-120 — Trial Balance

export interface TrialBalanceLine {
  account_id: string
  account_code: string
  name: string
  account_type: AccountType
  debit_total: number
  credit_total: number
  balance: number
}

export interface TrialBalance {
  tenant_slug: string
  period_id?: string | null
  lines: TrialBalanceLine[]
  total_debit: number
  total_credit: number
}

// CAP-121 — Journal Entries

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed'

export interface JournalLine {
  id: string
  journal_entry_id: string
  account_id: string
  debit: number
  credit: number
  description?: string | null
  project_id?: string | null
  cost_code_id?: string | null
}

export interface JournalEntry {
  id: string
  tenant_slug: string
  reference: string
  posting_date: string
  period_id: string
  narration?: string | null
  source_module?: string | null
  source_document_id?: string | null
  source_document_type?: string | null
  status: JournalEntryStatus
  lines?: JournalLine[]
  created_at?: string
  updated_at?: string
}

export interface JournalLineInput {
  account_id: string
  debit?: number
  credit?: number
  description?: string
  project_id?: string
  cost_code_id?: string
}

export interface CreateJournalEntryPayload {
  tenant_slug: string
  reference: string
  posting_date: string
  period_id: string
  narration?: string
  source_module?: string
  source_document_id?: string
  source_document_type?: string
  lines: JournalLineInput[]
}

export interface PostJournalEntryPayload {
  tenant_slug: string
}

export interface ReverseJournalEntryPayload {
  tenant_slug: string
  reversal_date: string
  period_id: string
  narration?: string
}

// CAP-121 — Posting Rules

export interface PostingRule {
  id: string
  tenant_slug: string
  trigger_event: string
  rule_name: string
  debit_account_id?: string | null
  credit_account_id?: string | null
  amount_source?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreatePostingRulePayload {
  tenant_slug: string
  trigger_event: string
  rule_name: string
  debit_account_id?: string | null
  credit_account_id?: string | null
  amount_source?: string | null
  description?: string | null
}

// ─── Pagination Meta ──────────────────────────────────────────────────────────

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ─── Error Helper ─────────────────────────────────────────────────────────────

export function extractApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as AxiosError<{ error?: string; message?: string }>).response
    return r?.data?.error ?? r?.data?.message ?? fallback
  }
  return fallback
}

// ─── CAP-120 — Chart of Accounts ──────────────────────────────────────────────

/**
 * POST /v1/accounting/accounts
 * Create a new chart-of-accounts entry.
 */
export async function createAccount(payload: CreateAccountPayload): Promise<Account> {
  const res = await apiClient.post<Account>('/v1/accounting/accounts', payload)
  return res.data
}

/**
 * PATCH /v1/accounting/accounts/{id}/deactivate
 * Deactivate an existing account.
 */
export async function deactivateAccount(
  id: string,
  tenantSlug: string,
): Promise<Account> {
  const res = await apiClient.patch<Account>(`/v1/accounting/accounts/${id}/deactivate`, {
    tenant_slug: tenantSlug,
  })
  return res.data
}

/**
 * GET /v1/accounting/accounts/{id}/balance?period_id=
 * Get balance for a specific account.
 */
export async function getAccountBalance(
  id: string,
  periodId?: string,
): Promise<AccountBalance> {
  const params: Record<string, string> = {}
  if (periodId) params.period_id = periodId
  const res = await apiClient.get<AccountBalance>(`/v1/accounting/accounts/${id}/balance`, {
    params,
  })
  return res.data
}

/**
 * GET /v1/accounting/trial-balance?tenant_slug=&period_id=
 * Get trial balance for the tenant, optionally scoped to a period.
 */
export async function getTrialBalance(
  tenantSlug: string,
  periodId?: string,
): Promise<TrialBalance> {
  const params: Record<string, string> = { tenant_slug: tenantSlug }
  if (periodId) params.period_id = periodId
  const res = await apiClient.get<TrialBalance>('/v1/accounting/trial-balance', { params })
  return res.data
}

// ─── CAP-120 — Accounting Periods ─────────────────────────────────────────────

/**
 * POST /v1/accounting/periods
 * Create a new accounting period.
 */
export async function createPeriod(payload: CreatePeriodPayload): Promise<AccountingPeriod> {
  const res = await apiClient.post<AccountingPeriod>('/v1/accounting/periods', payload)
  return res.data
}

/**
 * PATCH /v1/accounting/periods/{id}/close
 * Close an accounting period.
 */
export async function closePeriod(
  id: string,
  tenantSlug: string,
): Promise<AccountingPeriod> {
  const res = await apiClient.patch<AccountingPeriod>(`/v1/accounting/periods/${id}/close`, {
    tenant_slug: tenantSlug,
  })
  return res.data
}

/**
 * GET /v1/accounting/periods/{id}/is-open
 * Check whether an accounting period is still open.
 */
export async function isPeriodOpen(id: string): Promise<PeriodIsOpenResponse> {
  const res = await apiClient.get<PeriodIsOpenResponse>(`/v1/accounting/periods/${id}/is-open`)
  return res.data
}

// ─── CAP-121 — Journal Entries ────────────────────────────────────────────────

/**
 * POST /v1/accounting/journal-entries
 * Create a draft journal entry (with lines).
 */
export async function createJournalEntry(
  payload: CreateJournalEntryPayload,
): Promise<JournalEntry> {
  const res = await apiClient.post<JournalEntry>('/v1/accounting/journal-entries', payload)
  return res.data
}

/**
 * PATCH /v1/accounting/journal-entries/{id}/post
 * Post (approve) a draft journal entry.
 */
export async function postJournalEntry(
  id: string,
  tenantSlug: string,
): Promise<JournalEntry> {
  const res = await apiClient.patch<JournalEntry>(
    `/v1/accounting/journal-entries/${id}/post`,
    { tenant_slug: tenantSlug },
  )
  return res.data
}

/**
 * POST /v1/accounting/journal-entries/{id}/reverse
 * Reverse a posted journal entry.
 */
export async function reverseJournalEntry(
  id: string,
  payload: ReverseJournalEntryPayload,
): Promise<JournalEntry> {
  const res = await apiClient.post<JournalEntry>(
    `/v1/accounting/journal-entries/${id}/reverse`,
    payload,
  )
  return res.data
}

/**
 * GET /v1/accounting/journal-entries/{id}
 * Fetch a single journal entry with its lines.
 */
export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const res = await apiClient.get<JournalEntry>(`/v1/accounting/journal-entries/${id}`)
  return res.data
}

// ─── CAP-121 — Posting Rules ──────────────────────────────────────────────────

/**
 * POST /v1/accounting/posting-rules
 * Create an automated posting rule.
 */
export async function createPostingRule(
  payload: CreatePostingRulePayload,
): Promise<PostingRule> {
  const res = await apiClient.post<PostingRule>('/v1/accounting/posting-rules', payload)
  return res.data
}

// ─── WEB-001N — List Functions ────────────────────────────────────────────────

/**
 * GET /v1/accounting/accounts
 * Paginated list of Chart-of-Accounts entries.
 * WEB-001N — OI-1 resolved.
 */
export async function listAccounts(
  page = 1,
): Promise<PaginatedResponse<Account>> {
  const res = await apiClient.get<PaginatedResponse<Account>>('/v1/accounting/accounts', {
    params: { page },
  })
  return res.data
}

/**
 * GET /v1/accounting/journal-entries
 * Paginated list of Journal Entries.
 * WEB-001N — OI-2 resolved.
 */
export async function listJournalEntries(
  page = 1,
): Promise<PaginatedResponse<JournalEntry>> {
  const res = await apiClient.get<PaginatedResponse<JournalEntry>>(
    '/v1/accounting/journal-entries',
    { params: { page } },
  )
  return res.data
}

/**
 * GET /v1/accounting/periods
 * Paginated list of Accounting Periods.
 * WEB-001N — OI-3 resolved.
 */
export async function listPeriods(
  page = 1,
): Promise<PaginatedResponse<AccountingPeriod>> {
  const res = await apiClient.get<PaginatedResponse<AccountingPeriod>>(
    '/v1/accounting/periods',
    { params: { page } },
  )
  return res.data
}

/**
 * GET /v1/accounting/posting-rules
 * Paginated list of Posting Rules.
 * WEB-001N — OI-4 resolved.
 */
export async function listPostingRules(
  page = 1,
): Promise<PaginatedResponse<PostingRule>> {
  const res = await apiClient.get<PaginatedResponse<PostingRule>>(
    '/v1/accounting/posting-rules',
    { params: { page } },
  )
  return res.data
}
