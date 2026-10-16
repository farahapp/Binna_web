import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string
  tenant_slug?: string
  project_id?: string
  name: string
  total_amount: number
  currency?: string
  fiscal_year?: number
  description?: string
  status?: string
  approved_by?: string
  approved_at?: string
  created_at?: string
  updated_at?: string
}

export interface CreateBudgetPayload {
  name: string
  total_amount: number
  project_id?: string
  currency?: string
  fiscal_year?: number
  description?: string
}

export interface ApproveBudgetPayload {
  notes?: string
}

export interface Commitment {
  id: string
  tenant_slug?: string
  project_id?: string
  budget_id?: string
  description: string
  amount: number
  currency?: string
  committed_by?: string
  committed_at?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface RecordCommitmentPayload {
  project_id: string
  budget_id?: string
  description: string
  amount: number
  currency?: string
}

export interface CommitmentBalance {
  project_id: string
  total_committed: number
  total_actual: number
  balance: number
  currency?: string
  [key: string]: unknown
}

export interface ActualCost {
  id: string
  tenant_slug?: string
  project_id?: string
  budget_id?: string
  description: string
  amount: number
  currency?: string
  cost_date?: string
  recorded_by?: string
  created_at?: string
  updated_at?: string
}

export interface RecordActualCostPayload {
  project_id: string
  budget_id?: string
  description: string
  amount: number
  currency?: string
  cost_date?: string
}

export interface CostPosition {
  project_id: string
  budget_total: number
  total_committed: number
  total_actual: number
  variance: number
  currency?: string
  [key: string]: unknown
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    if (res?.data?.message) return res.data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export async function getBudget(projectId: string): Promise<Budget> {
  const res = await apiClient.get<Budget>(`/v1/cost-control/budgets/${projectId}`)
  return res.data
}

export async function createBudget(payload: CreateBudgetPayload): Promise<Budget> {
  const res = await apiClient.post<Budget>('/v1/cost-control/budgets', payload)
  return res.data
}

export async function approveBudget(budgetId: string, payload: ApproveBudgetPayload = {}): Promise<Budget> {
  const res = await apiClient.patch<Budget>(`/v1/cost-control/budgets/${budgetId}/approve`, payload)
  return res.data
}

// ─── Commitments ──────────────────────────────────────────────────────────────

export async function recordCommitment(payload: RecordCommitmentPayload): Promise<Commitment> {
  const res = await apiClient.post<Commitment>('/v1/cost-control/commitments', payload)
  return res.data
}

export async function getCommitmentBalance(projectId: string): Promise<CommitmentBalance> {
  const res = await apiClient.get<CommitmentBalance>(
    `/v1/cost-control/projects/${projectId}/commitment-balance`
  )
  return res.data
}

// ─── Actual Costs ─────────────────────────────────────────────────────────────

export async function recordActualCost(payload: RecordActualCostPayload): Promise<ActualCost> {
  const res = await apiClient.post<ActualCost>('/v1/cost-control/actual-costs', payload)
  return res.data
}

// ─── Cost Position ────────────────────────────────────────────────────────────

export async function getCostPosition(projectId: string): Promise<CostPosition> {
  const res = await apiClient.get<CostPosition>(
    `/v1/cost-control/projects/${projectId}/cost-position`
  )
  return res.data
}
