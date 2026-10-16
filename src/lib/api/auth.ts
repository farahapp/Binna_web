import { apiClient, fetchCsrfCookie } from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface SpaLoginResponse {
  user: {
    id: string
    name: string
    email: string
  }
}

/**
 * Auth API — Sanctum SPA Cookie-based Authentication
 *
 * C-002 §26 — RESOLVED 2026-10-07:
 * Web uses SPA Cookie auth. No PAT token returned or stored.
 * Flow: GET /sanctum/csrf-cookie → POST /api/auth/spa/login → session cookie set by backend.
 */
export const authApi = {
  /**
   * SPA Login flow:
   * 1. Fetch CSRF cookie (sets XSRF-TOKEN cookie for Axios).
   * 2. POST credentials → backend validates, creates session, returns user info.
   * No PAT is returned or stored.
   */
  async login(credentials: LoginRequest): Promise<SpaLoginResponse> {
    await fetchCsrfCookie()
    const response = await apiClient.post<SpaLoginResponse>('/auth/spa/login', credentials)
    return response.data
  },

  /**
   * SPA Logout:
   * Invalidates the server-side session. Cookie is cleared by backend.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/spa/logout')
  },
}
