'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getClient, type CrmClient, type ClientType, extractMessage } from '@/lib/api/crm'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: 'شركة',
  individual: 'فرد',
}

interface InfoRowProps {
  label: string
  value?: string | null
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground sm:w-40 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value ?? '—'}</span>
    </div>
  )
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [client, setClient] = useState<CrmClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClient = useCallback(() => {
    if (!id || isNaN(id)) {
      setError('معرّف العميل غير صالح')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getClient(id)
      .then(setClient)
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات العميل')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  if (loading) {
    return <LoadingSpinner message="جارٍ تحميل بيانات العميل..." />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          ← رجوع
        </Button>
        <ErrorDisplay message={error} onRetry={fetchClient} />
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          ← رجوع
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
          {client.trade_name && (
            <p className="text-muted-foreground text-sm mt-0.5">{client.trade_name}</p>
          )}
        </div>
        <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
          {CLIENT_TYPE_LABELS[client.type]}
        </span>
      </div>

      {/* Details card */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-base font-semibold text-foreground mb-2">بيانات العميل</h2>
        <div>
          <InfoRow label="الاسم" value={client.name} />
          <InfoRow label="الاسم التجاري" value={client.trade_name} />
          <InfoRow label="النوع" value={CLIENT_TYPE_LABELS[client.type]} />
          <InfoRow label="البريد الإلكتروني" value={client.email} />
          <InfoRow label="رقم الهاتف" value={client.phone} />
          <InfoRow label="الدولة" value={client.country} />
          <InfoRow label="المدينة" value={client.city} />
        </div>
      </div>
    </div>
  )
}
