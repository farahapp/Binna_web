'use client'

import Link from 'next/link'

interface InventoryCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: InventoryCard[] = [
  {
    title: 'المواد والأصناف',
    description: 'عرض قائمة المواد والأصناف ومستويات المخزون',
    href: '/inventory/items',
    icon: '📦',
  },
  {
    title: 'سندات الاستلام',
    description: 'إنشاء وإدارة سندات استلام البضائع (GRN)',
    href: '/inventory/grns',
    icon: '📋',
  },
]

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">المخزون</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة المواد والأصناف وسندات الاستلام وحركات المخزون
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
