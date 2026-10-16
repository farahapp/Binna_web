'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  getBOQ,
  type BOQ,
  extractMessage,
} from '@/lib/api/commercial'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'

const BOQ_TYPE_LABELS: Record<BOQ['type'], string> = {
  tender_boq: 'جدول كميات مناقصة',
  contract_boq: 'جدول كميات عقد',
  variation_boq: 'جدول كميات تعديل',
}

export default function BOQDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [boq, setBOQ] = useState<BOQ | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBOQ = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getBOQ(id)
      .then(setBOQ)
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات جدول الكميات')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchBOQ()
  }, [fetchBOQ])

  if (loading) return <LoadingSpinner message="جارٍ تحميل جدول الكميات..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchBOQ} />
  if (!boq) return <ErrorDisplay message="جدول الكميات غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{boq.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">تفاصيل جدول الكميات</p>
      </div>

      {/* BOQ Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات جدول الكميات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">المعرّف: </span>
            <span className="text-foreground font-medium">#{boq.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">العنوان: </span>
            <span className="text-foreground">{boq.title}</span>
          </div>
          <div>
            <span className="text-muted-foreground">النوع: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs">
              {BOQ_TYPE_LABELS[boq.type] ?? boq.type}
            </span>
          </div>
          {boq.tender_id && (
            <div>
              <span className="text-muted-foreground">معرّف المناقصة: </span>
              <span className="text-foreground">{boq.tender_id}</span>
            </div>
          )}
          {boq.created_at && (
            <div>
              <span className="text-muted-foreground">تاريخ الإنشاء: </span>
              <span className="text-foreground">{boq.created_at}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      {boq.sections && boq.sections.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">الأقسام</h2>
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto text-foreground">
            {JSON.stringify(boq.sections, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
