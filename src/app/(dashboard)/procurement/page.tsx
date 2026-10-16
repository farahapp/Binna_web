'use client'

import Link from 'next/link'

interface ProcurementCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: ProcurementCard[] = [
  {
    title: 'طلبات الشراء',
    description: 'إنشاء طلبات الشراء وتتبع حالتها والموافقة عليها',
    href: '/procurement/purchase-requests',
    icon: '🛒',
  },
  {
    title: 'أوامر الشراء',
    description: 'إدارة أوامر الشراء وبنودها ومتابعة تنفيذها',
    href: '/procurement/purchase-orders',
    icon: '📦',
  },
  {
    title: 'طلبات عروض الأسعار',
    description: 'إرسال طلبات عروض الأسعار للموردين ومقارنة العروض',
    href: '/procurement/rfqs',
    icon: '📋',
  },
]

export default function ProcurementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">المشتريات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة طلبات الشراء وأوامر الشراء وطلبات عروض الأسعار
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
