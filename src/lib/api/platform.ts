/**
 * Platform Admin API client — PAT Bearer token auth (NOT SPA cookie).
 *
 * Platform operators authenticate against /api/platform/auth/login and receive
 * a Bearer PAT. All subsequent requests carry Authorization: Bearer {token}.
 * No X-Tenant header is sent — platform routes are tenant-agnostic.
 * No CSRF cookie is needed — PAT auth is stateless.
 *
 * Backend authority: Laravel 12 + RequirePlatformOperator middleware.
 * schema_name is NEVER returned by the backend and NEVER expected here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

// ─── Storage key ──────────────────────────────────────────────────────────────

const PLATFORM_TOKEN_KEY = 'binaa2_platform_token'

export const platformTokenStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(PLATFORM_TOKEN_KEY)
  },
  set(token: string): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(PLATFORM_TOKEN_KEY, token)
  },
  clear(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(PLATFORM_TOKEN_KEY)
  },
  isAuthenticated(): boolean {
    return !!this.get()
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformOperator {
  id: number
  name: string
  email: string
  is_active: boolean
}

export interface Tenant {
  id: number
  slug: string
  name: string
  status: 'pending' | 'active' | 'suspended'
  created_at: string
  updated_at: string
}

export interface TenantSetting {
  key: string
  value: string
}

export interface TenantDetail {
  tenant: Tenant
  settings: TenantSetting[]
}

export interface TenantsPage {
  data: Tenant[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function platformFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = platformTokenStorage.get()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    platformTokenStorage.clear()
    if (typeof window !== 'undefined') {
      window.location.href = '/platform/login'
    }
    throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً')
  }

  if (res.status === 403) {
    throw new Error('ليس لديك صلاحية لتنفيذ هذا الإجراء')
  }

  if (!res.ok) {
    let message = `خطأ من الخادم (HTTP ${res.status})`
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const platformAuthApi = {
  async login(email: string, password: string): Promise<{ token: string; token_type: string }> {
    return platformFetch('/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async logout(): Promise<void> {
    await platformFetch('/platform/auth/logout', { method: 'POST' })
  },

  async me(): Promise<PlatformOperator> {
    return platformFetch('/platform/auth/me')
  },

  /**
   * Change the authenticated platform operator's password.
   *
   * POST /api/platform/auth/change-password
   * Body: { current_password, new_password, new_password_confirmation }
   * Response 200: { message: string }
   * Response 422: validation errors (wrong current password, too short, identical, mismatch)
   *
   * Security: uses Platform Bearer Token — never X-Tenant or Tenant Axios client.
   * No password or token is logged or returned beyond the success message.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ): Promise<{ message: string }> {
    return platformFetch('/platform/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password:           currentPassword,
        new_password:               newPassword,
        new_password_confirmation:  newPasswordConfirmation,
      }),
    })
  },
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const platformTenantsApi = {
  async list(params?: {
    status?: string
    search?: string
    page?: number
    per_page?: number
  }): Promise<TenantsPage> {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.per_page) qs.set('per_page', String(params.per_page))
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return platformFetch(`/platform/tenants${query}`)
  },

  async get(id: number): Promise<TenantDetail> {
    return platformFetch(`/platform/tenants/${id}`)
  },

  async suspend(id: number): Promise<{ message: string; tenant: Partial<Tenant> }> {
    return platformFetch(`/platform/tenants/${id}/suspend`, { method: 'PATCH' })
  },

  async activate(id: number): Promise<{ message: string; tenant: Partial<Tenant> }> {
    return platformFetch(`/platform/tenants/${id}/activate`, { method: 'PATCH' })
  },
}
