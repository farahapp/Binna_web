'use client'

/**
 * Platform Admin — Change Password
 *
 * POST /api/platform/auth/change-password
 * Body: { current_password, new_password, new_password_confirmation }
 *
 * Security invariants:
 *  - Uses platformAuthApi.changePassword() via platformFetch (Bearer PAT).
 *  - No X-Tenant header. No CSRF cookie. No Tenant Axios client.
 *  - Passwords are never logged or displayed after submission.
 *  - Fields are cleared on success.
 *  - Submit button disabled during in-flight request.
 *  - Client-side validation: new_password_confirmation must match new_password.
 */

import { useState } from 'react'
import Link from 'next/link'
import { platformAuthApi } from '@/lib/api/platform'
import { PageHeader } from '@/components/ui/page-header'

export default function PlatformChangePasswordPage() {
  const [currentPassword,       setCurrentPassword]       = useState('')
  const [newPassword,           setNewPassword]           = useState('')
  const [newPasswordConfirm,    setNewPasswordConfirm]    = useState('')
  const [loading,               setLoading]               = useState(false)
  const [success,               setSuccess]               = useState<string | null>(null)
  const [error,                 setError]                 = useState<string | null>(null)
  const [confirmMismatch,       setConfirmMismatch]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setConfirmMismatch(false)

    // Client-side confirmation check before sending to backend
    if (newPassword !== newPasswordConfirm) {
      setConfirmMismatch(true)
      return
    }

    setLoading(true)
    try {
      const result = await platformAuthApi.changePassword(
        currentPassword,
        newPassword,
        newPasswordConfirm,
      )
      setSuccess(result.message ?? 'تم تغيير كلمة المرور بنجاح.')
      // Clear all password fields on success
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تغيير كلمة المرور'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تغيير كلمة المرور"
        description="تغيير كلمة مرور حساب مسؤول المنصة الحالي"
      />

      <div className="max-w-md">
        <div className="bg-white border border-border rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Current Password */}
            <div className="space-y-1">
              <label htmlFor="current_password" className="text-sm font-medium text-slate-700">
                كلمة المرور الحالية
              </label>
              <input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="form-input w-full"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label htmlFor="new_password" className="text-sm font-medium text-slate-700">
                كلمة المرور الجديدة
              </label>
              <input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="form-input w-full"
                placeholder="••••••••"
                disabled={loading}
              />
              <p className="text-xs text-slate-500">8 أحرف على الأقل</p>
            </div>

            {/* New Password Confirmation */}
            <div className="space-y-1">
              <label htmlFor="new_password_confirmation" className="text-sm font-medium text-slate-700">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                id="new_password_confirmation"
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => {
                  setNewPasswordConfirm(e.target.value)
                  setConfirmMismatch(false)
                }}
                required
                autoComplete="new-password"
                className={[
                  'form-input w-full',
                  confirmMismatch ? 'border-red-400 focus:ring-red-400' : '',
                ].join(' ')}
                placeholder="••••••••"
                disabled={loading}
              />
              {confirmMismatch && (
                <p className="text-xs text-red-600">كلمتا المرور غير متطابقتين</p>
              )}
            </div>

            {/* Success message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-slate-900 text-white rounded-md font-medium
                           hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
              </button>
              <Link
                href="/platform/tenants"
                className="py-2.5 px-4 border border-border text-slate-600 rounded-md font-medium
                           hover:bg-slate-50 transition-colors text-sm text-center"
              >
                إلغاء
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
