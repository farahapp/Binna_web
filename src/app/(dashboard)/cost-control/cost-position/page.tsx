'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getCostPosition,
  type CostPosition,
  extractMessage,
} from '@/lib/api/cost-control'
import { listProjects, type Project } from '@/lib/api/projects'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

export default function CostPositionPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [position, setPosition] = useState<CostPosition | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(() => {
    setProjectsLoading(true)
    listProjects(1)
      .then((res) => setProjects(res.data))
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  function handleLoad() {
    if (!selectedProjectId) return
    setLoading(true)
    setError(null)
    setPosition(null)
    getCostPosition(selectedProjectId)
      .then((p) => setPosition(p))
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل الموقف التكليفي')))
      .finally(() => setLoading(false))
  }

  const currency = position?.currency ?? 'SAR'

  // Variance: positive = under budget (good), negative = over budget (bad)
  const variancePositive = position ? Number(position.variance) >= 0 : true

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الموقف التكليفي</h1>
        <p className="text-muted-foreground text-sm mt-1">
          عرض الموقف التكليفي والانحرافات لكل مشروع
        </p>
      </div>

      {/* Project selector */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {projectsLoading ? (
            <LoadingSpinner />
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value)
                setPosition(null)
                setError(null)
              }}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[220px]"
            >
              <option value="">— اختر مشروعاً —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={handleLoad}
            disabled={!selectedProjectId || loading}
            variant="outline"
          >
            {loading ? 'جارٍ التحميل...' : 'عرض الموقف'}
          </Button>
        </div>

        {loading && <LoadingSpinner />}
        {error && <ErrorDisplay message={error} />}

        {!loading && !error && !position && selectedProjectId && (
          <EmptyState message="لا توجد بيانات موقف تكليفي لهذا المشروع" />
        )}

        {position && (
          <div className="space-y-6 pt-2">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="الميزانية الإجمالية"
                value={`${Number(position.budget_total).toLocaleString('ar-SA')} ${currency}`}
                color="text-foreground"
                icon="📊"
              />
              <KpiCard
                label="إجمالي الالتزامات"
                value={`${Number(position.total_committed).toLocaleString('ar-SA')} ${currency}`}
                color="text-amber-600"
                icon="📌"
              />
              <KpiCard
                label="التكاليف الفعلية"
                value={`${Number(position.total_actual).toLocaleString('ar-SA')} ${currency}`}
                color="text-blue-600"
                icon="💸"
              />
              <KpiCard
                label="الانحراف"
                value={`${Number(position.variance).toLocaleString('ar-SA')} ${currency}`}
                color={variancePositive ? 'text-green-600' : 'text-destructive'}
                icon={variancePositive ? '✅' : '⚠️'}
              />
            </div>

            {/* Progress bar: actual vs budget */}
            {Number(position.budget_total) > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>نسبة الصرف الفعلي</span>
                  <span>
                    {Math.min(
                      100,
                      Math.round(
                        (Number(position.total_actual) / Number(position.budget_total)) * 100
                      )
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      variancePositive ? 'bg-blue-500' : 'bg-destructive'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (Number(position.total_actual) / Number(position.budget_total)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Status note */}
            <div
              className={`p-3 rounded-md text-sm ${
                variancePositive
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {variancePositive
                ? 'المشروع ضمن الميزانية المعتمدة.'
                : 'تجاوز المشروع الميزانية المعتمدة. يُرجى مراجعة التكاليف.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string
  color: string
  icon: string
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-4 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{icon}</span>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
