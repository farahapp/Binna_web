'use client'

import Link from 'next/link'

interface NetworkCard {
  title: string
  description: string
  href: string
  icon: string
}

const cards: NetworkCard[] = [
  {
    title: 'الملفات الشخصية',
    description: 'عرض وإدارة ملفات الشركات في شبكة البناء التجارية',
    href: '/network/profiles',
    icon: '🏢',
  },
  {
    title: 'المناقصات',
    description: 'اكتشاف ونشر مناقصات شبكة البناء التجارية',
    href: '/network/tenders',
    icon: '📋',
  },
]

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">شبكة البناء التجارية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          منصة BINAA2 للتواصل بين شركات البناء — المناقصات والعطاءات والترسية
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-foreground font-medium">شبكة البناء التجارية — V1</p>
        <p className="text-xs text-muted-foreground mt-1">
          أنشئ ملفك الشخصي للانضمام إلى الشبكة. المناقصات والعطاءات والترسية ستكون متاحة في
          المراحل القادمة.
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

      {/* Quick action */}
      <div className="bg-muted/40 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">إنشاء ملف شخصي جديد</p>
          <p className="text-sm text-muted-foreground">
            انضم إلى شبكة البناء التجارية بإنشاء ملف شخصي لشركتك
          </p>
        </div>
        <Link
          href="/network/profiles/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + ملف شخصي جديد
        </Link>
      </div>
    </div>
  )
}
