'use client'

/**
 * Platform Admin Login — PAT Bearer token auth.
 *
 * POST /api/platform/auth/login → { token, token_type }
 * Token stored in sessionStorage (platformTokenStorage).
 * No CSRF cookie. No X-Tenant header. No SPA session.
 * Completely isolated from the tenant login at /login.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { platformAuthApi, platformTokenStorage } from '@/lib/api/platform'

export default function PlatformLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await platformAuthApi.login(email.trim(), password)
      platformTokenStorage.set(token)
      router.replace('/platform/tenants')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 text-white text-2xl mb-4">
              🔐
            </div>
            <h1 className="text-xl font-bold text-slate-900">BINAA2</h1>
            <p className="text-slate-500 text-sm mt-1">لوحة تحكم مسؤول المنصة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                dir="ltr"
                className="form-input"
                placeholder="admin@binaa2.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-md font-medium
                         hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'جارٍ تسجيل الدخول...' : 'دخول'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            هذه الصفحة مخصصة لمسؤولي المنصة فقط
          </p>
        </div>
      </div>
    </div>
  )
}
