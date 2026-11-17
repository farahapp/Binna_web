import { expect, test, type Page, type Route } from '@playwright/test'

/** Compatibility route: the former "واتساب المنصة" URL now renders the unified centre. */
const LEGACY_PAGE = '/platform/settings/whatsapp'
const CENTRE_PAGE = '/integrations/whatsapp'

type Slot = 'primary' | 'secondary'

function managedAccount(slot: Slot, overrides: Record<string, unknown> = {}) {
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

function overview(primary = managedAccount('primary'), secondary = managedAccount('secondary')) {
  return {
    caveat: 'Unofficial Baileys',
    summary: {
      total_accounts: 2,
      connected_accounts: 0,
      disconnected_accounts: 2,
      qr_required_accounts: 0,
      bridge_status: 'online',
      last_successful_check_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    },
    bridge: { status: 'online', error: null, instance_id: 'mock', checked_at: new Date().toISOString(), publicly_exposed: false },
    accounts: [primary, secondary],
  }
}

function legacy() {
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

async function mockUnified(page: Page, opts?: { unauthorized?: boolean }) {
  await page.addInitScript(() => { document.cookie = 'XSRF-TOKEN=csrf-test-token; path=/' })
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/platform/auth/me', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 1,
      name: opts?.unauthorized ? 'NoPerm' : 'Owner',
      email: 'owner@test',
      is_active: true,
      permissions: opts?.unauthorized ? [] : [
        'platform.integrations.whatsapp.view',
        'platform.integrations.whatsapp.manage',
        'platform.settings.whatsapp.manage',
      ],
      roles: [],
    }),
  }))
  await page.route('**/api/platform/settings/whatsapp**', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ whatsapp: legacy() }),
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        qr_data_url: `data:image/png;base64,${slot.toUpperCase()}_QR`,
        expires_at: new Date(Date.now() + 90_000).toISOString(),
      }) })
      return
    }
    if (/\/accounts\/[^/]+\/(connect|qr\/refresh|change-number|sync-identity|approve)$/.test(url) && method === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview()) })
      return
    }
    await route.fulfill({ status: 405, contentType: 'application/json', body: '{}' })
  })
}

test.describe('Platform WhatsApp dual accounts — compatibility and preserved functions', () => {
  test('old URL renders the unified centre with one sidebar entry', async ({ page }) => {
    await mockUnified(page)
    await page.goto(LEGACY_PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: /إدارة WhatsApp/ })).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'واتساب المنصة' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'مركز إدارة واتساب' })).toHaveCount(0)
  })

  test('both accounts remain independent and only masked numbers are shown', async ({ page }) => {
    await mockUnified(page)
    await page.goto(LEGACY_PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('wa-tab-accounts').click()
    await expect(page.getByTestId('wa-account-primary')).toContainText('+974***001')
    await expect(page.getByTestId('wa-account-secondary')).toContainText('+974***002')
    await expect(page.getByTestId('wa-management-page')).not.toContainText('+97451110001')
    await expect(page.getByTestId('wa-management-page')).not.toContainText('+97451110002')
  })

  test('show QR remains available on the compatibility route', async ({ page }) => {
    await mockUnified(page)
    await page.goto(LEGACY_PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('wa-tab-accounts').click()
    await page.getByTestId('wa-show-qr-primary').click()
    await expect(page.getByTestId('wa-qr-primary')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('wa-qr-secondary')).toHaveCount(0)
  })

  test('legacy change-number, settings, security and test connections are preserved', async ({ page }) => {
    await mockUnified(page)
    await page.goto(CENTRE_PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-management-page')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('wa-tab-accounts').click()
    await expect(page.getByTestId('wa-action-primary-change_number')).toBeVisible()
    await page.getByTestId('wa-tab-messages').click()
    await expect(page.getByTestId('wa-test-both')).toBeVisible()
    await expect(page.getByTestId('wa-templates')).toHaveCount(0)
    await page.getByTestId('wa-tab-templates').click()
    await expect(page.getByTestId('wa-templates')).toContainText('V2')
    await page.getByTestId('wa-tab-settings').click()
    await expect(page.getByTestId('wa-session-security')).toContainText('storage_ready')
  })

  test('unauthorized operator is gated on the compatibility route', async ({ page }) => {
    await mockUnified(page, { unauthorized: true })
    await page.goto(LEGACY_PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wa-account-primary')).toHaveCount(0)
  })
})
