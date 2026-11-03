import { test, expect, type Page } from '@playwright/test'

const BASE      = 'http://localhost:3001'
const API_BASE  = 'http://localhost:8000'
const EMAIL     = 'platform-smoke@binaa.test'
const PASSWORD  = 'Sndxqm7BQmKIlLuDlXzHoMct'
const TENANT_ID = 32

/**
 * Proxy all /api/* requests through page.route so they go via Node.js
 * (which has no CORS restriction) instead of the browser (which is blocked
 * because the test server runs on :3001 but the backend only allows :3000).
 */
async function setupApiProxy(page: Page) {
  // Intercept requests going directly to the backend (localhost:8000)
  // and proxy them through page.request (Node.js — no CORS restriction).
  await page.route('http://localhost:8000/api/**', async (route) => {
    const req = route.request()
    try {
      const response = await page.request.fetch(req.url(), {
        method: req.method(),
        headers: { ...req.headers(), Origin: 'http://localhost:3000' },
        data: req.postDataBuffer() ?? undefined,
      })
      await route.fulfill({
        status: response.status(),
        headers: { 'content-type': 'application/json' },
        body: await response.body(),
      })
    } catch {
      await route.abort()
    }
  })
}

async function loginPlatform(page: Page) {
  // Proxy all API calls through Node.js to bypass browser CORS
  await setupApiProxy(page)

  // Obtain token via Node.js (no CORS)
  const res = await page.request.post(API_BASE + '/api/platform/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  const { token } = await res.json()

  // Inject token into sessionStorage
  await page.goto(BASE + '/platform/login')
  await page.evaluate((t: string) => {
    sessionStorage.setItem('binaa2_platform_token', t)
  }, token)

  // Navigate to tenants — layout guard calls /me which is now proxied
  await page.goto(BASE + '/platform/tenants')
  await page.waitForSelector('text=المستأجرون', { timeout: 20000 })
}

async function ensureActive(page: Page) {
  // Restore tenant to active via direct API call using page.request (inherits cookies/context)
  const loginRes = await page.request.post(API_BASE + '/api/platform/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  const { token } = await loginRes.json()
  await page.request.patch(API_BASE + '/api/platform/tenants/' + TENANT_ID + '/activate', {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  })
}

async function ensureSuspended(page: Page) {
  const loginRes = await page.request.post(API_BASE + '/api/platform/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  const { token } = await loginRes.json()
  await page.request.patch(API_BASE + '/api/platform/tenants/' + TENANT_ID + '/suspend', {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  })
}

test.describe('Platform Admin — Cancel Confirm Dialog (no PATCH sent)', () => {

  test.beforeEach(async ({ page }) => {
    await loginPlatform(page)
  })

  // ─── TC-Cancel-01: Cancel Suspend ────────────────────────────────────────────
  test('TC-Cancel-01: Cancel Suspend dialog — no PATCH /suspend sent', async ({ page }) => {
    await ensureActive(page)
    await page.goto(BASE + '/platform/tenants/' + TENANT_ID)
    await page.waitForSelector('text=SESSION 29 E2E Test Tenant', { timeout: 15000 })

    const patchUrls: string[] = []
    page.on('request', req => {
      if (req.method() === 'PATCH') patchUrls.push(req.url())
    })

    // Open Suspend confirm dialog
    await page.click('button:has-text("إيقاف المستأجر")')
    await page.waitForSelector('text=تأكيد إيقاف المستأجر', { timeout: 5000 })

    // Press Cancel
    await page.click('button:has-text("إلغاء")')

    // Dialog must close
    await expect(page.locator('text=تأكيد إيقاف المستأجر')).not.toBeVisible({ timeout: 3000 })

    // Wait 1 s to catch any delayed request
    await page.waitForTimeout(1000)

    const suspendPatches = patchUrls.filter(u => u.includes('/suspend'))
    console.log('[TC-Cancel-01] PATCH requests:', JSON.stringify(patchUrls))
    expect(suspendPatches.length, 'No PATCH /suspend should fire on Cancel').toBe(0)

    // Status badge still shows active
    await expect(page.locator('text=نشط').first()).toBeVisible()
  })

  // ─── TC-Cancel-02: Cancel Activate ───────────────────────────────────────────
  test('TC-Cancel-02: Cancel Activate dialog — no PATCH /activate sent', async ({ page }) => {
    await ensureSuspended(page)
    await page.goto(BASE + '/platform/tenants/' + TENANT_ID)
    await page.waitForSelector('text=SESSION 29 E2E Test Tenant', { timeout: 15000 })

    const patchUrls: string[] = []
    page.on('request', req => {
      if (req.method() === 'PATCH') patchUrls.push(req.url())
    })

    // Open Activate confirm dialog
    await page.click('button:has-text("تفعيل المستأجر")')
    await page.waitForSelector('text=تأكيد تفعيل المستأجر', { timeout: 5000 })

    // Press Cancel
    await page.click('button:has-text("إلغاء")')

    // Dialog must close
    await expect(page.locator('text=تأكيد تفعيل المستأجر')).not.toBeVisible({ timeout: 3000 })

    await page.waitForTimeout(1000)

    const activatePatches = patchUrls.filter(u => u.includes('/activate'))
    console.log('[TC-Cancel-02] PATCH requests:', JSON.stringify(patchUrls))
    expect(activatePatches.length, 'No PATCH /activate should fire on Cancel').toBe(0)

    // Status badge still shows suspended
    await expect(page.locator('text=موقوف').first()).toBeVisible()

    // Restore
    await ensureActive(page)
  })

  // ─── TC-Cancel-03: After Cancel, dialog reopens and action completes ─────────
  test('TC-Cancel-03: After Cancel, dialog reopens and Suspend completes (1 PATCH only)', async ({ page }) => {
    await ensureActive(page)
    await page.goto(BASE + '/platform/tenants/' + TENANT_ID)
    await page.waitForSelector('text=SESSION 29 E2E Test Tenant', { timeout: 15000 })

    const patchUrls: string[] = []
    page.on('request', req => {
      if (req.method() === 'PATCH') patchUrls.push(req.url())
    })

    // Open → Cancel
    await page.click('button:has-text("إيقاف المستأجر")')
    await page.waitForSelector('text=تأكيد إيقاف المستأجر', { timeout: 5000 })
    await page.click('button:has-text("إلغاء")')
    await expect(page.locator('text=تأكيد إيقاف المستأجر')).not.toBeVisible({ timeout: 3000 })

    // No PATCH yet
    expect(patchUrls.filter(u => u.includes('/suspend')).length).toBe(0)

    // Reopen → Confirm
    await page.click('button:has-text("إيقاف المستأجر")')
    await page.waitForSelector('text=تأكيد إيقاف المستأجر', { timeout: 5000 })
    await page.click('button:has-text("نعم، إيقاف")')

    // Wait for success feedback
    await page.waitForSelector('text=suspended', { timeout: 10000 })

    const suspendPatches = patchUrls.filter(u => u.includes('/suspend'))
    console.log('[TC-Cancel-03] PATCH /suspend count:', suspendPatches.length)
    expect(suspendPatches.length, 'Exactly 1 PATCH /suspend after Confirm').toBe(1)

    // Restore
    await ensureActive(page)
  })

})
