'use client'

/**
 * G-03 + G-04 — /administration — Tenant Settings & User Administration
 *
 * G-03: Tenant Settings — No dedicated tenant settings API endpoint exists in V1.
 *       Backend: no GET/PATCH /v1/tenant/settings route in api.php.
 *       Status: OPEN-BLOCKED — missing backend endpoint.
 *
 * G-04: User & Role Administration — No GET /users or GET /roles list endpoint in V1.
 *       Backend: only POST /iam/roles/{role}/permissions/{permission} exists.
 *       GET /auth/me returns current user identity.
 *       Status: PARTIAL — current user info displayed; full user list OPEN-BLOCKED.
 *
 * This page displays:
 *   - Current authenticated user identity (from GET /auth/me)
 *   - Documented blockers for full user/role management
 *   - Navigation to authorized IAM actions
 *
 * Backend authority: all authorization and tenant isolation enforced by Laravel 12.
 */

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string | number
  name: string
  email: string
  roles?: string[]
  permissions?: string[]
  tenant_slug?: string
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

// ─── Info Card ────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string
  value: string | number | undefined | null
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium">{value ?? '—'}</span>
    </div>
  )
}

// ─── Blocker Notice ───────────────────────────────────────────────────────────

interface BlockerNoticeProps {
  title: string
  reason: string
  dependency: string
}

function BlockerNotice({ title, reason, dependency }: BlockerNoticeProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-1">
      <p className="text-sm font-semibold text-yellow-800">⚠️ {title} — OPEN-BLOCKED</p>
      <p className="text-xs text-yellow-700">{reason}</p>
      <p className="text-xs text-yellow-600 font-mono">{dependency}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdministrationPage() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMe = useCallback(() => {
    setLoading(true)
    setError(null)
    apiClient
      .get<CurrentUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch((err: unknown) =>
        setError(extractMessage(err, 'فشل تحميل بيانات المستخدم'))
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإدارة والإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">
          إدارة المستخدمين والأدوار وإعدادات المستأجر
        </p>
      </div>

      {/* Current User Section */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span>👤</span>
          <span>المستخدم الحالي</span>
        </h2>

        {loading ? (
          <LoadingSpinner message="جارٍ تحميل بيانات المستخدم..." />
        ) : error ? (
          <ErrorDisplay message={error} onRetry={fetchMe} />
        ) : user ? (
          <div className="bg-card border border-border rounded-lg p-5">
            <InfoRow label="الاسم" value={user.name} />
            <InfoRow label="البريد الإلكتروني" value={user.email} />
            <InfoRow label="المعرّف" value={String(user.id)} />
            {user.tenant_slug && (
              <InfoRow label="المستأجر" value={user.tenant_slug} />
            )}
            {user.roles && Array.isArray(user.roles) && user.roles.length > 0 && (
              <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground w-32 flex-shrink-0">الأدوار</span>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0 && (
              <div className="flex items-start gap-3 py-2">
                <span className="text-sm text-muted-foreground w-32 flex-shrink-0">الصلاحيات</span>
                <div className="flex flex-wrap gap-1">
                  {user.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Blockers Section */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span>🔒</span>
          <span>الميزات المحجوبة — تتطلب تطوير Backend</span>
        </h2>

        <div className="space-y-3">
          <BlockerNotice
            title="قائمة المستخدمين"
            reason="لا يوجد endpoint GET /v1/users في V1. يتطلب إضافة UserController مع list/create/update/deactivate."
            dependency="MISSING: GET /api/v1/users — TASK-002A / CAP-012"
          />
          <BlockerNotice
            title="إدارة الأدوار"
            reason="لا يوجد endpoint GET /v1/roles في V1. يتطلب إضافة RoleController::index() و RoleController::show()."
            dependency="MISSING: GET /api/v1/roles — TASK-002A / IAM"
          />
          <BlockerNotice
            title="إعدادات المستأجر"
            reason="لا يوجد endpoint GET/PATCH /v1/tenant/settings في V1. يتطلب إضافة TenantSettingsController."
            dependency="MISSING: GET /api/v1/tenant/settings — CAP-001 / Tenant Settings"
          />
          <BlockerNotice
            title="تعيين الصلاحيات للأدوار"
            reason="يوجد POST /iam/roles/{role}/permissions/{permission} لكن يتطلب معرفة role ID مسبقاً من قائمة الأدوار."
            dependency="PARTIAL: POST /api/iam/roles/{role}/permissions/{permission} — requires role list first"
          />
        </div>
      </div>

      {/* Available Actions */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span>✅</span>
          <span>الإجراءات المتاحة حالياً</span>
        </h2>
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            الإجراءات التالية مدعومة بواجهة API موجودة:
          </p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              عرض بيانات المستخدم الحالي (GET /auth/me)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              تسجيل الخروج (POST /auth/spa/logout)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-600">⚠</span>
              تعيين صلاحية لدور (POST /iam/roles/{'{role}'}/permissions/{'{permission}'}) — يتطلب معرفة IDs
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
