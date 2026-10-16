import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tender {
  id: number
  title: string
  client_id: string
  description?: string
  due_date?: string
  status?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreateTenderPayload {
  title: string
  client_id: string
  description?: string
  due_date?: string
}

export interface Contract {
  id: number
  contract_number: string
  client_id: string
  contract_value: number
  start_date?: string
  end_date?: string
  status?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreateContractPayload {
  contract_number: string
  client_id: string
  contract_value: number
  start_date?: string
  end_date?: string
}

export interface ContractVariation {
  id: number
  contract_id: string
  reason: string
  variation_number?: string
  scope_description?: string
  value_change?: number
  notes?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface CreateVariationPayload {
  contract_id: string
  reason: string
  variation_number?: string
  scope_description?: string
  value_change?: number
  notes?: string
}

export interface BOQ {
  id: number
  title: string
  type: 'tender_boq' | 'contract_boq' | 'variation_boq'
  tender_id?: string
  sections?: unknown[]
  created_at?: string
  updated_at?: string
}

export interface CreateBOQPayload {
  title: string
  type: 'tender_boq' | 'contract_boq' | 'variation_boq'
  tender_id?: string
  sections?: unknown[]
}

export interface Quotation {
  id: number
  quotation_number: string
  client_id: string
  tender_id?: string
  boq_id?: string
  total_value?: number
  title?: string
  quotation_date?: string
  validity_date?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface CreateQuotationPayload {
  quotation_number: string
  client_id: string
  tender_id?: string
  boq_id?: string
  total_value?: number
  title?: string
  quotation_date?: string
  validity_date?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    if (res?.data?.message) return res.data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

// ─── Tenders ──────────────────────────────────────────────────────────────────

export async function getTenders(page = 1): Promise<PaginatedResponse<Tender>> {
  const res = await apiClient.get<PaginatedResponse<Tender>>('/v1/commercial/tenders', {
    params: { page },
  })
  return res.data
}

export async function createTender(payload: CreateTenderPayload): Promise<Tender> {
  const res = await apiClient.post<Tender | { data: Tender }>('/v1/commercial/tenders', payload)
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Tender }).data
    : (res.data as Tender)
}

export async function awardTender(id: number): Promise<Tender> {
  const res = await apiClient.patch<Tender | { data: Tender }>(
    `/v1/commercial/tenders/${id}/award`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Tender }).data
    : (res.data as Tender)
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function getContract(id: number | string): Promise<Contract> {
  const res = await apiClient.get<Contract | { data: Contract }>(
    `/v1/commercial/contracts/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Contract }).data
    : (res.data as Contract)
}

export async function getContractValue(id: number | string): Promise<unknown> {
  const res = await apiClient.get<unknown>(`/v1/commercial/contracts/${id}/value`)
  return res.data
}

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const res = await apiClient.post<Contract | { data: Contract }>(
    '/v1/commercial/contracts',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Contract }).data
    : (res.data as Contract)
}

export async function signContract(id: number | string): Promise<Contract> {
  const res = await apiClient.patch<Contract | { data: Contract }>(
    `/v1/commercial/contracts/${id}/sign`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Contract }).data
    : (res.data as Contract)
}

export async function submitContractForApproval(
  id: number | string,
  requestedBy: string
): Promise<{ contract: Contract; approval_request: unknown }> {
  const res = await apiClient.post<{ contract: Contract; approval_request: unknown }>(
    `/v1/commercial/contracts/${id}/submit-for-approval`,
    { requested_by: requestedBy }
  )
  return res.data
}

// ─── Variations ───────────────────────────────────────────────────────────────

export async function listVariations(contractId: number | string): Promise<ContractVariation[]> {
  const res = await apiClient.get<ContractVariation[] | { data: ContractVariation[] }>(
    `/v1/commercial/contracts/${contractId}/variations`
  )
  return Array.isArray(res.data) ? res.data : res.data.data
}

export async function getVariation(id: number | string): Promise<ContractVariation> {
  const res = await apiClient.get<ContractVariation | { data: ContractVariation }>(
    `/v1/commercial/variations/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ContractVariation }).data
    : (res.data as ContractVariation)
}

export async function createVariation(
  payload: CreateVariationPayload
): Promise<ContractVariation> {
  const res = await apiClient.post<ContractVariation | { data: ContractVariation }>(
    '/v1/commercial/variations',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ContractVariation }).data
    : (res.data as ContractVariation)
}

export async function approveVariation(id: number | string): Promise<ContractVariation> {
  const res = await apiClient.patch<ContractVariation | { data: ContractVariation }>(
    `/v1/commercial/variations/${id}/approve`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ContractVariation }).data
    : (res.data as ContractVariation)
}

export async function rejectVariation(id: number | string): Promise<ContractVariation> {
  const res = await apiClient.patch<ContractVariation | { data: ContractVariation }>(
    `/v1/commercial/variations/${id}/reject`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: ContractVariation }).data
    : (res.data as ContractVariation)
}

// ─── BOQs ─────────────────────────────────────────────────────────────────────

export async function getBOQ(id: number | string): Promise<BOQ> {
  const res = await apiClient.get<BOQ | { data: BOQ }>(`/v1/commercial/boqs/${id}`)
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: BOQ }).data
    : (res.data as BOQ)
}

export async function createBOQ(payload: CreateBOQPayload): Promise<BOQ> {
  const res = await apiClient.post<BOQ | { data: BOQ }>('/v1/commercial/boqs', payload)
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: BOQ }).data
    : (res.data as BOQ)
}

// ─── Quotations ───────────────────────────────────────────────────────────────

export async function getQuotation(id: number | string): Promise<Quotation> {
  const res = await apiClient.get<Quotation | { data: Quotation }>(
    `/v1/commercial/quotations/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Quotation }).data
    : (res.data as Quotation)
}

export async function createQuotation(payload: CreateQuotationPayload): Promise<Quotation> {
  const res = await apiClient.post<Quotation | { data: Quotation }>(
    '/v1/commercial/quotations',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Quotation }).data
    : (res.data as Quotation)
}

export async function listContracts(page = 1): Promise<PaginatedResponse<Contract>> {
  const res = await apiClient.get<PaginatedResponse<Contract>>('/v1/commercial/contracts', {
    params: { page },
  })
  return res.data
}

export async function listQuotations(page = 1): Promise<PaginatedResponse<Quotation>> {
  const res = await apiClient.get<PaginatedResponse<Quotation>>('/v1/commercial/quotations', {
    params: { page },
  })
  return res.data
}

export async function acceptQuotation(id: number | string): Promise<Quotation> {
  const res = await apiClient.patch<Quotation | { data: Quotation }>(
    `/v1/commercial/quotations/${id}/accept`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: Quotation }).data
    : (res.data as Quotation)
}

export async function submitQuotationForApproval(
  id: number | string,
  requestedBy: string
): Promise<{ quotation: Quotation; approval_request: unknown }> {
  const res = await apiClient.post<{ quotation: Quotation; approval_request: unknown }>(
    `/v1/commercial/quotations/${id}/submit-for-approval`,
    { requested_by: requestedBy }
  )
  return res.data
}
