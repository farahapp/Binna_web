'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getPurchaseRequest,
  submitPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  cancelPurchaseRequest,
  type PurchaseRequest,
  extractMessage,
} from '@/lib/api/procurement'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

export default function PurchaseRequestDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [pr, setPr] = useState<PurchaseRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchPR = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getPurchaseRequest(id)
      .then((data) => setPr(data))
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل بيانات طلب الشراء')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchPR()
  }, [fetchPR])

  async function handleAction(
    action: 'submit' | 'approve' | 'reject' | 'cancel',
    fn: (id: string) => Promise<PurchaseRequest>,
    successText: string
  ) {
    setActionLoading(action)
    setActionError(null)
    setActionSuccess(null)
    try {
      const updated = await fn(id)
      setPr(updated)
      setActionSuccess(successText)
    } catch (err: unknown) {
      setActionError(extractMessage(err, 'فشل تنفيذ الإجراء'))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner message="جارٍ تحميل بيانات طلب الشراء..." />
  if (error) return <ErrorDisplay message={error} onRetry={fetchPR} />
  if (!pr) return <ErrorDisplay message="طلب الشراء غير موجود" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/procurement/purchase-requests" className="hover:text-primary">
              طلبات الشراء
            </Link>
            <span>/</span>
            <span>{pr.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{pr.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">تفاصيل طلب الشراء وإجراءاته</p>
        </div>
        <span className="inline-block bg-muted px-3 py-1 rounded-full text-sm text-foreground">
          {pr.status ?? '—'}
        </span>
      </div>

      {/* Details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">بيانات الطلب</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">المعرّف: </span>
            <span className="text-foreground font-mono text-xs">{pr.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">الحالة: </span>
            <span className="inline-block bg-muted px-2 py-0.5 rounded-full text-xs text-foreground">
              {pr.status ?? '—'}
            </span>
          </div>
          {pr.project_id && (
            <div>
              <span className="text-muted-foreground">معرّف المشروع: </span>
              <span className="text-foreground font-mono text-xs">{pr.project_id}</span>
            </div>
          )}
          {pr.required_date && (
            <div>
              <span className="text-muted-foreground">تاريخ الحاجة: </span>
              <span className="text-foreground">{pr.required_date}</span>
            </div>
          )}
          {pr.requested_by && (
            <div>
              <span className="text-muted-foreground">طالب الشراء: </span>
              <span className="text-foreground">{pr.requested_by}</span>
            </div>
          )}
          {pr.created_at && (
            <div>
              <span className="text-muted-foreground">تاريخ الإنشاء: </span>
              <span className="text-foreground">{new Date(pr.created_at).toLocaleDateString('ar-SA')}</span>
            </div>
          )}
          {pr.description && (
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">الوصف: </span>
              <span className="text-foreground">{pr.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">الإجراءات</h2>

        {actionError && <ErrorDisplay message={actionError} />}
        {actionSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {actionSuccess}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {/* Submit */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('submit', submitPurchaseRequest, 'تم إرسال الطلب للموافقة بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'submit' ? 'جارٍ الإرسال...' : '📤 إرسال للموافقة'}
          </Button>

          {/* Approve */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('approve', approvePurchaseRequest, 'تمت الموافقة على الطلب بنجاح')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'approve' ? 'جارٍ الموافقة...' : '✅ موافقة'}
          </Button>

          {/* Reject */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('reject', rejectPurchaseRequest, 'تم رفض الطلب')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'reject' ? 'جارٍ الرفض...' : '❌ رفض'}
          </Button>

          {/* Cancel */}
          <Button
            variant="outline"
            onClick={() =>
              handleAction('cancel', cancelPurchaseRequest, 'تم إلغاء الطلب')
            }
            disabled={actionLoading !== null}
          >
            {actionLoading === 'cancel' ? 'جارٍ الإلغاء...' : '🚫 إلغاء'}
          </Button>
        </div>
      </div>
    </div>
  )
}
