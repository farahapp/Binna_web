import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientType = 'company' | 'individual'

export interface CrmClient {
  id: number
  name: string
  type: ClientType
  trade_name?: string
  email?: string
  phone?: string
  country?: string
  city?: string
  created_at?: string
  updated_at?: string
}

export interface CreateClientPayload {
  name: string
  type: ClientType
  trade_name?: string
  email?: string
  phone?: string
  country?: string
  city?: string
}

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export interface Lead {
  id: number
  client_id: number
  title: string
  description?: string
  source?: string
  stage: LeadStage
  client?: CrmClient
  created_at?: string
  updated_at?: string
}

export interface CreateLeadPayload {
  client_id: number
  title: string
  description?: string
  source?: string
}

export type OpportunityStage = 'open' | 'won' | 'lost' | 'cancelled'

export interface Opportunity {
  id: number
  client_id: number
  title: string
  value?: number
  expected_close_date?: string
  stage: OpportunityStage
  client?: CrmClient
  created_at?: string
  updated_at?: string
}

export interface CreateOpportunityPayload {
  client_id: number
  title: string
  value?: number
  expected_close_date?: string
}

export type ActivityEntityType = 'client' | 'lead' | 'opportunity' | 'contact'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task'

export interface CreateActivityPayload {
  entity_type: ActivityEntityType
  entity_id: number
  type: ActivityType
  notes?: string
}

export interface Contact {
  id: number
  name: string
  email?: string
  phone?: string
  client_id?: number
  created_at?: string
  updated_at?: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    if (res?.data?.message) return res.data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(): Promise<CrmClient[]> {
  const res = await apiClient.get<CrmClient[] | { data: CrmClient[] }>('/v1/crm/clients')
  return Array.isArray(res.data) ? res.data : res.data.data
}

export async function createClient(payload: CreateClientPayload): Promise<CrmClient> {
  const res = await apiClient.post<CrmClient | { data: CrmClient }>('/v1/crm/clients', payload)
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: CrmClient }).data : (res.data as CrmClient)
}

export async function getClient(id: number): Promise<CrmClient> {
  const res = await apiClient.get<CrmClient | { data: CrmClient }>(`/v1/crm/clients/${id}`)
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: CrmClient }).data : (res.data as CrmClient)
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getContact(id: number): Promise<Contact> {
  const res = await apiClient.get<Contact | { data: Contact }>(`/v1/crm/contacts/${id}`)
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Contact }).data : (res.data as Contact)
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function getLeads(stage?: LeadStage): Promise<Lead[]> {
  const params = stage ? { stage } : {}
  const res = await apiClient.get<Lead[] | { data: Lead[] }>('/v1/crm/leads', { params })
  return Array.isArray(res.data) ? res.data : res.data.data
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  const res = await apiClient.post<Lead | { data: Lead }>('/v1/crm/leads', payload)
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Lead }).data : (res.data as Lead)
}

export async function updateLeadStage(id: number, stage: LeadStage): Promise<Lead> {
  const res = await apiClient.patch<Lead | { data: Lead }>(`/v1/crm/leads/${id}/stage`, { stage })
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Lead }).data : (res.data as Lead)
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function getOpportunities(stage?: OpportunityStage): Promise<Opportunity[]> {
  const params = stage ? { stage } : {}
  const res = await apiClient.get<Opportunity[] | { data: Opportunity[] }>('/v1/crm/opportunities', { params })
  return Array.isArray(res.data) ? res.data : res.data.data
}

export async function createOpportunity(payload: CreateOpportunityPayload): Promise<Opportunity> {
  const res = await apiClient.post<Opportunity | { data: Opportunity }>('/v1/crm/opportunities', payload)
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Opportunity }).data : (res.data as Opportunity)
}

export async function updateOpportunityStage(id: number, stage: OpportunityStage): Promise<Opportunity> {
  const res = await apiClient.patch<Opportunity | { data: Opportunity }>(`/v1/crm/opportunities/${id}/stage`, { stage })
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Opportunity }).data : (res.data as Opportunity)
}

export async function markOpportunityWon(id: number): Promise<Opportunity> {
  const res = await apiClient.patch<Opportunity | { data: Opportunity }>(`/v1/crm/opportunities/${id}/won`)
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Opportunity }).data : (res.data as Opportunity)
}

export async function markOpportunityLost(id: number, reason?: string): Promise<Opportunity> {
  const res = await apiClient.patch<Opportunity | { data: Opportunity }>(`/v1/crm/opportunities/${id}/lost`, { reason })
  return 'data' in res.data && !Array.isArray(res.data) ? (res.data as { data: Opportunity }).data : (res.data as Opportunity)
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function createActivity(payload: CreateActivityPayload): Promise<void> {
  await apiClient.post('/v1/crm/activities', payload)
}

// Re-export for convenience
export { extractMessage }
