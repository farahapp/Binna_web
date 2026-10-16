'use client'

import Link from 'next/link'

interface CommercialCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: CommercialCard[] = [
  {
    title: 'المناقصات',
    description: 'إدارة المناقصات وتتبع حالتها وترسيتها',
    href: '/commercial/tenders',
    icon: '📋',
  },
  {
    title: 'العقود',
    description: 'إدارة العقود التجارية وتتبع قيمها وتعديلاتها',
    href: '/commercial/contracts',
    icon: '📝',
  },
  {
    title: 'عروض الأسعار',
    description: 'إنشاء عروض الأسعار وإرسالها للموافقة',
    href: '/commercial/quotations',
    icon: '💰',
  },
  {
    title: 'جداول الكميات',
    description: 'إنشاء وإدارة جداول الكميات للمناقصات والعقود',
    href: '/commercial/boqs',
    icon: '📊',
  },
]

export default function CommercialPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإدارة التجارية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة المناقصات والعقود وعروض الأسعار وجداول الكميات
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:shadow-sm transition-all space-y-3"
          >
            <div className="text-3xl">{card.icon}</div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
            </div>
            <div className="text-sm text-primary font-medium">عرض التفاصيل ←</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
