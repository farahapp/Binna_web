'use client'

import Link from 'next/link'

const cards = [
  {
    title: 'الأصول والمعدات',
    description: 'عرض قائمة الأصول والمعدات المسجلة',
    href: '/equipment/assets',
    icon: '🚜',
  },
  {
    title: 'تسجيل أصل جديد',
    description: 'إضافة معدة أو أصل جديد إلى السجل',
    href: '/equipment/assets/new',
    icon: '➕',
  },
]

export default function EquipmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">المعدات والأصول</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة الأصول والمعدات والتخصيصات والصيانة
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <div className="bg-muted/40 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">تسجيل أصل جديد</p>
          <p className="text-sm text-muted-foreground">أضف معدة أو أصلاً جديداً إلى السجل</p>
        </div>
        <Link
          href="/equipment/assets/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + أصل جديد
        </Link>
      </div>
    </div>
  )
}
