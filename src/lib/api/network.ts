/**
 * BINAA2 — Network API Client
 *
 * WEB-001A — Network Web Foundation
 * Covers: Network Profiles + Verification (NETWORK-001 + Verification)
 *
 * Backend authority: all validation, authorization, and business logic
 * enforced by Laravel 12 REST API. This client is a consumer only.
 *
 * Authentication: Sanctum SPA Cookie (withCredentials: true) — same as all
 * other Web API clients. No PAT stored.
 *
 * Cross-tenant: Network entities live in the global mysql schema.
 * X-Tenant header is sent automatically by apiClient interceptor.
 */

import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NetworkProfileType =
  | 'owner'
  | 'engineer'
  | 'contractor'
  | 'main_contractor'
  | 'subcontractor'
  | 'supplier'

export type NetworkProfileStatus = 'draft' | 'active' | 'suspended' | 'deactivated'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface NetworkProfile {
  id: string
  company_name: string
  profile_type: NetworkProfileType
  status: NetworkProfileStatus
  region?: string | null
  specializations?: string[] | null
  contact_email?: string | null
  contact_phone?: string | null
  website?: string | null
  description?: string | null
  managed_by_tenant_slug?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreateNetworkProfilePayload {
  company_name: string
  profile_type: NetworkProfileType
  region?: string
  specializations?: string[]
  contact_email?: string
  contact_phone?: string
  website?: string
  description?: string
}

export interface UpdateNetworkProfilePayload {
  company_name?: string
  region?: string | null
  specializations?: string[] | null
  contact_email?: string | null
  contact_phone?: string | null
  website?: string | null
  description?: string | null
}

export interface NetworkProfileFilters {
  type?: NetworkProfileType
  status?: NetworkProfileStatus
  region?: string
  page?: number
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

// Verification types

export interface VerificationEvidence {
  business_registration: string
  professional_license?: string
  supporting_documents?: string[]
}

export interface VerificationPublicStatus {
  profile_id: string
  status: VerificationStatus
  verified_at?: string | null
}

export interface VerificationOwnView {
  id: string
  network_profile_id: string
  status: VerificationStatus
  submitted_at?: string | null
  reviewed_at?: string | null
  verified_at?: string | null
  revoked_at?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractNetworkMessage(error: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const res = error.response as { data?: { message?: string; error?: string; errors?: Record<string, string[]> } }
    if (res.data?.message) return res.data.message
    if (res.data?.error) return res.data.error
    if (res.data?.errors) {
      const firstKey = Object.keys(res.data.errors)[0]
      if (firstKey) return res.data.errors[firstKey][0]
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

export const PROFILE_TYPE_LABELS: Record<NetworkProfileType, string> = {
  owner: 'مالك / صاحب عمل',
  engineer: 'مهندس / استشاري',
  contractor: 'مقاول',
  main_contractor: 'مقاول رئيسي',
  subcontractor: 'مقاول من الباطن',
  supplier: 'مورد',
}

export const TENDER_VISIBILITY_LABELS: Record<TenderVisibility, string> = {
  public: 'عام',
  private: 'خاص',
  invited: 'بالدعوة',
  matched: 'مطابق',
}

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  draft: 'مسودة',
  published: 'منشور',
  closed: 'مغلق',
  awarded: 'مُرسَّى',
}

// ─── Network Profile API ──────────────────────────────────────────────────────

/**
 * POST /api/v1/network/profiles
 * Create a new Network Profile.
 */
export async function createNetworkProfile(
  payload: CreateNetworkProfilePayload
): Promise<NetworkProfile> {
  const res = await apiClient.post<{ data: NetworkProfile }>('/v1/network/profiles', payload)
  return res.data.data
}

/**
 * GET /api/v1/network/profiles
 * List Network Profiles with optional filters.
 */
export async function listNetworkProfiles(
  filters: NetworkProfileFilters = {}
): Promise<PaginatedResponse<NetworkProfile>> {
  const { page = 1, ...rest } = filters
  const res = await apiClient.get<PaginatedResponse<NetworkProfile>>('/v1/network/profiles', {
    params: { page, ...rest },
  })
  return res.data
}

/**
 * GET /api/v1/network/profiles/{id}
 * Get a single Network Profile by ID.
 */
export async function getNetworkProfile(id: string): Promise<NetworkProfile> {
  const res = await apiClient.get<{ data: NetworkProfile }>(`/v1/network/profiles/${id}`)
  return res.data.data
}

/**
 * PATCH /api/v1/network/profiles/{id}
 * Update a Network Profile.
 */
export async function updateNetworkProfile(
  id: string,
  payload: UpdateNetworkProfilePayload
): Promise<NetworkProfile> {
  const res = await apiClient.patch<{ data: NetworkProfile }>(`/v1/network/profiles/${id}`, payload)
  return res.data.data
}

/**
 * PATCH /api/v1/network/profiles/{id}/activate
 * Activate a Network Profile (draft → active).
 */
export async function activateNetworkProfile(id: string): Promise<NetworkProfile> {
  const res = await apiClient.patch<{ data: NetworkProfile }>(
    `/v1/network/profiles/${id}/activate`
  )
  return res.data.data
}

// ─── Network Profile Verification API ────────────────────────────────────────

/**
 * POST /api/v1/network/profiles/{profileId}/verification
 * Submit a verification request with evidence.
 * Trust Layer only — does NOT block Profile creation or Bid submission.
 */
export async function submitVerification(
  profileId: string,
  evidence: VerificationEvidence
): Promise<VerificationOwnView> {
  const res = await apiClient.post<{ data: VerificationOwnView }>(
    `/v1/network/profiles/${profileId}/verification`,
    { evidence }
  )
  return res.data.data
}

/**
 * GET /api/v1/network/profiles/{profileId}/verification/status
 * Get the public verification status of a profile.
 */
export async function getVerificationStatus(
  profileId: string
): Promise<VerificationPublicStatus> {
  const res = await apiClient.get<{ data: VerificationPublicStatus }>(
    `/v1/network/profiles/${profileId}/verification/status`
  )
  return res.data.data
}

/**
 * GET /api/v1/network/profiles/{profileId}/verification
 * Get the owner's own verification view (restricted to profile owner's tenant).
 */
export async function getOwnVerification(profileId: string): Promise<VerificationOwnView> {
  const res = await apiClient.get<{ data: VerificationOwnView }>(
    `/v1/network/profiles/${profileId}/verification`
  )
  return res.data.data
}

// ─── Network Bid Types ────────────────────────────────────────────────────────

/**
 * WEB-001C — Network Bid Submission, Revision & Withdrawal
 *
 * Contract derived from:
 *   - backend/app/Network/BidController.php
 *   - backend/app/Network/BidService.php
 *   - backend/app/Network/NetworkBid.php
 *   - backend/app/Network/NetworkBidVersion.php
 *   - backend/routes/api.php  (POST /bids, GET /bids/{id},
 *                               POST /bids/{id}/revisions, PATCH /bids/{id}/withdraw)
 *
 * OI-002 decision:
 *   - `content` is a non-empty JSON object (Record<string, unknown>).
 *   - `amount` is a convenience field only — NOT a backend requirement.
 *   - Validate non-empty before submit / revise.
 */

export type BidStatus = 'submitted' | 'revised' | 'withdrawn'

export type BidVersionStatus = 'effective' | 'superseded' | 'withdrawn'

export interface NetworkBidVersion {
  id: string
  bid_id: string
  revision_number: number
  /** Non-empty JSON object. amount is a known convenience field. */
  content: Record<string, unknown> & { amount?: number }
  actor_id: string
  reason?: string | null
  status: BidVersionStatus
  submitted_at?: string | null
  withdrawn_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface NetworkBid {
  id: string
  tender_id: string
  contractor_profile_id: string
  effective_version_id?: string | null
  status: BidStatus
  latest_revision_number: number
  submitted_at?: string | null
  withdrawn_at?: string | null
  managed_by_tenant_slug?: string | null
  created_at?: string
  updated_at?: string
  /** Immutable version history — ordered by revision_number ascending */
  versions?: NetworkBidVersion[]
}

export interface SubmitBidPayload {
  tender_id: string
  contractor_profile_id: string
  /** Non-empty JSON object. Validated client-side before submission. */
  content: Record<string, unknown>
  reason?: string
}

export interface ReviseBidPayload {
  /** Non-empty JSON object. Validated client-side before submission. */
  content: Record<string, unknown>
  reason?: string
}

export interface WithdrawBidPayload {
  reason?: string
}

// ─── Network Tender Types ─────────────────────────────────────────────────────

export type TenderStatus = 'draft' | 'published' | 'closed' | 'awarded'
export type TenderVisibility = 'public' | 'private' | 'invited' | 'matched'

export interface NetworkTender {
  id: string
  publisher_profile_id: string
  title: string
  description?: string | null
  category: string
  region?: string | null
  deadline?: string | null
  budget_min?: number | null
  budget_max?: number | null
  specializations?: string[] | null
  requirements?: string[] | null
  participant_types?: NetworkProfileType[] | null
  status: TenderStatus
  visibility: TenderVisibility
  match_criteria?: unknown | null
  erp_tender_id?: string | null
  managed_by_tenant_slug?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreateNetworkTenderPayload {
  publisher_profile_id: string
  title: string
  category: string
  description?: string
  region?: string
  deadline?: string
  budget_min?: number
  budget_max?: number
  specializations?: string[]
  requirements?: string[]
  participant_types?: NetworkProfileType[]
  visibility?: TenderVisibility
}

export interface UpdateNetworkTenderPayload {
  title?: string
  description?: string | null
  category?: string
  region?: string | null
  deadline?: string | null
  budget_min?: number | null
  budget_max?: number | null
  specializations?: string[] | null
  requirements?: string[] | null
  participant_types?: NetworkProfileType[] | null
  visibility?: TenderVisibility
}

export interface NetworkTenderFilters {
  status?: TenderStatus
  visibility?: TenderVisibility
  category?: string
  region?: string
  publisher_profile_id?: string
  page?: number
}

// ─── Network Tender API ───────────────────────────────────────────────────────

/**
 * POST /api/v1/network/tenders
 * Create a new Network Tender (draft status).
 * Requires publisher_profile_id to be a valid NetworkProfile.
 */
export async function createNetworkTender(
  payload: CreateNetworkTenderPayload
): Promise<NetworkTender> {
  const res = await apiClient.post<{ data: NetworkTender }>('/v1/network/tenders', payload)
  return res.data.data
}

/**
 * GET /api/v1/network/tenders
 * List Network Tenders (visibility-aware: public + managing tenant's own).
 */
export async function listNetworkTenders(
  filters: NetworkTenderFilters = {}
): Promise<PaginatedResponse<NetworkTender>> {
  const { page = 1, ...rest } = filters
  const res = await apiClient.get<PaginatedResponse<NetworkTender>>('/v1/network/tenders', {
    params: { page, ...rest },
  })
  return res.data
}

/**
 * GET /api/v1/network/tenders/{id}
 * Get a single Network Tender by ID.
 * Returns 403 if visibility restricts access.
 */
export async function getNetworkTender(id: string): Promise<NetworkTender> {
  const res = await apiClient.get<{ data: NetworkTender }>(`/v1/network/tenders/${id}`)
  return res.data.data
}

/**
 * PATCH /api/v1/network/tenders/{id}
 * Update a Network Tender (draft only).
 */
export async function updateNetworkTender(
  id: string,
  payload: UpdateNetworkTenderPayload
): Promise<NetworkTender> {
  const res = await apiClient.patch<{ data: NetworkTender }>(`/v1/network/tenders/${id}`, payload)
  return res.data.data
}

/**
 * PATCH /api/v1/network/tenders/{id}/publish
 * Publish a Network Tender (draft → published).
 */
export async function publishNetworkTender(id: string): Promise<NetworkTender> {
  const res = await apiClient.patch<{ data: NetworkTender }>(
    `/v1/network/tenders/${id}/publish`
  )
  return res.data.data
}

/**
 * PATCH /api/v1/network/tenders/{id}/close
 * Close a Network Tender (published → closed).
 */
export async function closeNetworkTender(id: string): Promise<NetworkTender> {
  const res = await apiClient.patch<{ data: NetworkTender }>(
    `/v1/network/tenders/${id}/close`
  )
  return res.data.data
}

// ─── Network Bid API ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/network/bids
 * Submit a new bid against an eligible published tender.
 * content must be a non-empty object (validated client-side).
 * Returns 201 with the created bid including versions[].
 */
export async function submitNetworkBid(payload: SubmitBidPayload): Promise<NetworkBid> {
  const res = await apiClient.post<{ data: NetworkBid }>('/v1/network/bids', payload)
  return res.data.data
}

/**
 * GET /api/v1/network/bids/{id}
 * Get a single bid with its full version history.
 * Returns 403 if the bid does not belong to the requesting tenant.
 */
export async function getNetworkBid(id: string): Promise<NetworkBid> {
  const res = await apiClient.get<{ data: NetworkBid }>(`/v1/network/bids/${id}`)
  return res.data.data
}

/**
 * POST /api/v1/network/bids/{id}/revisions
 * Revise a submitted bid while the submission window is still open.
 * content must be a non-empty object (validated client-side).
 * Returns the updated bid with all versions[].
 */
export async function reviseNetworkBid(
  id: string,
  payload: ReviseBidPayload
): Promise<NetworkBid> {
  const res = await apiClient.post<{ data: NetworkBid }>(
    `/v1/network/bids/${id}/revisions`,
    payload
  )
  return res.data.data
}

/**
 * PATCH /api/v1/network/bids/{id}/withdraw
 * Withdraw a submitted or revised bid.
 * Returns the updated bid with status = 'withdrawn'.
 */
export async function withdrawNetworkBid(
  id: string,
  payload: WithdrawBidPayload = {}
): Promise<NetworkBid> {
  const res = await apiClient.patch<{ data: NetworkBid }>(
    `/v1/network/bids/${id}/withdraw`,
    payload
  )
  return res.data.data
}

// ─── Network Evaluation Types ─────────────────────────────────────────────────

/**
 * WEB-001D — Network Evaluation, Internal Notes & Completion
 *
 * Contract derived from:
 *   - backend/app/Network/EvaluationController.php
 *   - backend/app/Network/EvaluationService.php
 *   - backend/app/Network/NetworkEvaluation.php
 *   - backend/app/Network/NetworkEvaluationNote.php
 *   - backend/routes/api.php
 *
 * Lifecycle: not_started → open → completed
 *   - completed → open: PROHIBITED
 *   - cancellation: PROHIBITED in V1
 *
 * Bid content is only accessible after evaluation has started (open/completed).
 * Notes are internal — visible only to authorized publisher/evaluators.
 */

export type EvaluationStatus = 'not_started' | 'open' | 'completed'

export interface NetworkEvaluationNote {
  id: string
  evaluation_id: string
  bid_id?: string | null
  author_id: string
  content: string
  managed_by_tenant_slug?: string | null
  created_at?: string
  updated_at?: string
}

export interface NetworkEvaluation {
  id: string
  tender_id: string
  status: EvaluationStatus
  started_by?: string | null
  completed_by?: string | null
  evaluation_started_at?: string | null
  evaluation_completed_at?: string | null
  managed_by_tenant_slug?: string | null
  created_at?: string
  updated_at?: string
  /** Internal notes — loaded via load('notes') */
  notes?: NetworkEvaluationNote[]
}

export interface AddEvaluationNotePayload {
  content: string
  bid_id?: string
}

// ─── Network Evaluation API ───────────────────────────────────────────────────

/**
 * POST /api/v1/network/tenders/{tenderId}/evaluation
 * Start an evaluation for a closed tender.
 * Precondition: tender must be closed; no existing evaluation.
 * Returns 201 with the new evaluation (with notes loaded).
 */
export async function startNetworkEvaluation(tenderId: string): Promise<NetworkEvaluation> {
  const res = await apiClient.post<NetworkEvaluation>(
    `/v1/network/tenders/${tenderId}/evaluation`
  )
  return res.data
}

/**
 * GET /api/v1/network/evaluations/{id}
 * Get an evaluation with its notes.
 * Returns 403 if the evaluation does not belong to the requesting tenant.
 */
export async function getNetworkEvaluation(id: string): Promise<NetworkEvaluation> {
  const res = await apiClient.get<NetworkEvaluation>(`/v1/network/evaluations/${id}`)
  return res.data
}

/**
 * PATCH /api/v1/network/evaluations/{id}/complete
 * Complete an open evaluation.
 * Precondition: evaluation must be open.
 * Returns the updated evaluation with notes.
 */
export async function completeNetworkEvaluation(id: string): Promise<NetworkEvaluation> {
  const res = await apiClient.patch<NetworkEvaluation>(
    `/v1/network/evaluations/${id}/complete`
  )
  return res.data
}

/**
 * POST /api/v1/network/evaluations/{id}/notes
 * Add an internal note to an open evaluation.
 * content: required string (max 5000)
 * bid_id: optional UUID — links note to a specific bid
 * Returns 201 with the created note.
 */
export async function addNetworkEvaluationNote(
  id: string,
  payload: AddEvaluationNotePayload
): Promise<NetworkEvaluationNote> {
  const res = await apiClient.post<NetworkEvaluationNote>(
    `/v1/network/evaluations/${id}/notes`,
    payload
  )
  return res.data
}

/**
 * GET /api/v1/network/evaluations/{id}/bids
 * Get all bids for the tender associated with an evaluation.
 * Bid content is only accessible after evaluation has started (open/completed).
 * Returns 403 if unauthorized; 422 if evaluation not started.
 */
export async function getNetworkEvaluationBids(id: string): Promise<NetworkBid[]> {
  const res = await apiClient.get<NetworkBid[]>(`/v1/network/evaluations/${id}/bids`)
  return res.data
}

// ─── Network Award Types ──────────────────────────────────────────────────────

/**
 * WEB-001E — Network Single Award Selection & Result Display
 *
 * Contract derived from:
 *   - backend/app/Network/AwardController.php
 *   - backend/app/Network/AwardService.php
 *   - backend/app/Network/NetworkAward.php
 *   - backend/routes/api.php
 *
 * V1 rules:
 *   - Single Award per Tender — final, no revocation/amendment/cancellation.
 *   - Tender must be closed.
 *   - Evaluation must be completed.
 *   - Winning bid must be in 'submitted' status, not withdrawn, with effective version.
 *   - Actor must be authorized publisher/engineer (tenant ownership).
 */

export interface NetworkAward {
  id: string
  tender_id: string
  winning_bid_id: string
  winning_network_profile_id: string
  awarded_by: string
  awarded_at: string
  reason?: string | null
  managed_by_tenant_slug?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreateAwardPayload {
  winning_bid_id: string
  reason?: string
}

// ─── Network Award API ────────────────────────────────────────────────────────

/**
 * POST /api/v1/network/tenders/{tenderId}/award
 * Create an Award for a Tender.
 * Prerequisites: Tender closed + Evaluation completed + Bid eligible + Actor authorized.
 * Returns 201 with the created award.
 */
export async function createNetworkAward(
  tenderId: string,
  payload: CreateAwardPayload
): Promise<NetworkAward> {
  const res = await apiClient.post<NetworkAward>(
    `/v1/network/tenders/${tenderId}/award`,
    payload
  )
  return res.data
}

/**
 * GET /api/v1/network/awards/{id}
 * Get an Award by its ID.
 * Returns 403 if the award does not belong to the requesting tenant.
 */
export async function getNetworkAward(id: string): Promise<NetworkAward> {
  const res = await apiClient.get<NetworkAward>(`/v1/network/awards/${id}`)
  return res.data
}

/**
 * GET /api/v1/network/tenders/{tenderId}/award
 * Get the Award for a given Tender.
 * Returns 404 if no award exists for this tender.
 */
export async function getNetworkAwardByTender(tenderId: string): Promise<NetworkAward> {
  const res = await apiClient.get<NetworkAward>(`/v1/network/tenders/${tenderId}/award`)
  return res.data
}
