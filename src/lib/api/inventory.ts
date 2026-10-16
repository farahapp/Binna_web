import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string
  name: string
  description?: string
  sku?: string
  unit?: string
  category?: string
  reorder_level?: number
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface StockLevel {
  id?: string
  item_id?: string
  warehouse?: string
  location?: string
  quantity?: number
  reserved_quantity?: number
  available_quantity?: number
  [key: string]: unknown
}

export interface TotalQuantity {
  total_quantity?: number
  [key: string]: unknown
}

export interface AssertStockResult {
  sufficient?: boolean
  available?: number
  requested?: number
  [key: string]: unknown
}

export interface IssueStockPayload {
  quantity: number
  project_id?: string
  reference?: string
  notes?: string
}

export interface TransferStockPayload {
  quantity: number
  from_warehouse?: string
  to_warehouse?: string
  notes?: string
}

export interface GoodsReceiptNote {
  id: string
  purchase_order_id?: string
  received_by?: string
  received_date?: string
  status?: string
  notes?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface CreateGRNPayload {
  purchase_order_id?: string
  received_by?: string
  received_date?: string
  notes?: string
}

export interface GRNItem {
  id?: string
  inventory_item_id: string
  quantity_received: number
  unit?: string
  notes?: string
  [key: string]: unknown
}

export interface CreateGRNItemPayload {
  inventory_item_id: string
  quantity_received: number
  unit?: string
  notes?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

/**
 * listGRNs — GET /api/v1/inventory/grns
 * WEB-001P — OI-4 resolution.
 */
export async function listGRNs(
  page = 1
): Promise<PaginatedResponse<GoodsReceiptNote>> {
  const res = await apiClient.get<PaginatedResponse<GoodsReceiptNote>>(
    '/v1/inventory/grns',
    { params: { page } }
  )
  return res.data
}

export function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    if (res?.data?.message) return res.data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

// ─── Inventory Items ──────────────────────────────────────────────────────────

export async function listInventoryItems(
  page = 1
): Promise<PaginatedResponse<InventoryItem>> {
  const res = await apiClient.get<PaginatedResponse<InventoryItem>>(
    '/v1/inventory/items',
    { params: { page } }
  )
  return res.data
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const res = await apiClient.get<InventoryItem | { data: InventoryItem }>(
    `/v1/inventory/items/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: InventoryItem }).data
    : (res.data as InventoryItem)
}

export async function getItemStockLevel(id: string): Promise<StockLevel> {
  const res = await apiClient.get<StockLevel | { data: StockLevel }>(
    `/v1/inventory/items/${id}/stock-level`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: StockLevel }).data
    : (res.data as StockLevel)
}

export async function listItemStockLevels(id: string): Promise<StockLevel[]> {
  const res = await apiClient.get<StockLevel[] | { data: StockLevel[] }>(
    `/v1/inventory/items/${id}/stock-levels`
  )
  return Array.isArray(res.data) ? res.data : (res.data as { data: StockLevel[] }).data
}

export async function getItemTotalQuantity(id: string): Promise<TotalQuantity> {
  const res = await apiClient.get<TotalQuantity>(
    `/v1/inventory/items/${id}/total-quantity`
  )
  return res.data
}

export async function issueStock(
  id: string,
  payload: IssueStockPayload
): Promise<unknown> {
  const res = await apiClient.post<unknown>(
    `/v1/inventory/items/${id}/issue`,
    payload
  )
  return res.data
}

export async function transferStock(
  id: string,
  payload: TransferStockPayload
): Promise<unknown> {
  const res = await apiClient.post<unknown>(
    `/v1/inventory/items/${id}/transfer`,
    payload
  )
  return res.data
}

// ─── Goods Receipt Notes (GRN) ────────────────────────────────────────────────

export async function createGRN(payload: CreateGRNPayload): Promise<GoodsReceiptNote> {
  const res = await apiClient.post<GoodsReceiptNote | { data: GoodsReceiptNote }>(
    '/v1/inventory/grns',
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: GoodsReceiptNote }).data
    : (res.data as GoodsReceiptNote)
}

export async function getGRN(id: string): Promise<GoodsReceiptNote> {
  const res = await apiClient.get<GoodsReceiptNote | { data: GoodsReceiptNote }>(
    `/v1/inventory/grns/${id}`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: GoodsReceiptNote }).data
    : (res.data as GoodsReceiptNote)
}

export async function addGRNItem(
  grnId: string,
  payload: CreateGRNItemPayload
): Promise<GRNItem> {
  const res = await apiClient.post<GRNItem | { data: GRNItem }>(
    `/v1/inventory/grns/${grnId}/items`,
    payload
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: GRNItem }).data
    : (res.data as GRNItem)
}

export async function confirmGRN(id: string): Promise<GoodsReceiptNote> {
  const res = await apiClient.patch<GoodsReceiptNote | { data: GoodsReceiptNote }>(
    `/v1/inventory/grns/${id}/confirm`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: GoodsReceiptNote }).data
    : (res.data as GoodsReceiptNote)
}

export async function cancelGRN(id: string): Promise<GoodsReceiptNote> {
  const res = await apiClient.patch<GoodsReceiptNote | { data: GoodsReceiptNote }>(
    `/v1/inventory/grns/${id}/cancel`
  )
  return 'data' in res.data && !Array.isArray(res.data)
    ? (res.data as { data: GoodsReceiptNote }).data
    : (res.data as GoodsReceiptNote)
}
