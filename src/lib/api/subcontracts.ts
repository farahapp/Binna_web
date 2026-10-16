import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubcontractAgreement {
  id: string
  agreement_number: string
  subcontractor_name: string
  subcontractor_id?: string
  project_id?: string
  title: string
  scope_summary?: string
  contract_value: string | number
  retention_percentage?: string | number
  currency?: string
  status: 'draft' | 'active' | 'completed' | 'cancelled' | string
  start_date?: string
  end_date?: string
  approval_request_id?: string
  signed_by?: string
  notes?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface SubcontractScope {
  id: string
  subcontract_agreement_id: string
  description: string
  quantity?: number
  unit?: string
  unit_rate?: string | number
  total_value?: string | number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface SubcontractProgress {
  id: string
  subcontract_agreement_id: string
  progress_period: string
  percentage_complete: number
  cumulative_percentage: number
  amount_certified?: string | number
  cumulative_amount?: string | number
  notes?: string
  recorded_by?: string
  created_at?: string
  updated_at?: string
}

export interface SubcontractCertificate {
  id: string
  subcontract_agreement_id: string
  certificate_number: string
  subcontract_progress_id: string
  certified_amount: string | number
  issued_date: string
  status?: string
  approved_by?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface ContractValue {
  contract_value?: string | number
  [key: string]: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data
  ) {
    return String((error.response.data as { message: string }).message)
  }
  if (error instanceof Error) return error.message
  return 'حدث خطأ غير متوقع'
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

// ─── Agreement API ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/subcontracts/agreements
 * Return a paginated list of subcontract agreements.
 * WEB-001P — OI-5 resolution.
 */
export async function listSubcontractAgreements(
  page = 1
): Promise<PaginatedResponse<SubcontractAgreement>> {
  const res = await apiClient.get<PaginatedResponse<SubcontractAgreement>>(
    '/v1/subcontracts/agreements',
    { params: { page } }
  )
  return res.data
}

/**
 * POST /api/v1/subcontracts/agreements
 * Create a new subcontract agreement (draft).
 */
export async function createSubcontractAgreement(
  data: Omit<SubcontractAgreement, 'id' | 'status' | 'created_at' | 'updated_at' | 'tenant_slug'>
): Promise<SubcontractAgreement> {
  const res = await apiClient.post<SubcontractAgreement>('/v1/subcontracts/agreements', data)
  return res.data
}

/**
 * GET /api/v1/subcontracts/agreements/{id}
 * Retrieve a subcontract agreement by ID.
 */
export async function getSubcontractAgreement(id: string): Promise<SubcontractAgreement> {
  const res = await apiClient.get<SubcontractAgreement>(`/v1/subcontracts/agreements/${id}`)
  return res.data
}

/**
 * PATCH /api/v1/subcontracts/agreements/{id}/submit
 * Submit agreement for approval.
 */
export async function submitAgreementForApproval(id: string): Promise<SubcontractAgreement> {
  const res = await apiClient.patch<SubcontractAgreement>(
    `/v1/subcontracts/agreements/${id}/submit`
  )
  return res.data
}

/**
 * PATCH /api/v1/subcontracts/agreements/{id}/activate
 * Activate a submitted/approved agreement.
 */
export async function activateAgreement(id: string): Promise<SubcontractAgreement> {
  const res = await apiClient.patch<SubcontractAgreement>(
    `/v1/subcontracts/agreements/${id}/activate`
  )
  return res.data
}

/**
 * PATCH /api/v1/subcontracts/agreements/{id}/complete
 * Mark agreement as completed.
 */
export async function completeAgreement(id: string): Promise<SubcontractAgreement> {
  const res = await apiClient.patch<SubcontractAgreement>(
    `/v1/subcontracts/agreements/${id}/complete`
  )
  return res.data
}

/**
 * PATCH /api/v1/subcontracts/agreements/{id}/cancel
 * Cancel an agreement.
 */
export async function cancelAgreement(id: string): Promise<SubcontractAgreement> {
  const res = await apiClient.patch<SubcontractAgreement>(
    `/v1/subcontracts/agreements/${id}/cancel`
  )
  return res.data
}

/**
 * GET /api/v1/subcontracts/agreements/{id}/value
 * Get the contract value summary.
 */
export async function getAgreementValue(id: string): Promise<ContractValue> {
  const res = await apiClient.get<ContractValue>(`/v1/subcontracts/agreements/${id}/value`)
  return res.data
}

/**
 * POST /api/v1/subcontracts/agreements/{id}/scopes
 * Add a scope item to an agreement.
 */
export async function addSubcontractScope(
  id: string,
  data: Omit<SubcontractScope, 'id' | 'subcontract_agreement_id' | 'created_at' | 'updated_at'>
): Promise<SubcontractScope> {
  const res = await apiClient.post<SubcontractScope>(
    `/v1/subcontracts/agreements/${id}/scopes`,
    data
  )
  return res.data
}

// ─── Progress API ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/subcontracts/agreements/{id}/progress
 * Record a progress update.
 */
export async function recordProgress(
  id: string,
  data: {
    progress_period: string
    percentage_complete: number
    cumulative_percentage: number
    amount_certified?: number
    cumulative_amount?: number
    notes?: string
  }
): Promise<SubcontractProgress> {
  const res = await apiClient.post<SubcontractProgress>(
    `/v1/subcontracts/agreements/${id}/progress`,
    data
  )
  return res.data
}

/**
 * GET /api/v1/subcontracts/agreements/{id}/progress
 * Get all progress records for an agreement.
 */
export async function getAgreementProgress(id: string): Promise<SubcontractProgress[]> {
  const res = await apiClient.get<SubcontractProgress[] | { data: SubcontractProgress[] }>(
    `/v1/subcontracts/agreements/${id}/progress`
  )
  if (Array.isArray(res.data)) return res.data
  if (res.data && 'data' in res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

// ─── Certificate API ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/subcontracts/agreements/{id}/certificates
 * Issue a payment certificate.
 */
export async function issueCertificate(
  id: string,
  data: {
    certificate_number: string
    subcontract_progress_id: string
    certified_amount: number
    issued_date: string
    notes?: string
  }
): Promise<SubcontractCertificate> {
  const res = await apiClient.post<SubcontractCertificate>(
    `/v1/subcontracts/agreements/${id}/certificates`,
    data
  )
  return res.data
}

/**
 * PATCH /api/v1/subcontracts/certificates/{id}/approve
 * Approve a payment certificate.
 */
export async function approveCertificate(id: string): Promise<SubcontractCertificate> {
  const res = await apiClient.patch<SubcontractCertificate>(
    `/v1/subcontracts/certificates/${id}/approve`
  )
  return res.data
}
