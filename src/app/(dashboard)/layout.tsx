'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tokenStorage } from '@/lib/auth/token'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { LoadingPage } from '@/components/ui/loading'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Use isAuthenticated() — session flag check (SPA Cookie auth)
    if (!tokenStorage.isAuthenticated()) {
      router.replace('/login')
    } else {
      setChecking(false)
    }
  }, [router])

  if (checking) {
    return <LoadingPage />
  }

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        className={[
          'fixed inset-y-0 right-0 z-30 lg:static lg:z-auto transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <AppSidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
