'use client'

import Link from 'next/link'

interface SubcontractCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: SubcontractCard[] = [
  {
    title: 'عقود المقاولين من الباطن',
    description: 'إنشاء وإدارة عقود المقاولين من الباطن ومتابعة حالتها',
    href: '/subcontracts/agreements/new',
    icon: '📄',
  },
  {
    title: 'تسجيل التقدم',
    description: 'تسجيل نسب الإنجاز والمبالغ المعتمدة لعقد قائم',
    href: '/subcontracts/agreements',
    icon: '📊',
  },
  {
    title: 'شهادات الدفع',
    description: 'إصدار شهادات الدفع للمقاولين من الباطن',
    href: '/subcontracts/agreements',
    icon: '🏅',
  },
]

export default function SubcontractsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">المقاولون من الباطن</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة عقود المقاولين من الباطن ومتابعة التقدم وإصدار شهادات الدفع
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href + card.title}
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

      {/* Quick action */}
      <div className="bg-muted/40 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">إنشاء عقد جديد</p>
          <p className="text-sm text-muted-foreground">أضف عقد مقاول من الباطن جديد بحالة مسودة</p>
        </div>
        <Link
          href="/subcontracts/agreements/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + عقد جديد
        </Link>
      </div>
    </div>
  )
}
