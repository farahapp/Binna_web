import { expect, test, type Page, type Route } from '@playwright/test'

const PAGE = '/integrations/whatsapp'
const LEGACY_PAGE = '/platform/settings/whatsapp'

type Slot = 'primary' | 'secondary'
type Counters = {
  connect: number
  refreshQr: number
  disconnect: number
  cancel: number
  changeNumber: number
}

function account(slot: Slot, overrides: Record<string, unknown> = {}) {
  return {
    slot,
    account_id: `binaa-wa-${slot}`,
    label: slot === 'primary' ? 'WhatsApp Account 1 — primary' : 'WhatsApp Account 2 — secondary',
    purpose: slot === 'primary' ? 'Primary transactional sender' : 'Secondary / failover sender',
    phone_masked: slot === 'primary' ? '+974***001' : '+974***002',
    connection_state: 'disconnected',
    bridge_session_status: 'disconnected',
    session_state: 'not_authenticated',
    recovery_state: 'idle',
    last_connected_at: null,
    last_disconnected_at: null,
    last_status_check_at: new Date().toISOString(),
    last_heartbeat_at: null,
    heartbeat_age_seconds: null,
    disconnect_duration_seconds: null,
    disconnect_reason: null,
    reconnect_attempt: 0,
    has_qr: false,
    qr_expires_at: null,
    send_ready: false,
    alerts: ['account_disconnected'],
    actions: {
      refresh_status: true,
      connect: true,
      generate_qr: true,
      refresh_qr: false,
      reconnect: true,
      cancel_pairing: false,
      disconnect: false,
      change_number: true,
    },
    ...overrides,
  }
}

function buildOverview(primary: ReturnType<typeof account>, secondary: ReturnType<typeof account>) {
  return {
    caveat: 'Unofficial Baileys',
    summary: {
      total_accounts: 2,
      connected_accounts: [primary, secondary].filter((a) => a.connection_state === 'connected').length,
      disconnected_accounts: [primary, secondary].filter((a) => a.connection_state === 'disconnected').length,
      qr_required_accounts: [primary, secondary].filter((a) => a.connection_state === 'qr_pending').length,
      bridge_status: 'online',
      last_successful_check_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    },
    bridge: {
      status: 'online',
      error: null,
      instance_id: 'mock-instance',
      checked_at: new Date().toISOString(),
      publicly_exposed: false,
    },
    accounts: [primary, secondary],
  }
}

function legacyDashboard() {
  return {
    caveat: 'Unofficial Baileys',
    bridge: { health: { ok: true }, error: null },
    security: {
      encryption_status: 'storage_ready',
      key_version: '1',
      key_fingerprint: 'mockfp',
      key_source: 'fake',
      accounts: { primary: { last_backup: null, backup_count: 0 }, secondary: { last_backup: null, backup_count: 0 } },
    },
    settings: {
      otp_enabled: false,
      notifications_enabled: false,
      failover_enabled: false,
      email_fallback_enabled: true,
      primary_enabled: false,
      secondary_enabled: false,
      primary_priority: 1,
      secondary_priority: 2,
    },
    accounts: {
      primary: { slot: 'primary', lifecycle_state: 'disconnected', has_session_backup: false },
      secondary: { slot: 'secondary', lifecycle_state: 'disconnected', has_session_backup: false },
    },
    ops: [],
  }
}

async function mockApi(
  page: Page,
  options: { authorized?: boolean; delayedQr?: number; expireImmediately?: boolean } = {},
): Promise<Counters> {
  const authorized = options.authorized !== false
  const delayedQr = options.delayedQr ?? 0
  const counts: Counters = { connect: 0, refreshQr: 0, disconnect: 0, cancel: 0, changeNumber: 0 }
  let qrMisses = 0

  await page.addInitScript(() => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token; path=/'
  })
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/platform/auth/me', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 1,
      name: authorized ? 'Owner' : 'Viewer',
      email: 'owner@test',
      is_active: true,
      permissions: authorized
        ? [
            'platform.integrations.whatsapp.view',
            'platform.integrations.whatsapp.manage',
            'platform.settings.whatsapp.manage',
          ]
        : [],
      roles: [],
    }),
  }))

  let state = buildOverview(account('primary'), account('secondary'))
  let qrPrimary: string | null = null
  let qrSecondary: string | null = null

  await page.route('**/api/platform/settings/whatsapp**', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ whatsapp: legacyDashboard() }),
  }))

  await page.route('**/api/platform/integrations/whatsapp**', async (route: Route) => {
    const url = route.request().url()
    const method = route.request().method()
    const slot: Slot = url.includes('/primary/') ? 'primary' : 'secondary'

    if (/\/accounts\/[^/]+\/events$/.test(url)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ events: [] }) })
      return
    }
    if (/\/accounts\/[^/]+\/qr$/.test(url) && method === 'GET') {
      const value = slot === 'primary' ? qrPrimary : qrSecondary
      if (!value || (slot === 'primary' && qrMisses < delayedQr)) {
        qrMisses += 1
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'QR unavailable.' }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        qr_data_url: value,
        expires_at: new Date(Date.now() + (options.expireImmediately && counts.refreshQr === 0 ? -1_000 : 90_000)).toISOString(),
      }) })
      return
    }
    if (/\/accounts\/[^/]+\/connect$/.test(url) && method === 'POST') {
      counts.connect += 1
      state = buildOverview(...(state.accounts.map((a) => a.slot === slot
        ? account(a.slot, { connection_state: 'qr_pending', has_qr: true, alerts: ['qr_required'] })
        : account(a.slot, a)) as [ReturnType<typeof account>, ReturnType<typeof account>]))
      if (slot === 'primary') qrPrimary = 'data:image/png;base64,PRIMARY_QR'
      else qrSecondary = 'data:image/png;base64,SECONDARY_QR'
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (/\/accounts\/[^/]+\/qr\/refresh$/.test(url) && method === 'POST') {
      counts.refreshQr += 1
      state = buildOverview(...(state.accounts.map((a) => a.slot === slot
        ? account(a.slot, { connection_state: 'qr_pending', has_qr: true, alerts: ['qr_required'] })
        : account(a.slot, a)) as [ReturnType<typeof account>, ReturnType<typeof account>]))
      if (slot === 'primary') qrPrimary = 'data:image/png;base64,PRIMARY_QR_NEW'
      else qrSecondary = 'data:image/png;base64,SECONDARY_QR_NEW'
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (/\/accounts\/[^/]+\/change-number$/.test(url) && method === 'POST') {
      counts.changeNumber += 1
      state = buildOverview(...(state.accounts.map((a) => a.slot === slot
        ? account(a.slot, { connection_state: 'qr_pending', has_qr: false, alerts: ['qr_required'] })
        : account(a.slot, a)) as [ReturnType<typeof account>, ReturnType<typeof account>]))
      if (slot === 'primary') qrPrimary = 'data:image/png;base64,PRIMARY_QR_REPLACE'
      else qrSecondary = 'data:image/png;base64,SECONDARY_QR_REPLACE'
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (/\/accounts\/[^/]+\/sync-identity$/.test(url) && method === 'POST') {
      state = buildOverview(...(state.accounts.map((a) => a.slot === slot
        ? account(a.slot, { connection_state: 'connected', has_qr: false, alerts: [] })
        : account(a.slot, a)) as [ReturnType<typeof account>, ReturnType<typeof account>]))
      if (slot === 'primary') qrPrimary = null
      else qrSecondary = null
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (/\/accounts\/[^/]+\/disconnect$/.test(url) && method === 'POST') {
      counts.disconnect += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (/\/accounts\/[^/]+\/cancel-pairing$/.test(url) && method === 'POST') {
      counts.cancel += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) })
      return
    }
    await route.fulfill({ status: 405, contentType: 'application/json', body: '{}' })
  })

  return counts
}

async function openAccounts(page: Page) {
  await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('wa-tab-accounts').click()
  await expect(page.getByTestId('wa-account-primary')).toBeVisible()
}

test.describe('Platform WhatsApp Management Centre (mocked)', () => {
  test('sidebar has exactly one WhatsApp entry with the unified label', async ({ page }) => {
    await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: /إدارة WhatsApp/ })).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'واتساب المنصة' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'مركز إدارة واتساب' })).toHaveCount(0)
  })

  test('legacy path remains a compatibility route to the unified centre', async ({ page }) => {
    await mockApi(page)
    await page.goto(LEGACY_PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('wa-tab-settings')).toBeVisible()
    await expect(page.getByRole('link', { name: /إدارة WhatsApp/ })).toHaveCount(1)
  })

  test('QR is hidden by default and after a browser refresh', async ({ page }) => {
    await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await expect(page.getByTestId('wa-qr-primary')).toHaveCount(0)
    await expect(page.getByTestId('wa-qr-secondary')).toHaveCount(0)
    await expect(page.getByTestId('wa-qr-placeholder-primary')).toContainText('رمز الربط مخفي')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await expect(page.getByTestId('wa-qr-primary')).toHaveCount(0)
  })

  test('shows QR only for the requested account and reuses a valid QR', async ({ page }) => {
    const counts = await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('wa-qr-primary')).toHaveAttribute('src', /PRIMARY_QR/)
    await expect(page.getByTestId('wa-qr-secondary')).toHaveCount(0)
    expect(counts.connect).toBe(1)

    await page.getByTestId('wa-hide-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toHaveCount(0)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible({ timeout: 10_000 })
    expect(counts.connect).toBe(1)
    expect(counts.disconnect).toBe(0)
    expect(counts.cancel).toBe(0)
  })

  test('waits for a QR emitted asynchronously by the bridge', async ({ page }) => {
    await mockApi(page, { delayedQr: 3 })
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('wa-qr-secondary')).toHaveCount(0)
  })

  test('switching tabs clears QR from view but does not disconnect', async ({ page }) => {
    const counts = await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible()
    await page.getByTestId('wa-tab-monitoring').click()
    await page.getByTestId('wa-tab-accounts').click()
    await expect(page.getByTestId('wa-qr-primary')).toHaveCount(0)
    expect(counts.disconnect).toBe(0)
    expect(counts.cancel).toBe(0)
  })

  test('expired QR is hidden and offers explicit regeneration only', async ({ page }) => {
    const counts = await mockApi(page, { expireImmediately: true })
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-expired-primary')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('wa-qr-primary')).toHaveCount(0)
    await expect(page.getByTestId('wa-new-qr-primary')).toBeVisible()
    // The first show intentionally created a QR; expiry must not auto-create another one.
    expect(counts.connect).toBe(1)
    await page.getByTestId('wa-new-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible({ timeout: 10_000 })
    expect(counts.refreshQr).toBe(1)
    expect(counts.connect).toBe(1)
  })

  test('successful link hides QR and shows only a masked number', async ({ page }) => {
    await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible()
    await page.getByTestId('wa-action-primary-sync_identity').click()
    await expect(page.getByTestId('wa-state-primary')).toHaveAttribute('data-state', 'connected', { timeout: 10_000 })
    await expect(page.getByTestId('wa-qr-primary')).toHaveCount(0)
    await expect(page.getByTestId('wa-details-primary')).toContainText('+974***001')
    await expect(page.getByTestId('wa-account-primary')).not.toContainText('+97451110001')
  })

  test('change number requires confirmation and preserves the other account', async ({ page }) => {
    const counts = await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await page.getByTestId('wa-action-primary-change_number').click()
    await expect(page.getByTestId('wa-confirm-dialog')).toBeVisible()
    await page.getByTestId('wa-confirm-action').click()
    await expect(page.getByTestId('wa-confirm-dialog')).toHaveCount(0)
    expect(counts.changeNumber).toBe(1)
    await expect(page.getByTestId('wa-account-secondary')).toContainText('disconnected')
  })

  test('disconnect requires explicit confirmation', async ({ page }) => {
    const counts = await mockApi(page)
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await openAccounts(page)
    await expect(page.getByTestId('wa-action-primary-disconnect')).toHaveCount(0)
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible()
    // Reconnect the mock to a connected state with disconnect available.
    await page.route('**/api/platform/integrations/whatsapp', (route: Route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildOverview(
        account('primary', { connection_state: 'connected', has_qr: false, alerts: [], actions: {
          refresh_status: true, connect: false, generate_qr: false, refresh_qr: false, reconnect: false,
          cancel_pairing: false, disconnect: true, change_number: true,
        } }),
        account('secondary'),
      )),
    }))
    await page.getByTestId('wa-refresh-all').click()
    await expect(page.getByTestId('wa-action-primary-disconnect')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('wa-action-primary-disconnect').click()
    await expect(page.getByTestId('wa-confirm-dialog')).toBeVisible()
    await page.getByTestId('wa-confirm-dialog').getByRole('button', { name: 'إلغاء' }).click()
    await expect(page.getByTestId('wa-confirm-dialog')).toHaveCount(0)
    expect(counts.disconnect).toBe(0)
  })

  test('unauthorized operator cannot view the management page', async ({ page }) => {
    await mockApi(page, { authorized: false })
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-account-primary')).toHaveCount(0)
  })
})
