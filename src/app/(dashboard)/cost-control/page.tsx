'use client'

import Link from 'next/link'

const sections = [
  {
    label: 'الميزانيات',
    href: '/cost-control/budgets',
    icon: '📊',
    description: 'إنشاء وإدارة ميزانيات المشاريع',
  },
  {
    label: 'الالتزامات',
    href: '/cost-control/commitments',
    icon: '📌',
    description: 'تسجيل ومتابعة الالتزامات المالية',
  },
  {
    label: 'التكاليف الفعلية',
    href: '/cost-control/actual-costs',
    icon: '💸',
    description: 'تسجيل التكاليف الفعلية للمشاريع',
  },
  {
    label: 'الموقف التكليفي',
    href: '/cost-control/cost-position',
    icon: '📉',
    description: 'عرض الموقف التكليفي والانحرافات',
  },
]

export default function CostControlPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">مراقبة التكاليف</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة ميزانيات المشاريع والتكاليف والالتزامات
        </p>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {s.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
