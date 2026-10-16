'use client'

import Link from 'next/link'

interface CrmCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: CrmCard[] = [
  {
    title: 'العملاء',
    description: 'إدارة قائمة العملاء وبياناتهم',
    href: '/crm/clients',
    icon: '👥',
  },
  {
    title: 'العملاء المحتملون',
    description: 'تتبع العملاء المحتملين ومراحل التواصل',
    href: '/crm/leads',
    icon: '🎯',
  },
  {
    title: 'الفرص',
    description: 'إدارة فرص البيع ومتابعة حالتها',
    href: '/crm/opportunities',
    icon: '💼',
  },
]

export default function CrmPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة علاقات العملاء</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة العملاء والعملاء المحتملين والفرص التجارية
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
