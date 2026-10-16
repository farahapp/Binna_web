import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  asset_code: string
  name: string
  description?: string
  category?: string
  asset_type?: 'owned' | 'leased' | string
  status?: string
  acquisition_date?: string
  acquisition_cost?: string | number
  currency?: string
  depreciation_rate?: string | number
  notes?: string
  tenant_slug?: string
  created_at?: string
  updated_at?: string
}

export interface PaginatedAssets {
  data: Asset[]
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export interface EquipmentAllocation {
  id: string
  asset_id: string
  project_id?: string
  allocated_by?: string
  allocation_date?: string
  release_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface MaintenanceRecord {
  id: string
  asset_id: string
  maintenance_type?: string
  description?: string
  scheduled_date?: string
  completed_date?: string
  cost?: string | number
  performed_by?: string
  status?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface EquipmentCostAllocation {
  id: string
  asset_id: string
  project_id?: string
  cost_code?: string
  amount: string | number
  period?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── Asset API ────────────────────────────────────────────────────────────────

/** POST /api/v1/equipment/assets */
export async function registerAsset(
  data: Omit<Asset, 'id' | 'status' | 'created_at' | 'updated_at' | 'tenant_slug'>
): Promise<Asset> {
  const res = await apiClient.post<Asset>('/v1/equipment/assets', data)
  return res.data
}

/** GET /api/v1/equipment/assets/{id} */
export async function getAsset(id: string): Promise<Asset> {
  const res = await apiClient.get<Asset>(`/v1/equipment/assets/${id}`)
  return res.data
}

/** GET /api/v1/equipment/assets */
export async function listAssets(page = 1): Promise<PaginatedAssets> {
  const res = await apiClient.get<PaginatedAssets | Asset[]>('/v1/equipment/assets', {
    params: { page },
  })
  if (Array.isArray(res.data)) return { data: res.data }
  return res.data as PaginatedAssets
}

/** POST /api/v1/equipment/assets/{id}/allocate */
export async function allocateAsset(
  id: string,
  data: { project_id?: string; allocation_date?: string; notes?: string }
): Promise<EquipmentAllocation> {
  const res = await apiClient.post<EquipmentAllocation>(
    `/v1/equipment/assets/${id}/allocate`,
    data
  )
  return res.data
}

/** POST /api/v1/equipment/assets/{id}/release */
export async function releaseAsset(
  id: string,
  data?: { release_date?: string; notes?: string }
): Promise<EquipmentAllocation> {
  const res = await apiClient.post<EquipmentAllocation>(
    `/v1/equipment/assets/${id}/release`,
    data ?? {}
  )
  return res.data
}

/** POST /api/v1/equipment/assets/{id}/maintenance */
export async function scheduleMaintenance(
  id: string,
  data: {
    maintenance_type?: string
    description?: string
    scheduled_date?: string
    cost?: number
    performed_by?: string
    notes?: string
  }
): Promise<MaintenanceRecord> {
  const res = await apiClient.post<MaintenanceRecord>(
    `/v1/equipment/assets/${id}/maintenance`,
    data
  )
  return res.data
}

/** POST /api/v1/equipment/maintenance/{id}/complete */
export async function completeMaintenance(
  maintenanceId: string,
  data?: { completed_date?: string; notes?: string }
): Promise<MaintenanceRecord> {
  const res = await apiClient.post<MaintenanceRecord>(
    `/v1/equipment/maintenance/${maintenanceId}/complete`,
    data ?? {}
  )
  return res.data
}

/** POST /api/v1/equipment/assets/{id}/decommission */
export async function decommissionAsset(
  id: string,
  data?: { notes?: string }
): Promise<Asset> {
  const res = await apiClient.post<Asset>(
    `/v1/equipment/assets/${id}/decommission`,
    data ?? {}
  )
  return res.data
}

/** POST /api/v1/equipment/assets/{id}/cost-allocation */
export async function createEquipmentCostAllocation(
  id: string,
  data: {
    project_id?: string
    cost_code?: string
    amount: number
    period?: string
    notes?: string
  }
): Promise<EquipmentCostAllocation> {
  const res = await apiClient.post<EquipmentCostAllocation>(
    `/v1/equipment/assets/${id}/cost-allocation`,
    data
  )
  return res.data
}
