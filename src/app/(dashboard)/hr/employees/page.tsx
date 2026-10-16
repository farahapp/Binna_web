'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listEmployees, extractMessage, type Employee } from '@/lib/api/hr'

function EmploymentTypeBadge({ type }: { type?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    full_time: { label: 'دوام كامل', className: 'bg-green-100 text-green-700 border-green-200' },
    part_time: { label: 'دوام جزئي', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    contractor: { label: 'متعاقد', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    intern: { label: 'متدرب', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  }
  const s = map[type ?? ''] ?? {
    label: type ?? '—',
    className: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  )
}

export default function EmployeesListPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  async function load(p: number) {
    setLoading(true)
    setError(null)
    try {
      const result = await listEmployees(p)
      setEmployees(result.data)
      setLastPage(result.last_page ?? 1)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الموظفون</h1>
          <p className="text-muted-foreground text-sm mt-1">قائمة موظفي المنشأة</p>
        </div>
        <Link
          href="/hr/employees/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + موظف جديد
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          جارٍ التحميل…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && employees.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          لا يوجد موظفون مسجلون بعد.
        </div>
      )}

      {/* Desktop Table */}
      {!loading && !error && employees.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-right text-muted-foreground">
                  <th className="px-4 py-3 font-medium">رقم الموظف</th>
                  <th className="px-4 py-3 font-medium">الاسم</th>
                  <th className="px-4 py-3 font-medium">المسمى الوظيفي</th>
                  <th className="px-4 py-3 font-medium">القسم</th>
                  <th className="px-4 py-3 font-medium">نوع التوظيف</th>
                  <th className="px-4 py-3 font-medium">تاريخ التعيين</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{emp.employee_number}</td>
                    <td className="px-4 py-3 font-medium">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.job_title ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.department ?? '—'}</td>
                    <td className="px-4 py-3">
                      <EmploymentTypeBadge type={emp.employment_type} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.hire_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/hr/employees/${emp.id}`}
                        className="text-primary text-xs hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {employees.map((emp) => (
              <Link
                key={emp.id}
                href={`/hr/employees/${emp.id}`}
                className="block bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.employee_number}</p>
                  </div>
                  <EmploymentTypeBadge type={emp.employment_type} />
                </div>
                {(emp.job_title || emp.department) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {emp.job_title}
                    {emp.job_title && emp.department ? ' — ' : ''}
                    {emp.department}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 transition-colors"
              >
                السابق
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {lastPage}
              </span>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40 transition-colors"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
