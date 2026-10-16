'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  listNetworkProfiles,
  activateNetworkProfile,
  extractNetworkMessage,
  PROFILE_TYPE_LABELS,
  type NetworkProfile,
  type NetworkProfileType,
  type NetworkProfileStatus,
} from '@/lib/api/network'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'

const TYPE_OPTIONS: { value: NetworkProfileType | ''; label: string }[] = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'owner', label: PROFILE_TYPE_LABELS.owner },
  { value: 'engineer', label: PROFILE_TYPE_LABELS.engineer },
  { value: 'contractor', label: PROFILE_TYPE_LABELS.contractor },
  { value: 'main_contractor', label: PROFILE_TYPE_LABELS.main_contractor },
  { value: 'subcontractor', label: PROFILE_TYPE_LABELS.subcontractor },
  { value: 'supplier', label: PROFILE_TYPE_LABELS.supplier },
]

const STATUS_OPTIONS: { value: NetworkProfileStatus | ''; label: string }[] = [
  { value: '', label: 'جميع الحالات' },
  { value: 'draft', label: 'مسودة' },
  { value: 'active', label: 'نشط' },
  { value: 'suspended', label: 'موقوف' },
  { value: 'deactivated', label: 'معطّل' },
]

export default function NetworkProfilesPage() {
  const [profiles, setProfiles] = useState<NetworkProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<NetworkProfileType | ''>('')
  const [statusFilter, setStatusFilter] = useState<NetworkProfileStatus | ''>('')
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchProfiles = useCallback(() => {
    setLoading(true)
    setError(null)
    listNetworkProfiles({
      page,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    })
      .then((res) => {
        setProfiles(res.data)
        setLastPage(res.meta.last_page)
      })
      .catch((err: unknown) =>
        setError(extractNetworkMessage(err, 'فشل تحميل قائمة الملفات الشخصية'))
      )
      .finally(() => setLoading(false))
  }, [page, typeFilter, statusFilter])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  async function handleActivate(id: string) {
    setActivatingId(id)
    setActionMsg(null)
    setActionError(null)
    try {
      await activateNetworkProfile(id)
      setActionMsg('تم تفعيل الملف الشخصي بنجاح')
      fetchProfiles()
    } catch (err: unknown) {
      setActionError(extractNetworkMessage(err, 'فشل تفعيل الملف الشخصي'))
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الملفات الشخصية — الشبكة</h1>
          <p className="text-muted-foreground text-sm mt-1">
            شركات وجهات شبكة البناء التجارية
          </p>
        </div>
        <Link
          href="/network/profiles/new"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + ملف شخصي جديد
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as NetworkProfileType | ''); setPage(1) }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as NetworkProfileStatus | ''); setPage(1) }}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {actionMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {actionMsg}
        </div>
      )}
      {actionError && <ErrorDisplay message={actionError} />}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchProfiles} />
      ) : profiles.length === 0 ? (
        <EmptyState message="لا توجد ملفات شخصية — أنشئ أول ملف شخصي للانضمام إلى شبكة البناء التجارية" />
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/network/profiles/${profile.id}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                  >
                    {profile.company_name}
                  </Link>
                  <StatusBadge status={profile.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {PROFILE_TYPE_LABELS[profile.profile_type] ?? profile.profile_type}
                  {profile.region ? ` · ${profile.region}` : ''}
                </p>
                {profile.contact_email && (
                  <p className="text-xs text-muted-foreground">{profile.contact_email}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {profile.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActivate(profile.id)}
                    disabled={activatingId === profile.id}
                  >
                    {activatingId === profile.id ? 'جارٍ التفعيل...' : 'تفعيل'}
                  </Button>
                )}
                <Link
                  href={`/network/profiles/${profile.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  عرض
                </Link>
                <Link
                  href={`/network/profiles/${profile.id}/edit`}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  تعديل
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
