'use client'

import Link from 'next/link'

interface HrCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: HrCard[] = [
  {
    title: 'الموظفون',
    description: 'عرض قائمة الموظفين وإضافة موظف جديد',
    href: '/hr/employees',
    icon: '👤',
  },
  {
    title: 'الحضور والانصراف',
    description: 'تسجيل ومتابعة حضور الموظفين',
    href: '/hr/employees',
    icon: '🕐',
  },
  {
    title: 'طلبات الإجازة',
    description: 'إدارة طلبات الإجازة واعتمادها',
    href: '/hr/employees',
    icon: '📅',
  },
  {
    title: 'تخصيص التكاليف',
    description: 'تخصيص تكاليف الموظفين على المشاريع',
    href: '/hr/employees',
    icon: '💼',
  },
]

export default function HrPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الموارد البشرية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة الموظفين والحضور والإجازات وتخصيص التكاليف
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:shadow-sm transition-all space-y-3"
          >
            <div className="text-3xl">{card.icon}</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
            </div>
            <div className="text-sm text-primary font-medium">عرض ←</div>
          </Link>
        ))}
      </div>

      {/* Quick action */}
      <div className="bg-muted/40 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">تسجيل موظف جديد</p>
          <p className="text-sm text-muted-foreground">أضف موظفاً جديداً إلى سجلات الموارد البشرية</p>
        </div>
        <Link
          href="/hr/employees/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + موظف جديد
        </Link>
      </div>
    </div>
  )
}
