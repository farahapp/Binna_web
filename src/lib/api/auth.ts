import { apiClient, fetchCsrfCookie } from './client'

export interface LoginRequest {
  email: string
  password: string
  /** Tenant slug — sent as X-Tenant header via apiClient interceptor. */
  tenantSlug: string
}

export interface SpaLoginResponse {
  user: {
    id: string
    name: string
    email: string
  }
}

/**
 * Auth API — Sanctum SPA Cookie-based Authentication (Company Users)
 *
 * C-002 §26 — RESOLVED 2026-10-07:
 * Web uses SPA Cookie auth. No PAT token returned or stored.
 * Flow: GET /sanctum/csrf-cookie → POST /api/auth/spa/login → session cookie set by backend.
 *
 * Tenant resolution:
 * - tenantSlug is stored in tenantStorage before the request.
 * - apiClient interceptor reads tenantStorage and sets X-Tenant header.
 * - Backend resolves schema from DB only — slug is a lookup key, not a schema name.
 * - Platform Admin does NOT use this flow (uses platformAuthApi in platform.ts).
 */
export const authApi = {
  /**
   * SPA Login flow (Company User):
   * 1. Store tenant slug in tenantStorage (picked up by apiClient interceptor).
   * 2. Fetch CSRF cookie (sets XSRF-TOKEN cookie for Axios).
   * 3. POST credentials → backend validates tenant + user, creates session.
   * No PAT is returned or stored.
   */
  async login(credentials: LoginRequest): Promise<SpaLoginResponse> {
    // Store slug BEFORE fetchCsrfCookie so interceptor sends X-Tenant on all requests.
    const { tenantStorage } = await import('@/lib/auth/token')
    tenantStorage.set(credentials.tenantSlug)

    await fetchCsrfCookie()
    const { tenantSlug: _omit, ...body } = credentials
    const response = await apiClient.post<SpaLoginResponse>('/auth/spa/login', body)
    return response.data
  },

  /**
   * SPA Logout:
   * Invalidates the server-side session. Cookie is cleared by backend.
   * Clears tenant slug from storage.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/spa/logout')
    const { tenantStorage } = await import('@/lib/auth/token')
    tenantStorage.clear()
  },
}
