import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseRequest {
  id: string
  title: string
  description?: string
  project_id?: string
  required_date?: string
  requested_by?: string
  status?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreatePurchaseRequestPayload {
  title: string
  description?: string
  project_id?: string
  required_date?: string
}

export interface RFQ {
  id: string
  title: string
  purchase_request_id?: string
  description?: string
  deadline?: string
  status?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreateRFQPayload {
  title: string
  purchase_request_id?: string
  description?: string
  deadline?: string
}

export interface SupplierQuotation {
  id?: string
  supplier_id: string
  total_amount: number
  currency?: string
  notes?: string
  valid_until?: string
  [key: string]: unknown
}

export interface CreateSupplierQuotationPayload {
  supplier_id: string
  total_amount: number
  currency?: string
  notes?: string
  valid_until?: string
}

export interface PurchaseOrder {
  id: string
  supplier_id: string
  purchase_request_id?: string
  po_number?: string
  total_amount?: number
  currency?: string
  issued_date?: string
  expected_delivery_date?: string
  notes?: string
  status?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreatePurchaseOrderPayload {
  supplier_id: string
  purchase_request_id?: string
  po_number?: string
  total_amount?: number
  currency?: string
  issued_date?: string
  expected_delivery_date?: string
  notes?: string
}

export interface POItem {
  id?: string
  description: string
  quantity?: number
  unit?: string
  unit_price?: number
  total_price?: number
  [key: string]: unknown
}

export interface CreatePOItemPayload {
  description: string
  quantity?: number
  unit?: string
  unit_price?: number
  total_price?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
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

// ─── Purchase Requests ────────────────────────────────────────────────────────

export async function createPurchaseRequest(
  payload: CreatePurchaseRequestPayload
): Promise<PurchaseRequest> {
  const res = await apiClient.post<PurchaseRequest | { data: PurchaseRequest }>(
    '/v1/procurement/purchase-requests',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseRequest }).data
    : (res.data as PurchaseRequest)
}

export async function getPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const res = await apiClient.get<PurchaseRequest | { data: PurchaseRequest }>(
    `/v1/procurement/purchase-requests/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseRequest }).data
    : (res.data as PurchaseRequest)
}

export async function submitPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const res = await apiClient.patch<PurchaseRequest | { data: PurchaseRequest }>(
    `/v1/procurement/purchase-requests/${id}/submit`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseRequest }).data
    : (res.data as PurchaseRequest)
}

export async function approvePurchaseRequest(id: string): Promise<PurchaseRequest> {
  const res = await apiClient.patch<PurchaseRequest | { data: PurchaseRequest }>(
    `/v1/procurement/purchase-requests/${id}/approve`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseRequest }).data
    : (res.data as PurchaseRequest)
}

export async function rejectPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const res = await apiClient.patch<PurchaseRequest | { data: PurchaseRequest }>(
    `/v1/procurement/purchase-requests/${id}/reject`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseRequest }).data
    : (res.data as PurchaseRequest)
}

export async function cancelPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const res = await apiClient.patch<PurchaseRequest | { data: PurchaseRequest }>(
    `/v1/procurement/purchase-requests/${id}/cancel`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseRequest }).data
    : (res.data as PurchaseRequest)
}

// ─── RFQs ─────────────────────────────────────────────────────────────────────

export async function createRFQ(payload: CreateRFQPayload): Promise<RFQ> {
  const res = await apiClient.post<RFQ | { data: RFQ }>(
    '/v1/procurement/rfqs',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: RFQ }).data
    : (res.data as RFQ)
}

export async function getRFQ(id: string): Promise<RFQ> {
  const res = await apiClient.get<RFQ | { data: RFQ }>(
    `/v1/procurement/rfqs/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: RFQ }).data
    : (res.data as RFQ)
}

export async function sendRFQ(id: string): Promise<RFQ> {
  const res = await apiClient.patch<RFQ | { data: RFQ }>(
    `/v1/procurement/rfqs/${id}/send`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: RFQ }).data
    : (res.data as RFQ)
}

export async function closeRFQ(id: string): Promise<RFQ> {
  const res = await apiClient.patch<RFQ | { data: RFQ }>(
    `/v1/procurement/rfqs/${id}/close`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: RFQ }).data
    : (res.data as RFQ)
}

export async function submitRFQQuotation(
  rfqId: string,
  payload: CreateSupplierQuotationPayload
): Promise<SupplierQuotation> {
  const res = await apiClient.post<SupplierQuotation | { data: SupplierQuotation }>(
    `/v1/procurement/rfqs/${rfqId}/quotations`,
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: SupplierQuotation }).data
    : (res.data as SupplierQuotation)
}

export async function compareRFQQuotations(rfqId: string): Promise<unknown> {
  const res = await apiClient.get<unknown>(
    `/v1/procurement/rfqs/${rfqId}/quotations/compare`
  )
  return res.data
}

export async function selectRFQQuotation(
  rfqId: string,
  quotationId: string
): Promise<unknown> {
  const res = await apiClient.patch<unknown>(
    `/v1/procurement/rfqs/${rfqId}/quotations/${quotationId}/select`
  )
  return res.data
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function listPurchaseOrders(
  page = 1
): Promise<PaginatedResponse<PurchaseOrder>> {
  const res = await apiClient.get<PaginatedResponse<PurchaseOrder>>(
    '/v1/procurement/purchase-orders',
    { params: { page } }
  )
  return res.data
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload
): Promise<PurchaseOrder> {
  const res = await apiClient.post<PurchaseOrder | { data: PurchaseOrder }>(
    '/v1/procurement/purchase-orders',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseOrder }).data
    : (res.data as PurchaseOrder)
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await apiClient.get<PurchaseOrder | { data: PurchaseOrder }>(
    `/v1/procurement/purchase-orders/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseOrder }).data
    : (res.data as PurchaseOrder)
}

export async function addPOItem(
  poId: string,
  payload: CreatePOItemPayload
): Promise<POItem> {
  const res = await apiClient.post<POItem | { data: POItem }>(
    `/v1/procurement/purchase-orders/${poId}/items`,
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: POItem }).data
    : (res.data as POItem)
}

export async function submitPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await apiClient.patch<PurchaseOrder | { data: PurchaseOrder }>(
    `/v1/procurement/purchase-orders/${id}/submit`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseOrder }).data
    : (res.data as PurchaseOrder)
}

export async function approvePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await apiClient.patch<PurchaseOrder | { data: PurchaseOrder }>(
    `/v1/procurement/purchase-orders/${id}/approve`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseOrder }).data
    : (res.data as PurchaseOrder)
}

export async function issuePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await apiClient.patch<PurchaseOrder | { data: PurchaseOrder }>(
    `/v1/procurement/purchase-orders/${id}/issue`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseOrder }).data
    : (res.data as PurchaseOrder)
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await apiClient.patch<PurchaseOrder | { data: PurchaseOrder }>(
    `/v1/procurement/purchase-orders/${id}/cancel`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: PurchaseOrder }).data
    : (res.data as PurchaseOrder)
}
