'use client'

/**
 * Platform Admin — Tenant Detail
 *
 * GET  /api/platform/tenants/{id}          → tenant + settings
 * PATCH /api/platform/tenants/{id}/suspend  → active → suspended
 * PATCH /api/platform/tenants/{id}/activate → pending/suspended → active
 *
 * Protected by: auth:platform-token + platform.operator middleware.
 * schema_name is never returned by the backend and never displayed here.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { platformTenantsApi, type TenantDetail } from '@/lib/api/platform'
import { StatusBadge } from '@/components/ui/status-badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { PageHeader } from '@/components/ui/page-header'

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id     = Number(params.id)

  const [detail,    setDetail]    = useState<TenantDetail | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [confirm,   setConfirm]   = useState<'suspend' | 'activate' | null>(null)

  // Guard: invalid ID
  const isValidId = Number.isInteger(id) && id > 0

  const load = useCallback(() => {
    if (!isValidId) return
    setLoading(true)
    setError(null)
    platformTenantsApi
      .get(id)
      .then(setDetail)
      .catch((err: unknown) => {
        if (err instanceof TypeError) {
          setError('تعذّر الاتصال بالخادم — تحقق من الشبكة وأعد المحاولة')
        } else {
          setError(err instanceof Error ? err.message : 'فشل تحميل المستأجر')
        }
      })
      .finally(() => setLoading(false))
  }, [id, isValidId])

  useEffect(() => { load() }, [load])

  // Called after user confirms the dialog
  const executeAction = async (action: 'suspend' | 'activate') => {
    setConfirm(null)
    setActioning(true)
    setActionMsg(null)
    setActionErr(null)
    try {
      const res = action === 'suspend'
        ? await platformTenantsApi.suspend(id)
        : await platformTenantsApi.activate(id)
      setActionMsg(res.message)
      load()
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        setActionErr('تعذّر الاتصال بالخادم — تحقق من الشبكة وأعد المحاولة')
      } else {
        setActionErr(err instanceof Error ? err.message : 'فشل تنفيذ الإجراء')
      }
    } finally {
      setActioning(false)
    }
  }

  const tenant   = detail?.tenant
  const settings = detail?.settings ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.push('/platform/tenants')}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        ← العودة إلى القائمة
      </button>

      {/* Invalid ID guard */}
      {!isValidId && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">معرّف المستأجر غير صالح — يرجى العودة واختيار مستأجر من القائمة.</p>
        </div>
      )}

      {isValidId && loading && <LoadingSpinner message="جارٍ تحميل بيانات المستأجر..." />}
      {isValidId && error   && <ErrorDisplay message={error} onRetry={load} />}

      {/* Confirm dialog */}
      {confirm && tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {confirm === 'suspend' ? 'تأكيد إيقاف المستأجر' : 'تأكيد تفعيل المستأجر'}
            </h3>
            <p className="text-sm text-slate-600">
              {confirm === 'suspend'
                ? `هل أنت متأكد من إيقاف المستأجر «${tenant.name}»؟ سيتوقف وصول مستخدميه فوراً.`
                : `هل أنت متأكد من تفعيل المستأجر «${tenant.name}»؟`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm rounded-md border border-border text-slate-700 hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => executeAction(confirm)}
                className={[
                  'px-4 py-2 text-sm rounded-md text-white font-medium transition-colors',
                  confirm === 'suspend'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-green-700 hover:bg-green-800',
                ].join(' ')}
              >
                {confirm === 'suspend' ? 'نعم، إيقاف' : 'نعم، تفعيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isValidId && !loading && !error && tenant && (
        <>
          <PageHeader
            title={tenant.name}
            description={`slug: ${tenant.slug}`}
          >
            <StatusBadge status={tenant.status} />
          </PageHeader>

          {/* Action feedback */}
          {actionMsg && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{actionMsg}</p>
            </div>
          )}
          {actionErr && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{actionErr}</p>
            </div>
          )}

          {/* Tenant info card */}
          <div className="bg-white rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-foreground text-sm">معلومات المستأجر</h2>
            <InfoRow label="المعرّف"       value={String(tenant.id)} />
            <InfoRow label="الاسم"         value={tenant.name} />
            <InfoRow label="Slug"          value={tenant.slug} dir="ltr" />
            <InfoRow label="الحالة"        value={<StatusBadge status={tenant.status} />} />
            <InfoRow label="تاريخ الإنشاء" value={new Date(tenant.created_at).toLocaleString('ar-SA')} />
            <InfoRow label="آخر تحديث"    value={new Date(tenant.updated_at).toLocaleString('ar-SA')} />
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-foreground text-sm">الإجراءات</h2>
            <div className="flex flex-wrap gap-3">
              {tenant.status === 'active' && (
                <button
                  onClick={() => setConfirm('suspend')}
                  disabled={actioning}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium
                             hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actioning ? 'جارٍ التنفيذ...' : 'إيقاف المستأجر'}
                </button>
              )}
              {(tenant.status === 'pending' || tenant.status === 'suspended') && (
                <button
                  onClick={() => setConfirm('activate')}
                  disabled={actioning}
                  className="px-4 py-2 bg-green-700 text-white rounded-md text-sm font-medium
                             hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actioning ? 'جارٍ التنفيذ...' : 'تفعيل المستأجر'}
                </button>
              )}
              {tenant.status === 'active' && (
                <p className="text-xs text-muted-foreground self-center">
                  المستأجر نشط — يمكن إيقافه فقط
                </p>
              )}
              {tenant.status === 'suspended' && (
                <p className="text-xs text-muted-foreground self-center">
                  المستأجر موقوف — يمكن تفعيله
                </p>
              )}
              {tenant.status === 'pending' && (
                <p className="text-xs text-muted-foreground self-center">
                  المستأجر قيد الانتظار — يمكن تفعيله
                </p>
              )}
            </div>
          </div>

          {/* Settings */}
          {settings.length > 0 && (
            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <h2 className="font-semibold text-foreground text-sm">إعدادات المستأجر</h2>
              <div className="divide-y divide-border">
                {settings.map((s) => (
                  <div key={s.key} className="flex items-start gap-3 py-2">
                    <span className="text-xs font-mono text-muted-foreground w-40 flex-shrink-0">{s.key}</span>
                    <span className="text-sm text-foreground break-all">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settings.length === 0 && (
            <div className="bg-white rounded-lg border border-border p-5">
              <p className="text-sm text-muted-foreground">لا توجد إعدادات مسجّلة لهذا المستأجر.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string
  value: React.ReactNode
  dir?: 'ltr' | 'rtl'
}

function InfoRow({ label, value, dir }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium" dir={dir}>{value}</span>
    </div>
  )
}
