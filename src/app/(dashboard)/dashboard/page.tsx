'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'

// BI Dashboard response shape (from GET /api/v1/bi/dashboard)
interface KpiValue {
  label?: string
  value?: number | string
  unit?: string
  [key: string]: unknown
}

interface DashboardData {
  kpis?: Record<string, KpiValue | number | string>
  projects?: { total?: number; active?: number; [key: string]: unknown }
  finance?: { [key: string]: unknown }
  procurement?: { [key: string]: unknown }
  [key: string]: unknown
}

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
}

function KpiCard({ label, value, unit }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground mr-1">{unit}</span>}
      </p>
    </div>
  )
}

function renderKpis(data: DashboardData) {
  const cards: KpiCardProps[] = []

  // Projects summary
  if (data.projects) {
    if (data.projects.total !== undefined) {
      cards.push({ label: 'إجمالي المشاريع', value: data.projects.total })
    }
    if (data.projects.active !== undefined) {
      cards.push({ label: 'المشاريع النشطة', value: data.projects.active })
    }
  }

  // KPIs map
  if (data.kpis && typeof data.kpis === 'object') {
    for (const [key, val] of Object.entries(data.kpis)) {
      if (typeof val === 'number' || typeof val === 'string') {
        cards.push({ label: key, value: val })
      } else if (val && typeof val === 'object') {
        const kpi = val as KpiValue
        cards.push({
          label: kpi.label ?? key,
          value: kpi.value ?? '—',
          unit: kpi.unit,
        })
      }
    }
  }

  return cards
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(() => {
    setLoading(true)
    setError(null)
    apiClient
      .get<DashboardData>('/v1/bi/dashboard')
      .then((res) => setData(res.data))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'فشل تحميل لوحة التحكم'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return <LoadingSpinner message="جارٍ تحميل لوحة التحكم..." />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        </div>
        <ErrorDisplay message={error} onRetry={fetchDashboard} />
      </div>
    )
  }

  const kpiCards = data ? renderKpis(data) : []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على المشاريع والعمليات</p>
      </div>

      {/* KPI Cards */}
      {kpiCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <KpiCard key={i} {...card} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Empty state cards for each module */}
          {[
            'المشاريع',
            'المشتريات',
            'المخزون',
            'التجاري',
            'المالية',
            'الموارد البشرية',
          ].map((module) => (
            <div key={module} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">{module}</p>
              <EmptyState message="لا توجد بيانات متاحة" />
            </div>
          ))}
        </div>
      )}

      {/* API status indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <span>متصل بـ API — {new Date().toLocaleDateString('ar-SA')}</span>
      </div>
    </div>
  )
}
