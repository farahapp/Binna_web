'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getNetworkProfile,
  activateNetworkProfile,
  getVerificationStatus,
  getOwnVerification,
  submitVerification,
  extractNetworkMessage,
  PROFILE_TYPE_LABELS,
  type NetworkProfile,
  type VerificationPublicStatus,
  type VerificationOwnView,
} from '@/lib/api/network'
import { LoadingPage } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  unverified: 'غير موثّق',
  pending: 'قيد المراجعة',
  verified: 'موثّق ✓',
  rejected: 'مرفوض',
}

const VERIFICATION_STATUS_COLORS: Record<string, string> = {
  unverified: 'text-muted-foreground',
  pending: 'text-yellow-600',
  verified: 'text-green-600 font-semibold',
  rejected: 'text-destructive',
}

export default function NetworkProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [profile, setProfile] = useState<NetworkProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [verStatus, setVerStatus] = useState<VerificationPublicStatus | null>(null)
  const [ownVer, setOwnVer] = useState<VerificationOwnView | null>(null)

  const [activating, setActivating] = useState(false)
  const [activateMsg, setActivateMsg] = useState<string | null>(null)
  const [activateError, setActivateError] = useState<string | null>(null)

  // Verification submit form
  const [showVerForm, setShowVerForm] = useState(false)
  const [verBizReg, setVerBizReg] = useState('')
  const [verLicense, setVerLicense] = useState('')
  const [verSubmitting, setVerSubmitting] = useState(false)
  const [verMsg, setVerMsg] = useState<string | null>(null)
  const [verError, setVerError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    Promise.all([
      getNetworkProfile(id),
      getVerificationStatus(id).catch(() => null),
      getOwnVerification(id).catch(() => null),
    ])
      .then(([p, vs, ov]) => {
        setProfile(p)
        setVerStatus(vs)
        setOwnVer(ov)
      })
      .catch((err: unknown) =>
        setError(extractNetworkMessage(err, 'فشل تحميل الملف الشخصي'))
      )
      .finally(() => setLoading(false))
  }, [id])

  async function handleActivate() {
    if (!profile) return
    setActivating(true)
    setActivateMsg(null)
    setActivateError(null)
    try {
      const updated = await activateNetworkProfile(profile.id)
      setProfile(updated)
      setActivateMsg('تم تفعيل الملف الشخصي بنجاح')
    } catch (err: unknown) {
      setActivateError(extractNetworkMessage(err, 'فشل تفعيل الملف الشخصي'))
    } finally {
      setActivating(false)
    }
  }

  async function handleVerificationSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVerError(null)
    setVerMsg(null)
    if (!verBizReg.trim()) {
      setVerError('رقم السجل التجاري مطلوب')
      return
    }
    setVerSubmitting(true)
    try {
      const result = await submitVerification(id, {
        business_registration: verBizReg.trim(),
        ...(verLicense.trim() ? { professional_license: verLicense.trim() } : {}),
      })
      setOwnVer(result)
      setVerMsg('تم تقديم طلب التحقق بنجاح — سيتم مراجعته من قِبل الفريق المختص')
      setShowVerForm(false)
      // Refresh public status
      getVerificationStatus(id)
        .then(setVerStatus)
        .catch(() => null)
    } catch (err: unknown) {
      setVerError(extractNetworkMessage(err, 'فشل تقديم طلب التحقق'))
    } finally {
      setVerSubmitting(false)
    }
  }

  if (loading) return <LoadingPage />
  if (error) return <ErrorDisplay message={error} onRetry={() => router.refresh()} />
  if (!profile) return <ErrorDisplay message="الملف الشخصي غير موجود" />

  const currentVerStatus = verStatus?.status ?? 'unverified'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{profile.company_name}</h1>
            <StatusBadge status={profile.status} />
            {/* Verification badge — Trust Layer only */}
            <span
              className={`text-sm ${VERIFICATION_STATUS_COLORS[currentVerStatus] ?? 'text-muted-foreground'}`}
            >
              {VERIFICATION_STATUS_LABELS[currentVerStatus] ?? currentVerStatus}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {PROFILE_TYPE_LABELS[profile.profile_type] ?? profile.profile_type}
            {profile.region ? ` · ${profile.region}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleActivate}
              disabled={activating}
            >
              {activating ? 'جارٍ التفعيل...' : 'تفعيل الملف'}
            </Button>
          )}
          <Link
            href={`/network/profiles/${profile.id}/edit`}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            تعديل
          </Link>
        </div>
      </div>

      {/* Activate messages */}
      {activateMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {activateMsg}
        </div>
      )}
      {activateError && <ErrorDisplay message={activateError} />}

      {/* Profile details */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">بيانات الملف الشخصي</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">نوع المشارك</dt>
            <dd className="text-foreground font-medium mt-0.5">
              {PROFILE_TYPE_LABELS[profile.profile_type] ?? profile.profile_type}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">الحالة</dt>
            <dd className="mt-0.5">
              <StatusBadge status={profile.status} />
            </dd>
          </div>
          {profile.region && (
            <div>
              <dt className="text-muted-foreground">المنطقة</dt>
              <dd className="text-foreground mt-0.5">{profile.region}</dd>
            </div>
          )}
          {profile.contact_email && (
            <div>
              <dt className="text-muted-foreground">البريد الإلكتروني</dt>
              <dd className="text-foreground mt-0.5">{profile.contact_email}</dd>
            </div>
          )}
          {profile.contact_phone && (
            <div>
              <dt className="text-muted-foreground">الهاتف</dt>
              <dd className="text-foreground mt-0.5">{profile.contact_phone}</dd>
            </div>
          )}
          {profile.website && (
            <div>
              <dt className="text-muted-foreground">الموقع الإلكتروني</dt>
              <dd className="mt-0.5">
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profile.website}
                </a>
              </dd>
            </div>
          )}
          {profile.specializations && profile.specializations.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">التخصصات</dt>
              <dd className="text-foreground mt-0.5">{profile.specializations.join('، ')}</dd>
            </div>
          )}
          {profile.description && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">نبذة</dt>
              <dd className="text-foreground mt-0.5 whitespace-pre-line">{profile.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Verification section — Trust Layer */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-foreground">التحقق من الهوية</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              طبقة الثقة — لا تؤثر على إنشاء الملف أو تقديم العطاءات
            </p>
          </div>
          <span
            className={`text-sm font-medium ${VERIFICATION_STATUS_COLORS[currentVerStatus] ?? 'text-muted-foreground'}`}
          >
            {VERIFICATION_STATUS_LABELS[currentVerStatus] ?? currentVerStatus}
          </span>
        </div>

        {/* Own verification details */}
        {ownVer && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {ownVer.submitted_at && (
              <div>
                <dt className="text-muted-foreground">تاريخ التقديم</dt>
                <dd className="text-foreground mt-0.5">
                  {new Date(ownVer.submitted_at).toLocaleDateString('ar-SA')}
                </dd>
              </div>
            )}
            {ownVer.verified_at && (
              <div>
                <dt className="text-muted-foreground">تاريخ التوثيق</dt>
                <dd className="text-green-600 font-medium mt-0.5">
                  {new Date(ownVer.verified_at).toLocaleDateString('ar-SA')}
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* Verification messages */}
        {verMsg && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
            {verMsg}
          </div>
        )}
        {verError && <ErrorDisplay message={verError} />}

        {/* Submit verification form */}
        {(currentVerStatus === 'unverified' || currentVerStatus === 'rejected') && (
          <div>
            {!showVerForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowVerForm(true); setVerError(null); setVerMsg(null) }}
              >
                {currentVerStatus === 'rejected' ? 'إعادة تقديم طلب التحقق' : 'تقديم طلب التحقق'}
              </Button>
            ) : (
              <form onSubmit={handleVerificationSubmit} className="space-y-3 border border-border rounded-md p-4 bg-muted/30">
                <p className="text-sm font-medium text-foreground">بيانات التحقق</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    رقم السجل التجاري <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={verBizReg}
                    onChange={(e) => setVerBizReg(e.target.value)}
                    placeholder="رقم السجل التجاري"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    رقم الترخيص المهني (اختياري)
                  </label>
                  <Input
                    value={verLicense}
                    onChange={(e) => setVerLicense(e.target.value)}
                    placeholder="رقم الترخيص المهني"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={verSubmitting}>
                    {verSubmitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVerForm(false)}
                    disabled={verSubmitting}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Back link */}
      <div>
        <Link
          href="/network/profiles"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← العودة إلى قائمة الملفات الشخصية
        </Link>
      </div>
    </div>
  )
}
