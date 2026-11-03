'use client'

/**
 * Company Login Page — Sanctum SPA Cookie auth.
 *
 * Requires three fields:
 *   1. Company Identifier (tenant slug) — sent as X-Tenant header via apiClient interceptor.
 *   2. Email
 *   3. Password
 *
 * Flow: tenantStorage.set(slug) → GET /sanctum/csrf-cookie → POST /api/auth/spa/login
 * Backend resolves tenant from slug (DB only). Schema name is NEVER sent from frontend.
 *
 * Platform Admin login is at /platform/login — completely separate route and auth flow.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { tokenStorage } from '@/lib/auth/token'

export default function LoginPage() {
  const router = useRouter()
  const [tenantSlug, setTenantSlug] = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authApi.login({ tenantSlug: tenantSlug.trim(), email, password })
      // SPA Cookie auth: no PAT stored. Session cookie set by backend.
      // Set session active flag (non-sensitive) for client-side guard.
      tokenStorage.set('spa')
      router.push('/dashboard')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'فشل تسجيل الدخول. تحقق من بيانات الاعتماد.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl mb-4">
              🏗️
            </div>
            <h1 className="text-2xl font-bold text-foreground">BINAA2</h1>
            <p className="text-muted-foreground mt-1 text-sm">دخول مستخدمي الشركة</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Company Identifier */}
            <div className="space-y-2">
              <label htmlFor="tenantSlug" className="text-sm font-medium text-foreground">
                معرّف الشركة
              </label>
              <input
                id="tenantSlug"
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
                autoComplete="organization"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="my-company"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                المعرّف الذي زوّدتك به إدارة المنصة
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="example@company.com"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            مسؤول المنصة؟{' '}
            <a href="/platform/login" className="underline hover:text-foreground transition-colors">
              دخول مسؤول المنصة
            </a>
          </p>

        </div>
      </div>
    </div>
  )
}
