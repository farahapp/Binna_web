'use client'

/**
 * Platform Admin — Unified WhatsApp Management Centre.
 *
 * One entry point for account linking/monitoring and the legacy sending,
 * security, settings and operations-log functions. QR is credential material:
 * hidden by default, shown only on explicit operator action, never persisted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorDisplay } from '@/components/ui/error'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading'
import { PageHeader } from '@/components/ui/page-header'
import {
  platformAuthApi,
  platformWhatsAppApi,
  platformWhatsAppIntegrationApi as waApi,
  type PlatformOperator,
  type PlatformWhatsAppDashboard,
  type WhatsAppConnectionState,
  type WhatsAppIntegrationEvent,
  type WhatsAppIntegrationOverview,
  type WhatsAppManagedAccount,
  type WhatsAppSlot,
} from '@/lib/api/platform'

const POLL_MS = 12_000
const QR_FETCH_ATTEMPTS = 15
const QR_FETCH_DELAY_MS = 1_000
const SLOTS: WhatsAppSlot[] = ['primary', 'secondary']

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'accounts', label: 'الحسابات والأرقام' },
  { id: 'monitoring', label: 'حالة الاتصال والمراقبة' },
  { id: 'messages', label: 'الرسائل والإشعارات' },
  { id: 'templates', label: 'قوالب الرسائل' },
  { id: 'events', label: 'سجل الأحداث' },
  { id: 'settings', label: 'إعدادات التكامل' },
] as const

type TabId = (typeof TABS)[number]['id']
type ActionKey =
  | 'refresh_status'
  | 'connect'
  | 'generate_qr'
  | 'refresh_qr'
  | 'reconnect'
  | 'cancel_pairing'
  | 'disconnect'
  | 'change_number'
  | 'sync_identity'
  | 'approve'
  | 'rollback'
  | 'test_connection'
type LegacyAction = 'link' | 'replace' | 'sync' | 'approve' | 'test' | 'rollback' | 'cancel' | 'disconnect'
type QrEntry = { qr_data_url: string; expires_at?: string }

const STATE_LABEL: Record<WhatsAppConnectionState, string> = {
  connected: 'متصل',
  connecting: 'جاري الاتصال',
  qr_required: 'يتطلب QR',
  qr_pending: 'QR بانتظار المسح',
  disconnected: 'منقطع',
  reconnecting: 'جاري الاستعادة',
  session_invalid: 'جلسة غير صالحة',
  session_expired: 'انتهت الجلسة',
  bridge_offline: 'Bridge غير متاح',
  network_error: 'خطأ شبكة',
  stale: 'بيانات قديمة',
  unknown: 'غير معروف',
}

const ALERT_LABEL: Record<string, string> = {
  bridge_offline: 'جسر واتساب غير متاح',
  bridge_unavailable: 'تعذر الحصول على حالة جسر واتساب',
  account_disconnected: 'الحساب انقطع',
  heartbeat_stale: 'آخر نبضة قديمة',
  qr_required: 'مطلوب مسح QR',
  qr_expired: 'انتهت صلاحية رمز الربط',
  reconnect_failed: 'فشلت إعادة الاتصال',
  authentication_required: 'مطلوب تأكيد الهوية',
  session_invalid: 'الجلسة غير صالحة',
  session_expired: 'انتهت الجلسة',
}

const BRIDGE_STATUS_LABEL: Record<string, string> = {
  online: 'متصل',
  offline: 'غير متاح',
  unreachable: 'لا يمكن الوصول',
  auth_error: 'خطأ مصادقة',
  authentication_error: 'خطأ مصادقة',
  degraded: 'متدهور',
  network_error: 'خطأ شبكة',
  unknown: 'غير معروف',
}

function formatTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-QA')
}

function formatAge(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return '—'
  if (seconds < 60) return `${Math.round(seconds)} ث`
  if (seconds < 3600) return `${Math.round(seconds / 60)} د`
  return `${Math.round(seconds / 3600)} س`
}

function remainingSeconds(expiresAt: string | undefined, now: number): number | null {
  if (!expiresAt) return null
  const ms = Date.parse(expiresAt) - now
  return Number.isNaN(ms) ? null : Math.max(0, Math.floor(ms / 1000))
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5" id={id} data-testid={id}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function OverviewSection({ overview }: { overview: WhatsAppIntegrationOverview | null }) {
  if (!overview) return <LoadingSpinner />
  const { summary, bridge, accounts } = overview
  return (
    <Section id="wa-overview" title="نظرة عامة">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-500">حالة Bridge</p>
          <p className="mt-1 font-medium" data-testid="wa-bridge-status">
            {BRIDGE_STATUS_LABEL[bridge.status] ?? bridge.status}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-500">حسابات متصلة</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700" data-testid="wa-connected">{summary.connected_accounts}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-500">حسابات غير متصلة</p>
          <p className="mt-1 text-xl font-semibold text-rose-700" data-testid="wa-disconnected">{summary.disconnected_accounts}</p>
        </div>
        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs text-slate-500">تحتاج تدخلًا</p>
          <p className="mt-1 text-xl font-semibold text-amber-700" data-testid="wa-qr-required">{summary.qr_required_accounts}</p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
        <div><dt className="text-slate-500">إجمالي الحسابات</dt><dd data-testid="wa-total">{summary.total_accounts}</dd></div>
        <div><dt className="text-slate-500">آخر فحص ناجح</dt><dd dir="ltr">{formatTime(summary.last_successful_check_at)}</dd></div>
        <div><dt className="text-slate-500">آخر تحديث للنظام</dt><dd dir="ltr">{formatTime(summary.last_updated_at)}</dd></div>
        <div><dt className="text-slate-500">آخر خطأ تكامل</dt><dd dir="ltr">{bridge.error ?? '—'}</dd></div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => (
          <div key={account.slot} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium">{account.label}</p>
            <p className="mt-1" data-testid={`wa-summary-state-${account.slot}`}>
              {STATE_LABEL[account.connection_state] ?? account.connection_state}
            </p>
            <p className="mt-1 text-slate-500">آخر انقطاع: {formatTime(account.last_disconnected_at)}</p>
            {account.alerts.length > 0 ? (
              <ul className="mt-2 space-y-1 text-rose-800">
                {account.alerts.map((alert) => <li key={alert}>{ALERT_LABEL[alert] ?? alert}</li>)}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">{overview.caveat}</p>
    </Section>
  )
}

function AccountCard({
  account,
  qr,
  expiredAt,
  now,
  busy,
  canManage,
  canSettings,
  legacyAccount,
  onQrShow,
  onQrHide,
  onQrNew,
  onAction,
}: {
  account: WhatsAppManagedAccount
  qr: QrEntry | null
  expiredAt: string | null
  now: number
  busy: boolean
  canManage: boolean
  canSettings: boolean
  legacyAccount?: PlatformWhatsAppDashboard['accounts'][WhatsAppSlot]
  onQrShow: (slot: WhatsAppSlot) => void
  onQrHide: (slot: WhatsAppSlot) => void
  onQrNew: (slot: WhatsAppSlot) => void
  onAction: (slot: WhatsAppSlot, action: ActionKey) => void
}) {
  const state = account.connection_state
  const remaining = remainingSeconds(qr?.expires_at, now)
  const hasVisibleQr = Boolean(qr?.qr_data_url && remaining !== null && remaining > 0)

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5" data-testid={`wa-account-${account.slot}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{account.label}</h3>
          <p className="mt-1 text-xs text-slate-500">{account.purpose}</p>
          <p className="mt-1 font-mono text-xs text-slate-400" dir="ltr" data-testid={`wa-account-id-${account.slot}`}>
            {account.account_id}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            state === 'connected'
              ? 'bg-emerald-100 text-emerald-800'
              : ['qr_required', 'qr_pending'].includes(state)
                ? 'bg-amber-100 text-amber-900'
                : 'bg-rose-100 text-rose-800'
          }`}
          data-testid={`wa-state-${account.slot}`}
          data-state={state}
        >
          {STATE_LABEL[state] ?? state}
        </span>
      </header>

      {account.alerts.length > 0 ? (
        <div className="space-y-1 rounded-md border border-rose-200 bg-rose-50 p-3" data-testid={`wa-alerts-${account.slot}`}>
          {account.alerts.map((alert) => (
            <p key={alert} className="text-sm text-rose-800">{ALERT_LABEL[alert] ?? alert}</p>
          ))}
        </div>
      ) : null}

      <dl className="grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2" data-testid={`wa-details-${account.slot}`}>
        <div><dt className="text-slate-500">الرقم (مخفي جزئياً)</dt><dd dir="ltr">{account.phone_masked ?? '—'}</dd></div>
        <div><dt className="text-slate-500">حالة الجلسة</dt><dd dir="ltr">{account.session_state}</dd></div>
        <div><dt className="text-slate-500">حالة Bridge</dt><dd>{BRIDGE_STATUS_LABEL[account.bridge_session_status] ?? account.bridge_session_status}</dd></div>
        <div><dt className="text-slate-500">آخر اتصال ناجح</dt><dd dir="ltr">{formatTime(account.last_connected_at)}</dd></div>
        <div><dt className="text-slate-500">آخر انقطاع</dt><dd dir="ltr">{formatTime(account.last_disconnected_at)}</dd></div>
        <div><dt className="text-slate-500">آخر heartbeat</dt><dd dir="ltr">{formatTime(account.last_heartbeat_at)}</dd></div>
        <div><dt className="text-slate-500">عمر heartbeat</dt><dd dir="ltr">{formatAge(account.heartbeat_age_seconds)}</dd></div>
        <div><dt className="text-slate-500">آخر فحص حالة</dt><dd dir="ltr">{formatTime(account.last_status_check_at)}</dd></div>
        <div><dt className="text-slate-500">سبب الانقطاع</dt><dd dir="ltr">{account.disconnect_reason ?? '—'}</dd></div>
        <div><dt className="text-slate-500">حالة الاستعادة</dt><dd dir="ltr">{account.recovery_state} ({account.reconnect_attempt})</dd></div>
      </dl>

      {hasVisibleQr ? (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-4" data-testid={`wa-qr-box-${account.slot}`}>
          <p className="text-sm text-slate-600">
            امسح الرمز من تطبيق WhatsApp على هاتف هذا الحساب المخصص فقط. لا يظهر رمز الحساب الآخر.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr?.qr_data_url}
            alt=""
            referrerPolicy="no-referrer"
            className="h-52 w-52 border border-slate-200 bg-white p-2"
            data-testid={`wa-qr-${account.slot}`}
          />
          <p className="text-xs text-slate-500" dir="ltr">
            ينتهي خلال {remaining} ثانية · {formatTime(qr?.expires_at ?? null)}
          </p>
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            data-testid={`wa-hide-qr-${account.slot}`}
            onClick={() => onQrHide(account.slot)}
          >
            إخفاء QR
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600" data-testid={`wa-qr-placeholder-${account.slot}`}>
          {expiredAt ? (
            <>
              <p className="text-amber-800" data-testid={`wa-qr-expired-${account.slot}`}>انتهت صلاحية رمز الربط.</p>
              {canManage ? (
                <button
                  type="button"
                  disabled={busy}
                  className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  data-testid={`wa-new-qr-${account.slot}`}
                  onClick={() => onQrNew(account.slot)}
                >
                  إنشاء QR جديد
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p>رمز الربط مخفي.</p>
              {canManage && state !== 'connected' ? (
                <button
                  type="button"
                  disabled={busy}
                  className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  data-testid={`wa-show-qr-${account.slot}`}
                  onClick={() => onQrShow(account.slot)}
                >
                  إظهار QR
                </button>
              ) : null}
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2" data-testid={`wa-actions-${account.slot}`}>
        <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={() => onAction(account.slot, 'refresh_status')}>
          تحديث الحالة
        </button>
        {canManage && account.actions.reconnect ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" data-testid={`wa-action-${account.slot}-reconnect`} onClick={() => onAction(account.slot, 'reconnect')}>
            إعادة الاتصال
          </button>
        ) : null}
        {canManage && account.actions.change_number ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" data-testid={`wa-action-${account.slot}-change_number`} onClick={() => onAction(account.slot, 'change_number')}>
            تغيير الرقم
          </button>
        ) : null}
        {canManage && account.actions.cancel_pairing ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={() => onAction(account.slot, 'cancel_pairing')}>
            إلغاء الربط
          </button>
        ) : null}
        {canManage && account.actions.disconnect ? (
          <button type="button" disabled={busy} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-800 disabled:opacity-50" data-testid={`wa-action-${account.slot}-disconnect`} onClick={() => onAction(account.slot, 'disconnect')}>
            فصل الحساب
          </button>
        ) : null}
        {canSettings && legacyAccount ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" data-testid={`wa-action-${account.slot}-sync_identity`} onClick={() => onAction(account.slot, 'sync_identity')}>
            مزامنة الهوية
          </button>
        ) : null}
        {canSettings && legacyAccount?.lifecycle_state === 'awaiting_approval' ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" data-testid={`wa-action-${account.slot}-approve`} onClick={() => onAction(account.slot, 'approve')}>
            اعتماد الحساب
          </button>
        ) : null}
        {canSettings && legacyAccount?.has_session_backup ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" data-testid={`wa-action-${account.slot}-rollback`} onClick={() => onAction(account.slot, 'rollback')}>
            استعادة من نسخة
          </button>
        ) : null}
        {canSettings ? (
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" data-testid={`wa-action-${account.slot}-test`} onClick={() => onAction(account.slot, 'test_connection')}>
            اختبار الاتصال
          </button>
        ) : null}
      </div>
    </section>
  )
}

export default function PlatformWhatsAppManagementPage() {
  const [operator, setOperator] = useState<PlatformOperator | null>(null)
  const [tab, setTab] = useState<TabId>('overview')
  const [overview, setOverview] = useState<WhatsAppIntegrationOverview | null>(null)
  const [events, setEvents] = useState<Record<WhatsAppSlot, WhatsAppIntegrationEvent[]>>({ primary: [], secondary: [] })
  const [dash, setDash] = useState<PlatformWhatsAppDashboard | null>(null)
  const [qr, setQr] = useState<Partial<Record<WhatsAppSlot, QrEntry>>>({})
  const [expired, setExpired] = useState<Partial<Record<WhatsAppSlot, string | null>>>({})
  const qrRef = useRef<Partial<Record<WhatsAppSlot, QrEntry>>>({})
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [busySlot, setBusySlot] = useState<WhatsAppSlot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState<{ slot: WhatsAppSlot; action: ActionKey } | null>(null)
  const [testTo, setTestTo] = useState('')
  const [testSlot, setTestSlot] = useState<WhatsAppSlot>('primary')
  const [confirmSend, setConfirmSend] = useState(false)
  const [securitySlot, setSecuritySlot] = useState<WhatsAppSlot>('primary')
  const [backupId, setBackupId] = useState('')

  const permissions = useMemo(() => operator?.permissions ?? [], [operator])
  const canView = permissions.includes('platform.integrations.whatsapp.view')
  const canManage = permissions.includes('platform.integrations.whatsapp.manage')
  const canSettings = permissions.includes('platform.settings.whatsapp.manage')
  const allowed = canView || canManage || canSettings

  const saveQr = useCallback((slot: WhatsAppSlot, entry: QrEntry | undefined) => {
    qrRef.current = { ...qrRef.current, [slot]: entry }
    setQr(qrRef.current)
  }, [])

  const clearAllQr = useCallback(() => {
    qrRef.current = {}
    setQr({})
    setExpired({})
  }, [])

  const fetchQr = useCallback(async (slot: WhatsAppSlot, attempts = QR_FETCH_ATTEMPTS) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const data = await waApi.qr(slot)
        setExpired((prev) => ({ ...prev, [slot]: null }))
        saveQr(slot, { qr_data_url: data.qr_data_url, expires_at: data.expires_at })
        return true
      } catch {
        if (attempt + 1 < attempts) {
          await new Promise((resolve) => window.setTimeout(resolve, QR_FETCH_DELAY_MS))
        }
      }
    }
    saveQr(slot, undefined)
    return false
  }, [saveQr])

  const refreshOverview = useCallback(async () => {
    if (!canView && !canManage) return
    try {
      const result = await waApi.overview()
      setOverview(result)
      for (const account of result.accounts) {
        if (account.connection_state === 'connected' && !account.has_qr) {
          saveQr(account.slot, undefined)
        }
      }
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث الحالة')
    }
  }, [canView, canManage, saveQr])

  const loadLegacy = useCallback(async () => {
    if (!canSettings) return
    try {
      const result = await platformWhatsAppApi.show()
      setDash(result.whatsapp)
    } catch {
      // The unified monitoring view remains available if the legacy API fails.
    }
  }, [canSettings])

  const loadEvents = useCallback(async (slot: WhatsAppSlot) => {
    if (!canView && !canManage) return
    try {
      const result = await waApi.events(slot)
      setEvents((prev) => ({ ...prev, [slot]: result.events }))
    } catch {
      // Audit view is non-blocking for status polling.
    }
  }, [canView, canManage])

  useEffect(() => {
    let active = true
    platformAuthApi.me()
      .then(async (current) => {
        if (!active) return
        setOperator(current)
        const grants = current.permissions ?? []
        if (grants.includes('platform.integrations.whatsapp.view') || grants.includes('platform.integrations.whatsapp.manage')) {
          await Promise.all([refreshOverview(), loadEvents('primary'), loadEvents('secondary')])
        }
        if (grants.includes('platform.settings.whatsapp.manage')) await loadLegacy()
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'فشل التحميل')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshOverview, loadEvents, loadLegacy])

  useEffect(() => {
    if (!allowed) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void refreshOverview()
    }, POLL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshOverview()
      else clearAllQr()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [allowed, refreshOverview, clearAllQr])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    for (const slot of SLOTS) {
      const entry = qrRef.current[slot]
      if (entry?.expires_at && Date.parse(entry.expires_at) <= now) {
        saveQr(slot, undefined)
        setExpired((prev) => ({ ...prev, [slot]: entry.expires_at ?? null }))
      }
    }
  }, [now, saveQr])

  const changeTab = useCallback((next: TabId) => {
    clearAllQr()
    setTab(next)
  }, [clearAllQr])

  const showQr = useCallback(async (slot: WhatsAppSlot, forceNew = false) => {
    if (!canManage) {
      setError('لا تملك صلاحية إظهار رمز الربط.')
      return
    }
    const account = overview?.accounts.find((item) => item.slot === slot)
    if (!forceNew && account?.connection_state === 'connected' && !account.has_qr) {
      setNotice('الحساب متصل بالفعل؛ لا حاجة إلى رمز ربط.')
      return
    }
    setBusySlot(slot)
    setError(null)
    setNotice(null)
    try {
      let ready = false
      if (!forceNew) ready = await fetchQr(slot, 1)
      if (!ready) {
        if (forceNew) await waApi.refreshQr(slot)
        else await waApi.connect(slot)
        ready = await fetchQr(slot)
      }
      setNotice(ready ? `تم تجهيز رمز الربط للحساب ${slot}.` : 'QR غير متاح بعد؛ أعد المحاولة بعد لحظات.')
      await Promise.all([refreshOverview(), loadEvents(slot)])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إظهار رمز الربط')
    } finally {
      setBusySlot(null)
    }
  }, [canManage, overview, fetchQr, refreshOverview, loadEvents])

  const hideQr = useCallback((slot: WhatsAppSlot) => {
    saveQr(slot, undefined)
    setNotice('تم إخفاء الرمز دون فصل الحساب أو إلغاء الربط.')
  }, [saveQr])

  const runAction = useCallback(async (slot: WhatsAppSlot, action: ActionKey) => {
    setBusySlot(slot)
    setError(null)
    setNotice(null)
    try {
      if (action === 'refresh_status') {
        await refreshOverview()
      } else if (action === 'reconnect') {
        await waApi.reconnect(slot)
        setNotice('تم بدء استعادة الجلسة المحفوظة.')
      } else if (action === 'cancel_pairing') {
        await waApi.cancelPairing(slot)
        saveQr(slot, undefined)
        setNotice('تم إلغاء الربط.')
      } else if (action === 'disconnect') {
        await waApi.disconnect(slot)
        saveQr(slot, undefined)
        setNotice('تم فصل الحساب مع الحفاظ على ملفات الجلسة المشفرة.')
      } else if (action === 'change_number') {
        saveQr(slot, undefined)
        await waApi.changeNumber(slot)
        setNotice('بدأ تغيير الرقم؛ الجلسة الحالية تُحفظ حتى نجاح الربط الجديد.')
      } else if (action === 'sync_identity') {
        await waApi.syncIdentity(slot)
        await loadLegacy()
        setNotice('تمت مزامنة هوية الرقم المرتبط. راجعها ثم اعتمد الحساب.')
      } else if (action === 'approve') {
        await waApi.approve(slot)
        saveQr(slot, undefined)
        await loadLegacy()
        setNotice('تم اعتماد الحساب. الإرسال التشغيلي لا يزال معطلاً.')
      } else if (action === 'rollback') {
        await platformWhatsAppApi.rollback(slot)
        await loadLegacy()
        setNotice('تمت الاستعادة من النسخة الاحتياطية.')
      } else if (action === 'test_connection') {
        const result = await platformWhatsAppApi.testConnection(slot)
        setDash(result.dashboard)
        setNotice('اكتمل اختبار الاتصال.')
      }
      await Promise.all([refreshOverview(), loadEvents(slot)])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إتمام العملية')
    } finally {
      setBusySlot(null)
    }
  }, [refreshOverview, loadEvents, loadLegacy, saveQr])

  const onAction = useCallback((slot: WhatsAppSlot, action: ActionKey) => {
    if (['disconnect', 'change_number', 'approve', 'rollback'].includes(action)) {
      setPending({ slot, action })
      return
    }
    void runAction(slot, action)
  }, [runAction])

  const confirmPending = useCallback(() => {
    if (!pending) return
    const target = pending
    setPending(null)
    void runAction(target.slot, target.action)
  }, [pending, runAction])

  const withBusy = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try { await fn() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إتمام العملية') }
    finally { setBusy(false) }
  }, [])

  if (loading && !operator) return <div className="p-6"><LoadingSpinner /></div>

  if (!allowed) {
    return (
      <div className="space-y-4 p-6" dir="rtl" data-testid="wa-management-denied">
        <ErrorDisplay message="لا تملك صلاحية مشاهدة مركز إدارة واتساب." />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl" data-testid="wa-management-page">
      <PageHeader
        title="إدارة WhatsApp"
        description="مركز موحد للحسابين Primary وSecondary · ربط ومراقبة وإعدادات وسجلات آمنة."
      />
      {error ? <div data-testid="wa-message"><ErrorDisplay message={error} /></div> : null}
      {notice ? <p className="text-sm text-emerald-800" data-testid="wa-message">{notice}</p> : null}

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2" aria-label="أقسام إدارة واتساب">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            data-testid={`wa-tab-${item.id}`}
            className={`rounded-md px-3 py-2 text-sm ${tab === item.id ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" data-testid="wa-refresh-all" onClick={() => void refreshOverview()}>
          تحديث الحالة
        </button>
        <span className="text-xs text-slate-500">آخر تحديث: {formatTime(overview?.summary.last_updated_at ?? null)}</span>
      </div>

      {tab === 'overview' ? <OverviewSection overview={overview} /> : null}

      {tab === 'accounts' ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {(overview?.accounts ?? []).map((account) => (
            <AccountCard
              key={account.slot}
              account={account}
              qr={qr[account.slot] ?? null}
              expiredAt={expired[account.slot] ?? null}
              now={now}
              busy={busySlot === account.slot}
              canManage={canManage}
              canSettings={canSettings}
              legacyAccount={dash?.accounts?.[account.slot]}
              onQrShow={(slot) => void showQr(slot)}
              onQrHide={hideQr}
              onQrNew={(slot) => void showQr(slot, true)}
              onAction={onAction}
            />
          ))}
        </div>
      ) : null}

      {tab === 'monitoring' ? (
        <Section id="wa-monitoring" title="حالة الاتصال والمراقبة">
          {(overview?.accounts ?? []).map((account) => (
            <div key={account.slot} className="rounded-md border border-slate-200 p-4 text-sm">
              <p className="font-medium">{account.label}</p>
              <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <div><dt className="text-slate-500">الحالة</dt><dd>{STATE_LABEL[account.connection_state] ?? account.connection_state}</dd></div>
                <div><dt className="text-slate-500">Bridge</dt><dd>{BRIDGE_STATUS_LABEL[account.bridge_session_status] ?? account.bridge_session_status}</dd></div>
                <div><dt className="text-slate-500">heartbeat</dt><dd dir="ltr">{formatTime(account.last_heartbeat_at)} ({formatAge(account.heartbeat_age_seconds)})</dd></div>
                <div><dt className="text-slate-500">محاولات الاستعادة</dt><dd>{account.reconnect_attempt}</dd></div>
                <div><dt className="text-slate-500">آخر فحص</dt><dd dir="ltr">{formatTime(account.last_status_check_at)}</dd></div>
                <div><dt className="text-slate-500">آخر خطأ</dt><dd dir="ltr">{account.disconnect_reason ?? '—'}</dd></div>
              </dl>
            </div>
          ))}
        </Section>
      ) : null}

      {tab === 'messages' ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Section id="wa-messages" title="الرسائل والإشعارات">
            <p className="text-sm text-slate-600">
              إرسال الرسائل الانتجازي لا يزال معطلاً تشغيليًا. لا تُرسل رسائل أو OTP أثناء الاختبارات.
            </p>
            {dash ? (
              <div className="flex flex-wrap gap-4 text-sm">
                {([
                  ['primary_enabled', 'تفعيل Primary'],
                  ['secondary_enabled', 'تفعيل Secondary'],
                  ['failover_enabled', 'تحويل تلقائي'],
                  ['otp_enabled', 'OTP واتساب'],
                  ['notifications_enabled', 'إشعارات تشغيلية'],
                  ['email_fallback_enabled', 'بريد احتياطي'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(dash.settings[key])}
                      disabled={busy || !canSettings}
                      onChange={(e) => void withBusy(async () => {
                        const result = await platformWhatsAppApi.updateSettings({ [key]: e.target.checked })
                        setDash(result.whatsapp)
                      })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">إعدادات الإرسال غير متاحة لهذا المشغّل.</p>}
            <button
              type="button"
              disabled={busy || !canSettings}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              data-testid="wa-test-both"
              onClick={() => void withBusy(async () => {
                const result = await platformWhatsAppApi.testConnection()
                setDash(result.dashboard)
                setNotice('اكتمل اختبار الحسابين.')
              })}
            >
              اختبار الحسابين
            </button>
          </Section>

          <Section id="wa-test-message" title="رسالة اختبار (موافقة صريحة)">
            <div className="flex flex-wrap items-end gap-3">
              <select className="rounded border border-slate-300 px-2 py-2 text-sm" value={testSlot} onChange={(e) => setTestSlot(e.target.value as WhatsAppSlot)}>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
              <Input dir="ltr" className="max-w-xs" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+974xxxxxxxx" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmSend} onChange={(e) => setConfirmSend(e.target.checked)} />
                أؤكد الإرسال لرقم المختبر
              </label>
              <button
                type="button"
                disabled={busy || !confirmSend || !canSettings}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void withBusy(async () => {
                  await platformWhatsAppApi.testMessage(testSlot, testTo.trim(), true)
                  setConfirmSend(false)
                  setNotice('أُرسلت رسالة الاختبار (حسب الإعدادات).')
                })}
              >
                إرسال رسالة اختبار
              </button>
            </div>
            <p className="text-xs text-rose-700">لا ترسل رسالة إلا إلى رقم تملكه وتؤكد ملكيته، وبعد اكتمال ربط الحساب.</p>
          </Section>
        </div>
      ) : null}

      {tab === 'templates' ? (
        <Section id="wa-templates" title="قوالب الرسائل">
          <p className="text-sm text-slate-600">V2 / Open Item: لا توجد مكتبة قوالب في التنفيذ الحالي. Bridge يدعم فقط وسوم قوالب ثابتة للإشعارات الداخلية، ولا توجد واجهة إنشاء أو تعديل قوالب.</p>
        </Section>
      ) : null}

      {tab === 'events' ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {SLOTS.map((slot) => (
            <Section key={slot} id={`wa-events-${slot}`} title={`سجل أحداث ${slot}`}>
              <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                {events[slot].length === 0 ? <li className="text-slate-500">لا توجد أحداث.</li> : events[slot].map((event) => (
                  <li key={event.id} className="border-b border-slate-100 py-1" dir="ltr">
                    {formatTime(event.created_at)} · {event.event} · {event.result ?? '—'}
                  </li>
                ))}
              </ul>
            </Section>
          ))}
          <div className="xl:col-span-2">
            <Section id="wa-ops-log" title="سجل العمليات">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b text-right text-slate-500">
                    <th className="p-2">الوقت</th><th className="p-2">الحدث</th><th className="p-2">الحساب</th><th className="p-2">النتيجة</th>
                  </tr></thead>
                  <tbody>
                    {(dash?.ops ?? []).map((op) => (
                      <tr key={op.id} className="border-b border-slate-100">
                        <td className="p-2" dir="ltr">{op.created_at}</td>
                        <td className="p-2" dir="ltr">{op.event}</td>
                        <td className="p-2" dir="ltr">{op.slot || '—'}</td>
                        <td className="p-2" dir="ltr">{op.result || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Section id="wa-session-security" title="أمان الجلسة">
            {dash?.security ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">حالة التشفير</dt><dd dir="ltr">{dash.security.encryption_status ?? 'unknown'}</dd></div>
                <div><dt className="text-slate-500">إصدار المفتاح</dt><dd dir="ltr">{dash.security.key_version ?? '—'}</dd></div>
                <div><dt className="text-slate-500">بصمة المفتاح</dt><dd dir="ltr">{dash.security.key_fingerprint ?? '—'}</dd></div>
                <div><dt className="text-slate-500">آخر نسخة احتياطية</dt><dd dir="ltr">{formatTime(
                  (dash.security.accounts as { primary?: { last_backup?: { created_at?: string } } } | undefined)?.primary?.last_backup?.created_at ?? null,
                )}</dd></div>
              </dl>
            ) : <p className="text-sm text-slate-500">معلومات الأمان غير متاحة لهذا المشغّل.</p>}
            <div className="flex flex-wrap items-end gap-3">
              <select className="rounded border border-slate-300 px-2 py-2 text-sm" value={securitySlot} onChange={(e) => setSecuritySlot(e.target.value as WhatsAppSlot)}>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
              <button type="button" disabled={busy || !canSettings} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={() => void withBusy(async () => {
                await platformWhatsAppApi.verifyStorage(securitySlot)
                await loadLegacy()
                setNotice('تم التحقق من سلامة التخزين.')
              })}>التحقق من سلامة التخزين</button>
              <button type="button" disabled={busy || !canSettings} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" onClick={() => void withBusy(async () => {
                const result = await platformWhatsAppApi.createBackup(securitySlot, 'active')
                setBackupId(result.backup_id || '')
                await loadLegacy()
                setNotice('تم إنشاء نسخة مشفرة.')
              })}>إنشاء نسخة احتياطية</button>
              <Input dir="ltr" className="max-w-xs" value={backupId} onChange={(e) => setBackupId(e.target.value)} placeholder="backup_id" />
              <button type="button" disabled={busy || !canSettings || !backupId.trim()} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={() => void withBusy(async () => {
                await platformWhatsAppApi.recoveryTest(securitySlot, backupId.trim())
                setNotice('نجح اختبار الاستعادة في بيئة معزولة.')
              })}>اختبار الاستعادة</button>
            </div>
          </Section>
          <Section id="wa-integration-settings" title="إعدادات التكامل">
            <dl className="grid gap-2 text-sm">
              <div><dt className="text-slate-500">Bridge</dt><dd>محلي 127.0.0.1:3105 · غير معروض للعامة</dd></div>
              <div><dt className="text-slate-500">المصادقة</dt><dd>HMAC من الخادم فقط · لا تصل الأسرار إلى المتصفح</dd></div>
              <div><dt className="text-slate-500">الصلاحيات</dt><dd dir="ltr">view / manage منفصلان عن صلاحيات الشركات</dd></div>
              <div><dt className="text-slate-500">تخزين QR</dt><dd>ذاكرة الواجهة فقط · لا LocalStorage ولا سجلات</dd></div>
            </dl>
            <p className="text-xs text-slate-500">{dash?.caveat ?? 'Baileys غير رسمي.'}</p>
          </Section>
        </div>
      ) : null}

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" data-testid="wa-confirm-dialog">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">تأكيد الإجراء</h3>
            <p className="text-sm text-slate-600">سيتم تنفيذ «{pending.action}» على الحساب {pending.slot}.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => setPending(null)}>إلغاء</button>
              <button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" data-testid="wa-confirm-action" onClick={confirmPending}>تأكيد</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
