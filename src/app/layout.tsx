import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BINAA2 — نظام إدارة المقاولات',
  description: 'BINAA2 Construction ERP System',
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
