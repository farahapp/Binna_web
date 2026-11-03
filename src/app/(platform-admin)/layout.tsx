'use client'

/**
 * Platform Admin Layout — isolated from the tenant (dashboard) layout.
 *
 * Auth: PAT Bearer token stored in sessionStorage (platformTokenStorage).
 * No X-Tenant header. No SPA cookie. No shared session with tenant users.
 * Guard: redirects to /platform/login if no platform token is present.
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { platformTokenStorage, platformAuthApi, type PlatformOperator } from '@/lib/api/platform'

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [checking, setChecking]   = useState(true)
  const [operator, setOperator]   = useState<PlatformOperator | null>(null)

  const isLoginPage = pathname === '/platform/login'

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false)
      return
    }
    if (!platformTokenStorage.isAuthenticated()) {
      router.replace('/platform/login')
      return
    }
    // Verify token is still valid
    platformAuthApi.me()
      .then((op) => {
        setOperator(op)
        setChecking(false)
      })
      .catch(() => {
        platformTokenStorage.clear()
        router.replace('/platform/login')
      })
  }, [router, isLoginPage])

  const handleLogout = async () => {
    try {
      await platformAuthApi.logout()
    } catch {
      // best-effort
    } finally {
      platformTokenStorage.clear()
      router.replace('/platform/login')
    }
  }

  if (checking && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base tracking-wide">BINAA2 — إدارة المنصة</span>
        </div>
        <div className="flex items-center gap-4">
          {operator && (
            <span className="text-sm text-slate-300">{operator.name}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1 rounded hover:bg-slate-700"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {/* Side nav + content */}
      <div className="flex flex-1 min-h-0">
        <nav className="w-52 bg-slate-800 text-slate-200 flex flex-col py-4 flex-shrink-0">
          <NavLink href="/platform/tenants" label="المستأجرون" icon="🏢" />
        </nav>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
