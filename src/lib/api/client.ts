import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { tokenStorage } from '@/lib/auth/token'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

/**
 * BINAA2 API Client — Sanctum SPA Cookie-based Authentication
 *
 * C-002 §26 — RESOLVED 2026-10-07:
 * Uses Laravel Sanctum SPA Cookie authentication.
 * - `withCredentials: true` enables sending session cookies and XSRF-TOKEN.
 * - `withXSRFToken: true` forces Axios to read XSRF-TOKEN and send X-XSRF-TOKEN
 *   on every request, regardless of port. Required because the web app (:3000)
 *   and the API (:8000) are on different ports — Axios 1.x same-origin guard
 *   would otherwise suppress the header silently (→ HTTP 419).
 * - No Bearer PAT token is sent or stored.
 * - Tenant context: X-Tenant header sent from NEXT_PUBLIC_TENANT_SLUG env var.
 *   Backend resolves schema from DB only — schema is NEVER sent from frontend.
 *
 * This client is a CONSUMER of the Laravel 12 REST API.
 * Backend is the sole authority for:
 * - Business logic, Authorization, Tenant isolation,
 * - Validation, Accounting rules, Workflow decisions.
 *
 * Frontend MUST NOT duplicate any of the above.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,  // Required for SPA Cookie auth (session + XSRF-TOKEN)
  withXSRFToken: true,    // Required: API on :8000 ≠ web on :3000 — override same-origin guard
  timeout: 30000,
})

// Request interceptor — attach X-Tenant header (slug only, schema resolved by backend)
apiClient.interceptors.request.use(
  (config) => {
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG
    if (tenantSlug) {
      config.headers['X-Tenant'] = tenantSlug
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle auth errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Session expired or unauthenticated — clear session flag and redirect
      tokenStorage.clear()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Fetch the Sanctum CSRF cookie.
 * Must be called before the first login request.
 * Sets the XSRF-TOKEN cookie which Axios sends automatically as X-XSRF-TOKEN.
 */
export async function fetchCsrfCookie(): Promise<void> {
  await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
  })
}
