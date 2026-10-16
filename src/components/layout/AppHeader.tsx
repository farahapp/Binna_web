'use client'

import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { tokenStorage } from '@/lib/auth/token'

interface AppHeaderProps {
  onMenuToggle?: () => void
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Logout best-effort — clear session flag regardless
    } finally {
      tokenStorage.clear()
      router.replace('/login')
    }
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            aria-label="فتح القائمة"
          >
            ☰
          </button>
        )}
        <span className="text-sm text-muted-foreground hidden sm:block">نظام إدارة المقاولات</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded hover:bg-accent"
        >
          تسجيل الخروج
        </button>
      </div>
    </header>
  )
}
