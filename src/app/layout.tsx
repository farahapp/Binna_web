import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'بناء قطر | BINAA QATAR — نظام إدارة المقاولات',
  description: 'BINAA QATAR — Construction ERP for Qatar',
  applicationName: 'BINAA QATAR',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
