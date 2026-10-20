'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', href: '/dashboard', icon: '📊' },
  { label: 'الشبكة', href: '/network', icon: '🌐' },
  { label: 'إدارة العلاقات', href: '/crm', icon: '👥' },
  { label: 'المشاريع', href: '/projects', icon: '🏗️' },
  { label: 'مراقبة التكاليف', href: '/cost-control', icon: '📉' },
  { label: 'التجاري', href: '/commercial', icon: '📋' },
  { label: 'المشتريات', href: '/procurement', icon: '🛒' },
  { label: 'المخزون', href: '/inventory', icon: '📦' },
  { label: 'المقاولون الفرعيون', href: '/subcontracts', icon: '🤝' },
  { label: 'الموارد البشرية', href: '/hr', icon: '👤' },
  { label: 'المعدات', href: '/equipment', icon: '🚜' },
  { label: 'المالية', href: '/finance', icon: '💰' },
  { label: 'المحاسبة', href: '/accounting', icon: '📒' },
  { label: 'التقارير', href: '/reports', icon: '📈' },
  { label: 'الوثائق', href: '/documents', icon: '📁' },
  { label: 'الإشعارات', href: '/notifications', icon: '🔔' },
  { label: 'الإدارة', href: '/administration', icon: '⚙️' },
]

interface AppSidebarProps {
  onClose?: () => void
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'h-full bg-card border-l border-border flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + collapse/close */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        {!collapsed && (
          <span className="font-bold text-lg text-foreground">BINAA2</span>
        )}
        <div className="flex items-center gap-1">
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              aria-label="إغلاق القائمة"
            >
              ✕
            </button>
          )}
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors hidden lg:block"
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
