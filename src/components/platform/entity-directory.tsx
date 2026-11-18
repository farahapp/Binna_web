'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  platformAuthApi,
  platformTenantsApi,
  type TenantClassification,
  type TenantDirectorySummary,
  type TenantIdentifier,
  type TenantListItem,
  type TenantsPage,
} from '@/lib/api/platform'
import { IDENTIFIER_LABELS } from '@/components/platform/tenant-form'
import { StatusBadge } from '@/components/ui/status-badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay } from '@/components/ui/error'
import { PageHeader } from '@/components/ui/page-header'

export type EntityDirectoryKind = 'all' | 'contractors' | 'consultants' | 'owners'

type ContractorTab = 'individual' | 'company'
type OwnerTab = 'individual' | 'organization' | 'all'

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'active', label: 'نشط' },
  { value: 'suspended', label: 'موقوف' },
]

const CLASSIFICATION_LABELS: Record<TenantClassification, string> = {
  contracting_company: 'شركة مقاولات',
  individual_contractor: 'مقاول فرد',
  engineering_consultancy: 'مكتب استشارات هندسية',
  property_owner: 'مالك عقار / عميل',
  needs_review: 'يحتاج مراجعة',
}

const CLASSIFICATION_REASON_LABELS = {
  missing_legal_type: 'الصفة القانونية غير متوفرة في السجل',
  missing_activity_type: 'النشاط غير محدد في السجل',
  unsupported_legal_type: 'الصفة القانونية غير معتمدة',
  unsupported_activity_type: 'النشاط غير معتمد',
  unsupported_combination: 'تركيبة الصفة والنشاط غير معتمدة',
} as const

const SECTION_META: Record<EntityDirectoryKind, { title: string; description: string }> = {
  all: {
    title: 'جميع الجهات',
    description: 'عرض شامل للجهات المسجّلة دون تكرار — مقاولون واستشاريون وملاك (Client).',
  },
  contractors: {
    title: 'المقاولون',
    description: 'قسم مستقل للمقاولين. افصل بين المقاول الفرد وشركة المقاولات من التبويبات أدناه. موظف الشركة ليس مقاولًا فردًا.',
  },
  consultants: {
    title: 'الاستشاريون',
    description: 'مكاتب وشركات الاستشارات الهندسية بهوية مستقلة عن المقاولين.',
  },
  owners: {
    title: 'الملاك',
    description: 'Owner = Client من مصدر tenants (activity_type=owner). لا يوجد Owner Tenant مستقل.',
  },
}

function registrationIdentifiers(tenant: TenantListItem) {
  const identifiers = (tenant.identifiers ?? []).map((identifier: TenantIdentifier) => ({
    key: String(identifier.id),
    label: IDENTIFIER_LABELS[identifier.type],
    number: identifier.number,
    expiresAt: identifier.expires_at,
  }))
  const hasLegacyQid = tenant.legal_type === 'individual'
    && Boolean(tenant.responsible_qid)
    && !identifiers.some((identifier) => identifier.label === IDENTIFIER_LABELS.qid && identifier.number === tenant.responsible_qid)

  if (hasLegacyQid && tenant.responsible_qid) {
    identifiers.push({
      key: 'legacy-qid',
      label: IDENTIFIER_LABELS.qid,
      number: tenant.responsible_qid,
      expiresAt: tenant.qid_expires_at,
    })
  }

  return identifiers
}

function entityTypeLabel(tenant: TenantListItem): { primary: string; secondary?: string } {
  if (tenant.classification === 'property_owner') {
    if (tenant.legal_type === 'individual') return { primary: 'مالك فرد', secondary: 'Client' }
    if (tenant.legal_type === 'organization') return { primary: 'جهة مالكة', secondary: 'Client' }
    return { primary: 'مالك (Client)', secondary: 'التصنيف الفرعي غير مكتمل' }
  }
  if (tenant.classification === 'needs_review') {
    const reason = tenant.classification_reason
      ? CLASSIFICATION_REASON_LABELS[tenant.classification_reason]
      : 'بيانات التصنيف غير مكتملة'
    return { primary: 'غير مصنّف — يحتاج مراجعة', secondary: reason }
  }
  return { primary: CLASSIFICATION_LABELS[tenant.classification] }
}

function sectionCount(kind: EntityDirectoryKind, summary: TenantDirectorySummary | null): number | null {
  if (!summary) return null
  if (kind === 'all') return summary.tenants.total
  if (kind === 'contractors') return summary.tenants.contractors_total
  if (kind === 'consultants') return summary.tenants.consultants_total
  return summary.tenants.owners_total
}

export function EntityDirectory({ kind }: { kind: EntityDirectoryKind }) {
  const meta = SECTION_META[kind]
  const [page, setPage] = useState<TenantsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [summary, setSummary] = useState<TenantDirectorySummary | null>(null)
  const [contractorTab, setContractorTab] = useState<ContractorTab>('individual')
  const [ownerTab, setOwnerTab] = useState<OwnerTab>('all')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const requestSequence = useRef(0)
  const contractorTabSeeded = useRef(false)
  const summaryRef = useRef<TenantDirectorySummary | null>(null)
  const permissionsRef = useRef<string[]>([])
  const pageRef = useRef<TenantsPage | null>(null)

  useEffect(() => { summaryRef.current = summary }, [summary])
  useEffect(() => { permissionsRef.current = permissions }, [permissions])
  useEffect(() => { pageRef.current = page }, [page])

  const load = useCallback(() => {
    const requestId = ++requestSequence.current
    const softRefresh = pageRef.current !== null
    if (softRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    const listParams: Parameters<typeof platformTenantsApi.list>[0] = {
      status: statusFilter || undefined,
      search: search || undefined,
      page: currentPage,
      per_page: 20,
    }

    // Unclassified entities stay in review; they are never silently assigned
    // to a contractor/consultant/owner tab by this view.
    if (kind === 'all' && reviewOnly) {
      listParams.classification = 'needs_review'
    }

    if (kind === 'contractors') {
      listParams.classification = contractorTab === 'individual'
        ? 'individual_contractor'
        : 'contracting_company'
    } else if (kind === 'consultants') {
      listParams.classification = 'engineering_consultancy'
    } else if (kind === 'owners') {
      listParams.classification = 'property_owner'
      if (ownerTab === 'individual') listParams.legal_type = 'individual'
      if (ownerTab === 'organization') listParams.legal_type = 'organization'
    }

    const cachedSummary = summaryRef.current
    const cachedPermissions = permissionsRef.current
    const needsBoot = !cachedSummary || cachedPermissions.length === 0

    const bootOperator = needsBoot
      ? platformAuthApi.me()
      : Promise.resolve({ permissions: cachedPermissions })
    const bootSummary = cachedSummary
      ? Promise.resolve(cachedSummary)
      : platformTenantsApi.summary()

    Promise.all([bootOperator, bootSummary, platformTenantsApi.list(listParams)])
      .then(([operator, directorySummary, tenants]) => {
        if (requestId !== requestSequence.current) return
        if (needsBoot) {
          setPermissions(operator.permissions ?? [])
        }
        setSummary(directorySummary)

        // First open: if individuals are empty but companies exist, land on companies
        // so the page does not look broken (count>0 / table empty).
        if (
          kind === 'contractors'
          && !contractorTabSeeded.current
          && contractorTab === 'individual'
        ) {
          contractorTabSeeded.current = true
          const individuals = directorySummary.tenants.by_classification.individual_contractor ?? 0
          const companies = directorySummary.tenants.by_classification.contracting_company ?? 0
          if (individuals === 0 && companies > 0) {
            setContractorTab('company')
            return
          }
        } else if (kind === 'contractors') {
          contractorTabSeeded.current = true
        }

        setPage(tenants)
      })
      .catch((err: unknown) => {
        if (requestId === requestSequence.current) {
          setError(err instanceof Error ? err.message : 'فشل تحميل دليل الجهات')
        }
      })
      .finally(() => {
        if (requestId === requestSequence.current) {
          setLoading(false)
          setRefreshing(false)
        }
      })
  }, [kind, statusFilter, search, currentPage, contractorTab, ownerTab, reviewOnly])

  useEffect(() => {
    load()
    return () => { requestSequence.current += 1 }
  }, [load])

  const count = sectionCount(kind, summary)
  const individualContractors = summary?.tenants.by_classification.individual_contractor ?? 0
  const contractingCompanies = summary?.tenants.by_classification.contracting_company ?? 0
  const needsReviewCount = summary?.tenants.by_classification.needs_review ?? 0

  return (
    <div className="space-y-6" data-entity-directory={kind}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={meta.title}
          description={meta.description}
        />
        <div className="flex flex-wrap gap-2">
          {permissions.includes('platform.tenant_registrations.view') && (
            <Link href="/platform/registration-requests" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
              طلبات التسجيل
            </Link>
          )}
        </div>
      </div>

      <nav aria-label="أقسام دليل الجهات" className="flex flex-wrap gap-2">
        {[
          { href: '/platform/tenants/contractors', label: 'المقاولون', active: kind === 'contractors', n: summary?.tenants.contractors_total },
          { href: '/platform/tenants/consultants', label: 'الاستشاريون', active: kind === 'consultants', n: summary?.tenants.consultants_total },
          { href: '/platform/tenants/owners', label: 'الملاك', active: kind === 'owners', n: summary?.tenants.owners_total },
          { href: '/platform/tenants', label: 'جميع الجهات', active: kind === 'all', n: summary?.tenants.total },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              item.active
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-white text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            {item.label}
            {typeof item.n === 'number' ? ` (${item.n})` : ''}
          </Link>
        ))}
      </nav>

      {typeof count === 'number' && (
        <p className="text-sm text-muted-foreground" data-testid="section-count">
          عدد الجهات في هذا القسم (من Backend): <strong className="text-foreground">{count}</strong>
          {kind === 'owners' ? ' · Owner = Client' : ''}
        </p>
      )}

      {kind === 'contractors' && (
        <div role="tablist" aria-label="تصنيف المقاولين" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={contractorTab === 'individual'}
            onClick={() => { setContractorTab('individual'); setCurrentPage(1) }}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold',
              contractorTab === 'individual' ? 'bg-primary text-primary-foreground' : 'border border-border bg-white',
            ].join(' ')}
          >
            مقاولون أفراد ({individualContractors})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={contractorTab === 'company'}
            onClick={() => { setContractorTab('company'); setCurrentPage(1) }}
            className={[
              'rounded-md px-4 py-2 text-sm font-semibold',
              contractorTab === 'company' ? 'bg-primary text-primary-foreground' : 'border border-border bg-white',
            ].join(' ')}
          >
            شركات مقاولات ({contractingCompanies})
          </button>
        </div>
      )}

      {kind === 'owners' && (
        <div role="tablist" aria-label="تصنيف الملاك" className="flex flex-wrap gap-2">
          {([
            ['all', 'كل الملاك'],
            ['individual', 'مالك فرد'],
            ['organization', 'جهة مالكة'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ownerTab === id}
              onClick={() => { setOwnerTab(id); setCurrentPage(1) }}
              className={[
                'rounded-md px-4 py-2 text-sm font-semibold',
                ownerTab === id ? 'bg-primary text-primary-foreground' : 'border border-border bg-white',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value || 'all-status'}
              type="button"
              onClick={() => { setStatusFilter(opt.value); setCurrentPage(1) }}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium',
                statusFilter === opt.value ? 'bg-slate-900 text-white' : 'border border-border bg-white text-slate-600',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
          {kind === 'all' && needsReviewCount > 0 && (
            <button
              type="button"
              data-testid="review-filter"
              aria-pressed={reviewOnly}
              onClick={() => { setReviewOnly((value) => !value); setCurrentPage(1) }}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium',
                reviewOnly ? 'bg-amber-700 text-white' : 'border border-amber-300 bg-amber-50 text-amber-900',
              ].join(' ')}
            >
              {reviewOnly ? 'عرض كل الجهات' : `تحتاج مراجعة (${needsReviewCount})`}
            </button>
          )}
        </div>
        <form
          className="flex flex-1 flex-wrap gap-2 sm:max-w-xl"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setCurrentPage(1)
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="بحث بالاسم أو Slug أو رقم التسجيل..."
            aria-label="بحث في الجهات"
            className="form-input flex-1"
            dir="rtl"
          />
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">بحث</button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40"
            disabled={!statusFilter && !search && !searchInput && !reviewOnly}
            onClick={() => {
              setStatusFilter('')
              setSearch('')
              setSearchInput('')
              setReviewOnly(false)
              setCurrentPage(1)
            }}
          >
            إعادة تعيين
          </button>
        </form>
      </div>

      {loading && !page && <LoadingSpinner message="جارٍ تحميل الجهات..." />}
      {error && <ErrorDisplay message={error} onRetry={load} />}
      {refreshing && (
        <p className="text-xs text-muted-foreground" data-testid="list-refreshing" aria-live="polite">
          جارٍ تحديث القائمة...
        </p>
      )}

      {kind === 'all' && needsReviewCount > 0 && !reviewOnly && (
        <div
          role="status"
          data-testid="review-notice"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p>
            {needsReviewCount} جهات تحتاج مراجعة؛ لم يُثبت نوعها من بيانات النشاط، لذلك لا تظهر في صفحات المقاولين أو الاستشاريين أو الملاك.
            لم يُسند إليها أي نوع تلقائيًا.
          </p>
          <button
            type="button"
            onClick={() => { setReviewOnly(true); setCurrentPage(1) }}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
          >
            عرض السجلات التي تحتاج مراجعة
          </button>
        </div>
      )}

      {!error && page && (
        <div className={refreshing ? 'opacity-70 transition-opacity' : undefined} aria-busy={refreshing}>
          <p className="text-sm text-muted-foreground">
            نتائج القائمة: {page.total} · صفحة {page.current_page} من {page.last_page}
          </p>
          {page.data.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              {kind !== 'all' && needsReviewCount > 0
                ? `لا توجد جهات مصنفة في هذا القسم. ${needsReviewCount} جهات غير مصنفة تظهر في «جميع الجهات» بحالة «يحتاج مراجعة» ولم تُسند إلى نوع.`
                : kind === 'contractors' && contractorTab === 'individual'
                  ? 'لا يوجد مقاولون أفراد حاليًا. انتقل إلى تبويب شركات المقاولات.'
                  : kind === 'contractors' && contractorTab === 'company'
                    ? 'لا توجد شركات مقاولات في هذا التبويب حاليًا.'
                    : kind === 'all' && reviewOnly
                      ? 'لا توجد جهات تحتاج مراجعة حاليًا.'
                      : 'لا توجد جهات في هذا القسم حاليًا.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-white">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="border-b border-border bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">الاسم</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Slug</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">نوع الجهة</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">معرّفات التسجيل</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">تاريخ الإنشاء</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {page.data.map((tenant: TenantListItem) => {
                    const type = entityTypeLabel(tenant)
                    return (
                      <tr key={tenant.id} className="transition-colors hover:bg-slate-50" data-classification={tenant.classification}>
                        <td className="px-4 py-3 font-medium text-foreground">{tenant.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tenant.slug}</td>
                        <td className="px-4 py-3">
                          <span className={tenant.classification === 'needs_review'
                            ? 'inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900'
                            : 'inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700'}>
                            {type.primary}
                          </span>
                          {type.secondary && (
                            <p className="mt-1 text-xs text-amber-800">{type.secondary}</p>
                          )}
                          {(tenant.legal_type || tenant.activity_type) && tenant.classification === 'needs_review' && (
                            <p className="mt-1 font-mono text-[11px] text-slate-500" dir="ltr">
                              legal={tenant.legal_type ?? 'null'} · activity={tenant.activity_type ?? 'null'}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {registrationIdentifiers(tenant).length ? (
                            <div className="space-y-1">
                              {registrationIdentifiers(tenant).map((identifier) => (
                                <p key={identifier.key} className="text-xs">
                                  <span className="text-muted-foreground">{identifier.label}: </span>
                                  <span dir="ltr" className="font-mono">{identifier.number}</span>
                                </p>
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(tenant.created_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <Link href={`/platform/tenants/${tenant.id}`} className="text-xs text-primary hover:underline">
                            تفاصيل
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {page.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                السابق
              </button>
              <span className="text-sm text-muted-foreground">{currentPage} / {page.last_page}</span>
              <button
                type="button"
                disabled={currentPage === page.last_page}
                onClick={() => setCurrentPage((p) => Math.min(page.last_page, p + 1))}
                className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
