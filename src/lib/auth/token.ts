/**
 * Session auth helpers for Sanctum SPA Cookie-based Authentication.
 *
 * C-002 §26 — RESOLVED 2026-10-07:
 * Web Authentication = Laravel Sanctum SPA Cookie-based Auth.
 * No PAT stored in sessionStorage or localStorage.
 * Authentication state is managed via HttpOnly session cookies (server-side).
 * The XSRF-TOKEN cookie (non-httpOnly) is read automatically by Axios
 * when withCredentials=true and sent as X-XSRF-TOKEN header.
 */

const SESSION_FLAG_KEY = 'binaa2_session_active'

/**
 * tokenStorage is kept for API compatibility with existing components,
 * but now manages a lightweight session flag (NOT a PAT).
 * The actual authentication is handled by the server-side session cookie.
 */
export const tokenStorage = {
  /** @deprecated No PAT stored. Use isAuthenticated() for session check. */
  get(): string | null {
    return null
  },

  /** Sets a non-sensitive session active flag (not a token). */
  set(_token: string): void {
    if (typeof window === 'undefined') return
    // Mark session as active (no PAT stored — cookie-based auth)
    sessionStorage.setItem(SESSION_FLAG_KEY, '1')
  },

  /** Clears the session flag. Server session is invalidated via logout endpoint. */
  clear(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(SESSION_FLAG_KEY)
  },

  /** Returns true if a session flag exists (optimistic check; 401 is authoritative). */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_FLAG_KEY) === '1'
  },
}
