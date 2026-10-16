'use client'

import Link from 'next/link'

const cards = [
  {
    title: 'الفواتير',
    description: 'إنشاء وعرض فواتير العملاء وتتبع حالتها',
    href: '/finance/invoices',
    icon: '🧾',
  },
  {
    title: 'المدفوعات',
    description: 'تسجيل المدفوعات للموردين والعملاء',
    href: '/finance/payments',
    icon: '💳',
  },
  {
    title: 'التحصيلات',
    description: 'تسجيل تحصيلات المستحقات من العملاء',
    href: '/finance/collections',
    icon: '📥',
  },
  {
    title: 'الحسابات البنكية',
    description: 'إدارة الحسابات البنكية والمعاملات',
    href: '/finance/bank-accounts',
    icon: '🏦',
  },
  {
    title: 'الحسابات النقدية',
    description: 'إدارة الصناديق النقدية والمعاملات',
    href: '/finance/cash-accounts',
    icon: '💵',
  },
  {
    title: 'المركز المالي النقدي',
    description: 'عرض الوضع النقدي الإجمالي للمنشأة',
    href: '/finance/cash-position',
    icon: '📊',
  },
]

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">المالية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة الفواتير والمدفوعات والتحصيلات والحسابات البنكية والنقدية
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
          <p className="font-medium text-foreground">إنشاء فاتورة جديدة</p>
          <p className="text-sm text-muted-foreground">أنشئ فاتورة لعميل مرتبطة بمشروع أو عقد</p>
        </div>
        <Link
          href="/finance/invoices/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + فاتورة جديدة
        </Link>
      </div>
    </div>
  )
}
