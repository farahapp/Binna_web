'use client'

/**
 * G-01 — /reports — BI / Dashboards & Reporting (CAP-150 / TASK-015)
 *
 * Integrates with the existing BI API endpoint: GET /api/v1/bi/dashboard
 * This is the only authorized BI endpoint in V1. Advanced reporting is V1.5.
 *
 * Backend authority: all data, authorization, and tenant isolation enforced
 * by Laravel 12 REST API. This page is a consumer only.
 */

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiValue {
  label?: string
  value?: number | string
  unit?: string
  [key: string]: unknown
}

interface BIDashboardData {
  kpis?: Record<string, KpiValue | number | string>
  projects?: {
    total?: number
    active?: number
    completed?: number
    [key: string]: unknown
  }
  finance?: {
    total_invoiced?: number
    total_collected?: number
    outstanding?: number
    [key: string]: unknown
  }
  procurement?: {
    open_requests?: number
    pending_orders?: number
    [key: string]: unknown
  }
  cost_control?: {
    total_budget?: number
    total_actual?: number
    variance?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const res = error.response as { data?: { message?: string; error?: string } }
    if (res.data?.message) return res.data.message
    if (res.data?.error) return res.data.error
  }
  if (error instanceof Error) return error.message
  return fallback
}

function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '—'
  if (typeof val === 'number') {
    return val.toLocaleString('ar-SA')
  }
  return String(val)
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: string
}

function KpiCard({ label, value, unit, icon }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-2">
      {icon && <div className="text-2xl">{icon}</div>}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">
        {typeof value === 'number' ? formatNumber(value) : value}
        {unit && (
          <span className="text-sm font-normal text-muted-foreground mr-1">{unit}</span>
        )}
      </p>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  icon: string
  children: React.ReactNode
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<BIDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(() => {
    setLoading(true)
    setError(null)
    apiClient
      .get<BIDashboardData | BIDashboardData[]>('/v1/bi/dashboard')
      .then((res) => {
        // Handle both object and plain array responses
        const raw = res.data
        if (Array.isArray(raw)) {
          setData(raw.length > 0 ? (raw[0] as BIDashboardData) : null)
        } else {
          setData(raw as BIDashboardData)
        }
      })
      .catch((err: unknown) =>
        setError(extractMessage(err, 'فشل تحميل بيانات التقارير'))
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (loading) {
    return <LoadingSpinner message="جارٍ تحميل بيانات التقارير..." />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والتحليلات</h1>
        </div>
        <ErrorDisplay message={error} onRetry={fetchReport} />
      </div>
    )
  }

  const hasData = data && Object.keys(data).length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والتحليلات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            نظرة شاملة على أداء المشاريع والعمليات والمالية
          </p>
        </div>
        <button
          onClick={fetchReport}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors text-muted-foreground"
        >
          🔄 تحديث
        </button>
      </div>

      {/* V1.5 notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm font-medium text-foreground">
          📊 لوحة المؤشرات — V1
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          التقارير المتقدمة والتحليلات التفصيلية ستكون متاحة في الإصدار V1.5.
          البيانات المعروضة مستقاة من واجهة BI API المعتمدة.
        </p>
      </div>

      {!hasData ? (
        <EmptyState message="لا توجد بيانات متاحة حالياً. تأكد من وجود مشاريع وعمليات مسجلة في النظام." />
      ) : (
        <div className="space-y-8">

          {/* Projects Section */}
          {data.projects && (
            <Section title="المشاريع" icon="🏗️">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.projects.total !== undefined && (
                  <KpiCard label="إجمالي المشاريع" value={data.projects.total} icon="📁" />
                )}
                {data.projects.active !== undefined && (
                  <KpiCard label="المشاريع النشطة" value={data.projects.active} icon="▶️" />
                )}
                {data.projects.completed !== undefined && (
                  <KpiCard label="المشاريع المكتملة" value={data.projects.completed} icon="✅" />
                )}
                {Object.entries(data.projects)
                  .filter(([k]) => !['total', 'active', 'completed'].includes(k))
                  .map(([key, val]) =>
                    typeof val === 'number' || typeof val === 'string' ? (
                      <KpiCard key={key} label={key} value={val} />
                    ) : null
                  )}
              </div>
            </Section>
          )}

          {/* Finance Section */}
          {data.finance && (
            <Section title="المالية" icon="💰">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.finance.total_invoiced !== undefined && (
                  <KpiCard label="إجمالي الفواتير" value={data.finance.total_invoiced} unit="ر.س" icon="🧾" />
                )}
                {data.finance.total_collected !== undefined && (
                  <KpiCard label="إجمالي التحصيل" value={data.finance.total_collected} unit="ر.س" icon="💵" />
                )}
                {data.finance.outstanding !== undefined && (
                  <KpiCard label="المستحقات" value={data.finance.outstanding} unit="ر.س" icon="⏳" />
                )}
                {Object.entries(data.finance)
                  .filter(([k]) => !['total_invoiced', 'total_collected', 'outstanding'].includes(k))
                  .map(([key, val]) =>
                    typeof val === 'number' || typeof val === 'string' ? (
                      <KpiCard key={key} label={key} value={val} />
                    ) : null
                  )}
              </div>
            </Section>
          )}

          {/* Cost Control Section */}
          {data.cost_control && (
            <Section title="مراقبة التكاليف" icon="📉">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.cost_control.total_budget !== undefined && (
                  <KpiCard label="إجمالي الميزانية" value={data.cost_control.total_budget} unit="ر.س" icon="📊" />
                )}
                {data.cost_control.total_actual !== undefined && (
                  <KpiCard label="التكاليف الفعلية" value={data.cost_control.total_actual} unit="ر.س" icon="💸" />
                )}
                {data.cost_control.variance !== undefined && (
                  <KpiCard label="الانحراف" value={data.cost_control.variance} unit="ر.س" icon="📐" />
                )}
                {Object.entries(data.cost_control)
                  .filter(([k]) => !['total_budget', 'total_actual', 'variance'].includes(k))
                  .map(([key, val]) =>
                    typeof val === 'number' || typeof val === 'string' ? (
                      <KpiCard key={key} label={key} value={val} />
                    ) : null
                  )}
              </div>
            </Section>
          )}

          {/* Procurement Section */}
          {data.procurement && (
            <Section title="المشتريات" icon="🛒">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.procurement.open_requests !== undefined && (
                  <KpiCard label="طلبات الشراء المفتوحة" value={data.procurement.open_requests} icon="📋" />
                )}
                {data.procurement.pending_orders !== undefined && (
                  <KpiCard label="أوامر الشراء المعلقة" value={data.procurement.pending_orders} icon="⏸️" />
                )}
                {Object.entries(data.procurement)
                  .filter(([k]) => !['open_requests', 'pending_orders'].includes(k))
                  .map(([key, val]) =>
                    typeof val === 'number' || typeof val === 'string' ? (
                      <KpiCard key={key} label={key} value={val} />
                    ) : null
                  )}
              </div>
            </Section>
          )}

          {/* Generic KPIs */}
          {data.kpis && typeof data.kpis === 'object' && (
            <Section title="مؤشرات الأداء" icon="📈">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(data.kpis).map(([key, val]) => {
                  if (typeof val === 'number' || typeof val === 'string') {
                    return <KpiCard key={key} label={key} value={val} />
                  }
                  if (val && typeof val === 'object') {
                    const kpi = val as KpiValue
                    return (
                      <KpiCard
                        key={key}
                        label={kpi.label ?? key}
                        value={kpi.value ?? '—'}
                        unit={kpi.unit}
                      />
                    )
                  }
                  return null
                })}
              </div>
            </Section>
          )}

          {/* Other top-level keys */}
          {Object.entries(data)
            .filter(([k]) => !['kpis', 'projects', 'finance', 'procurement', 'cost_control'].includes(k))
            .map(([key, val]) => {
              if (val && typeof val === 'object' && !Array.isArray(val)) {
                const entries = Object.entries(val as Record<string, unknown>).filter(
                  ([, v]) => typeof v === 'number' || typeof v === 'string'
                )
                if (entries.length === 0) return null
                return (
                  <Section key={key} title={key} icon="📌">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {entries.map(([k, v]) => (
                        <KpiCard key={k} label={k} value={v as string | number} />
                      ))}
                    </div>
                  </Section>
                )
              }
              return null
            })}

        </div>
      )}
    </div>
  )
}
