'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  listSubcontractAgreements,
  type SubcontractAgreement,
  type PaginatedResponse,
  extractMessage,
} from '@/lib/api/subcontracts'

/**
 * WEB-001P — Subcontracts Agreements List
 * OI-5 resolved: GET /api/v1/subcontracts/agreements now available.
 */
export default function SubcontractAgreementsPage() {
  const [agreements, setAgreements] = useState<SubcontractAgreement[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<SubcontractAgreement>['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgreements = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listSubcontractAgreements(p)
      setAgreements(result.data)
      setMeta(result.meta)
    } catch (err: unknown) {
      setError(extractMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgreements(page)
  }, [page, fetchAgreements])

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط'
      case 'completed': return 'مكتمل'
      case 'cancelled': return 'ملغى'
      default: return 'مسودة'
    }
  }

  const statusClass = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">عقود المقاولين من الباطن</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إنشاء وإدارة عقود المقاولين من الباطن
          </p>
        </div>
        <Link
          href="/subcontracts/agreements/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + عقد جديد
        </Link>
      </div>

      {/* Agreements List */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      ) : agreements.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">لا توجد عقود بعد.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">رقم العقد</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">المقاول</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">العنوان</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">القيمة</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agreements.map((ag) => (
                <tr key={ag.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{ag.agreement_number}</td>
                  <td className="px-4 py-3 text-foreground">{ag.subcontractor_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ag.title}</td>
                  <td className="px-4 py-3 text-foreground">
                    {Number(ag.contract_value).toLocaleString('ar-SA')} {ag.currency ?? 'SAR'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(ag.status)}`}>
                      {statusLabel(ag.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/subcontracts/agreements/${ag.id}`}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      عرض ←
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md border border-border text-foreground disabled:opacity-40 hover:bg-muted/50 transition-colors"
          >
            السابق
          </button>
          <span className="text-muted-foreground">
            صفحة {meta.current_page} من {meta.last_page} ({meta.total} عقد)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="px-3 py-1.5 rounded-md border border-border text-foreground disabled:opacity-40 hover:bg-muted/50 transition-colors"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
