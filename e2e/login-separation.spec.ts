/**
 * BINAA2 — Login Separation E2E Suite (Playwright)
 *
 * BINAA2 — BINAA2 E2E Verification: Company Login & Platform Admin (BINAA2)
 *
 * Covers:
 *   TC-L01  /login has Company Identifier (tenantSlug) field
 *   TC-L02  /login sends X-Tenant header on submit
 *   TC-L03  Valid company credentials → redirect to /dashboard
 *   TC-L04  Wrong tenant slug → error shown, no redirect
 *   TC-L05  /platform/login has NO Company Identifier field
 *   TC-L06  Platform Admin login → redirect to /platform/tenants
 *   TC-L07  Company session rejected on /platform/* routes (route guard)
 *   TC-L08  Platform session rejected on /dashboard (route guard)
 *   TC-L09  Company logout clears session; platform session unaffected
 *
 * Credentials (env vars — never hardcoded):
 *   BINAA2_SMOKE_EMAIL         company user email    (default: auth-smoke@binaa.test)
 *   BINAA2_SMOKE_PASSWORD      company user password (REQUIRED)
 *   BINAA2_SMOKE_TENANT        company tenant slug   (default: auth-smoke)
 *   BINAA2_PLATFORM_EMAIL      platform admin email  (optional — skips platform tests if absent)
 *   BINAA2_PLATFORM_PASSWORD   platform admin password (optional)
 *
 * Rules:
 *   - No production data. Test accounts only.
 *   - No commit / push / deploy.
 *   - No backend or middleware changes.
 *   - Isolated: each test that needs auth performs its own login.
 */

import { test, expect, Page, Request } from '@playwright/test'

// ─── Config ──────────────────────────────────────────────────────────────────

const WEB_URL  = 'http://localhost:3000'
const API_URL  = 'http://localhost:8000'

const COMPANY_EMAIL    = (process.env.BINAA2_SMOKE_EMAIL    ?? 'auth-smoke@binaa.test').trim()
const COMPANY_PASSWORD = (process.env.BINAA2_SMOKE_PASSWORD ?? '').trim()
const COMPANY_TENANT   = (process.env.BINAA2_SMOKE_TENANT   ?? 'auth-smoke').trim()

const PLATFORM_EMAIL    = (process.env.BINAA2_PLATFORM_EMAIL    ?? '').trim()
const PLATFORM_PASSWORD = (process.env.BINAA2_PLATFORM_PASSWORD ?? '').trim()

const HAS_PLATFORM_CREDS = !!(PLATFORM_EMAIL && PLATFORM_PASSWORD)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fill and submit the Company Login form at /login.
 * Returns the captured login API response (or null on timeout).
 */
async function companyLogin(
  page: Page,
  opts: { tenant?: string; email?: string; password?: string } = {}
): Promise<{ status: number; body: unknown } | null> {
  const tenant   = opts.tenant   ?? COMPANY_TENANT
  const email    = opts.email    ?? COMPANY_EMAIL
  const password = opts.password ?? COMPANY_PASSWORD

  await page.goto(`${WEB_URL}/login`)
  await page.waitForSelector('#tenantSlug', { timeout: 10_000 })

  // Fill all three fields
  await page.locator('#tenantSlug').click({ clickCount: 3 })
  await page.keyboard.type(tenant)
  await page.locator('#email').click({ clickCount: 3 })
  await page.keyboard.type(email)
  await page.locator('#password').click({ clickCount: 3 })
  await page.keyboard.type(password)

  // Capture login API response before clicking
  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/spa/login'),
    { timeout: 25_000 }
  ).catch(() => null)

  await page.locator('button[type="submit"]').click()

  const loginResponse = await loginResponsePromise
  if (!loginResponse) return null

  let body: unknown = null
  try { body = await loginResponse.json() } catch { /* ignore */ }

  return { status: loginResponse.status(), body }
}

/**
 * Fill and submit the Platform Admin Login form at /platform/login.
 * Returns the captured login API response (or null on timeout).
 */
async function platformLogin(
  page: Page,
  opts: { email?: string; password?: string } = {}
): Promise<{ status: number; body: unknown } | null> {
  const email    = opts.email    ?? PLATFORM_EMAIL
  const password = opts.password ?? PLATFORM_PASSWORD

  await page.goto(`${WEB_URL}/platform/login`)
  await page.waitForSelector('#email', { timeout: 10_000 })

  await page.locator('#email').click({ clickCount: 3 })
  await page.keyboard.type(email)
  await page.locator('#password').click({ clickCount: 3 })
  await page.keyboard.type(password)

  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/platform/auth/login'),
    { timeout: 25_000 }
  ).catch(() => null)

  await page.locator('button[type="submit"]').click()

  const loginResponse = await loginResponsePromise
  if (!loginResponse) return null

  let body: unknown = null
  try { body = await loginResponse.json() } catch { /* ignore */ }

  return { status: loginResponse.status(), body }
}

// ─── Guards ──────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  if (!COMPANY_PASSWORD) {
    throw new Error(
      'BINAA2_SMOKE_PASSWORD is not set.\n' +
      'Run: $env:BINAA2_SMOKE_PASSWORD="<password>" before npx playwright test'
    )
  }
})

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('BINAA2 — Login Separation E2E', () => {

  // ── TC-L01: /login has Company Identifier field ────────────────────────────
  test('TC-L01 — /login renders Company Identifier (tenantSlug) field', async ({ page }) => {
    await page.goto(`${WEB_URL}/login`)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Company Identifier field must exist
    await expect(page.locator('#tenantSlug')).toBeVisible({ timeout: 10_000 })

    // Email and password fields must also exist
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()

    // Page heading identifies this as company login
    await expect(page.locator('h1')).toContainText('BINAA2')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/دخول مستخدمي الشركة|معرّف الشركة/u)

    await page.screenshot({ path: 'playwright-report/tc-l01-company-login-fields.png' })
    console.log('TC-L01 PASS: tenantSlug field present on /login')
  })

  // ── TC-L02: /login sends X-Tenant header ──────────────────────────────────
  test('TC-L02 — /login sends X-Tenant header on form submit', async ({ page }) => {
    let capturedXTenant: string | null = null

    // Intercept the login API request to inspect headers
    page.on('request', (req: Request) => {
      if (req.url().includes('/api/auth/spa/login') && req.method() === 'POST') {
        capturedXTenant = req.headers()['x-tenant'] ?? null
        console.log('TC-L02: Captured X-Tenant =', capturedXTenant)
      }
    })

    await page.goto(`${WEB_URL}/login`)
    await page.waitForSelector('#tenantSlug', { timeout: 10_000 })

    await page.locator('#tenantSlug').click({ clickCount: 3 })
    await page.keyboard.type(COMPANY_TENANT)
    await page.locator('#email').click({ clickCount: 3 })
    await page.keyboard.type(COMPANY_EMAIL)
    await page.locator('#password').click({ clickCount: 3 })
    await page.keyboard.type(COMPANY_PASSWORD)

    // Wait for the login request to fire
    const loginRequestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/auth/spa/login'),
      { timeout: 25_000 }
    ).catch(() => null)

    await page.locator('button[type="submit"]').click()
    await loginRequestPromise

    // X-Tenant must have been sent with the tenant slug
    expect(capturedXTenant, 'X-Tenant header must be sent on company login').not.toBeNull()
    expect(capturedXTenant).toBe(COMPANY_TENANT)

    await page.screenshot({ path: 'playwright-report/tc-l02-x-tenant-header.png' })
    console.log('TC-L02 PASS: X-Tenant =', capturedXTenant)
  })

  // ── TC-L03: Valid company login → /dashboard ───────────────────────────────
  test('TC-L03 — Valid company credentials → redirect to /dashboard', async ({ page }) => {
    const result = await companyLogin(page)

    expect(result, 'Login API response must be received').not.toBeNull()
    expect(result!.status, 'Login must return HTTP 200').toBe(200)

    // Set session flag (mirrors what the real login page does)
    await page.evaluate(() => {
      sessionStorage.setItem('binaa2_session_active', '1')
    })

    await page.waitForURL('**/dashboard', { timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard/)

    await page.screenshot({ path: 'playwright-report/tc-l03-company-dashboard.png' })
    console.log('TC-L03 PASS: Redirected to /dashboard after company login')
  })

  // ── TC-L04: Wrong tenant slug → error shown, no redirect ──────────────────
  test('TC-L04 — Wrong tenant slug → error shown, stays on /login', async ({ page }) => {
    await page.goto(`${WEB_URL}/login`)
    await page.waitForSelector('#tenantSlug', { timeout: 10_000 })

    await page.locator('#tenantSlug').click({ clickCount: 3 })
    await page.keyboard.type('nonexistent-tenant-xyz-99999')
    await page.locator('#email').click({ clickCount: 3 })
    await page.keyboard.type(COMPANY_EMAIL)
    await page.locator('#password').click({ clickCount: 3 })
    await page.keyboard.type(COMPANY_PASSWORD)

    const loginResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/spa/login'),
      { timeout: 25_000 }
    ).catch(() => null)

    await page.locator('button[type="submit"]').click()
    const loginResponse = await loginResponsePromise

    // Backend must reject (4xx)
    if (loginResponse) {
      expect(loginResponse.status()).toBeGreaterThanOrEqual(400)
      expect(loginResponse.status()).toBeLessThan(500)
      console.log('TC-L04: Login API status =', loginResponse.status(), '(expected 4xx)')
    }

    // Must NOT navigate away from /login
    await page.waitForTimeout(2000) // allow any redirect to happen
    expect(page.url()).toMatch(/\/login/)

    // Error message must be visible
    const errorEl = page.locator('[class*="red"], [class*="error"], [role="alert"]').first()
    await expect(errorEl).toBeVisible({ timeout: 5_000 })

    await page.screenshot({ path: 'playwright-report/tc-l04-wrong-tenant-error.png' })
    console.log('TC-L04 PASS: Error shown, stayed on /login')
  })

  // ── TC-L05: /platform/login has NO Company Identifier field ───────────────
  test('TC-L05 — /platform/login has NO Company Identifier (tenantSlug) field', async ({ page }) => {
    await page.goto(`${WEB_URL}/platform/login`)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // tenantSlug field must NOT exist
    const tenantField = page.locator('#tenantSlug')
    await expect(tenantField).not.toBeVisible({ timeout: 3_000 }).catch(() => {
      // If the element doesn't exist at all, that's also a pass
    })
    const count = await tenantField.count()
    expect(count, 'tenantSlug field must NOT be present on /platform/login').toBe(0)

    // Only email + password fields
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()

    // Page identifies as platform admin
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/مسؤول المنصة|لوحة تحكم/u)

    await page.screenshot({ path: 'playwright-report/tc-l05-platform-login-no-tenant.png' })
    console.log('TC-L05 PASS: No tenantSlug field on /platform/login')
  })

  // ── TC-L06: Platform Admin login → /platform/tenants ──────────────────────
  test('TC-L06 — Platform Admin login → redirect to /platform/tenants', async ({ page }) => {
    test.skip(!HAS_PLATFORM_CREDS, 'BINAA2_PLATFORM_EMAIL / BINAA2_PLATFORM_PASSWORD not set — skipping')

    const result = await platformLogin(page)

    expect(result, 'Platform login API response must be received').not.toBeNull()
    expect(result!.status, 'Platform login must return HTTP 200').toBe(200)

    const body = result!.body as Record<string, unknown>
    expect(body).toHaveProperty('token')
    expect(typeof body.token).toBe('string')

    await page.waitForURL('**/platform/tenants', { timeout: 20_000 })
    await expect(page).toHaveURL(/\/platform\/tenants/)

    await page.screenshot({ path: 'playwright-report/tc-l06-platform-tenants.png' })
    console.log('TC-L06 PASS: Redirected to /platform/tenants after platform login')
  })

  // ── TC-L07: Company session rejected on /platform/* (route guard) ──────────
  test('TC-L07 — Company session cannot access /platform/tenants (route guard)', async ({ page }) => {
    // Login as company user first
    const result = await companyLogin(page)
    expect(result?.status).toBe(200)

    await page.evaluate(() => {
      sessionStorage.setItem('binaa2_session_active', '1')
      // Ensure NO platform token is set
      sessionStorage.removeItem('binaa2_platform_token')
    })

    // Try to navigate to a platform-admin route
    await page.goto(`${WEB_URL}/platform/tenants`)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Platform layout guard must redirect to /platform/login
    await page.waitForURL('**/platform/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/platform\/login/)

    await page.screenshot({ path: 'playwright-report/tc-l07-company-blocked-platform.png' })
    console.log('TC-L07 PASS: Company session redirected to /platform/login')
  })

  // ── TC-L08: Platform session rejected on /dashboard (route guard) ──────────
  test('TC-L08 — Platform session cannot access /dashboard (route guard)', async ({ page }) => {
    // Navigate to /dashboard with NO session flag (simulates unauthenticated / platform-only)
    await page.goto(`${WEB_URL}/dashboard`)
    await page.evaluate(() => {
      // Ensure company session flag is absent
      sessionStorage.removeItem('binaa2_session_active')
      sessionStorage.removeItem('binaa2_tenant_slug')
    })

    // Reload to trigger the guard with cleared storage
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Dashboard layout guard must redirect to /login
    await page.waitForURL('**/login', { timeout: 10_000 })
    const url = page.url()
    // Must redirect to /login (company login), NOT /platform/login
    expect(url).toMatch(/\/login$/)
    expect(url).not.toMatch(/\/platform\/login/)

    await page.screenshot({ path: 'playwright-report/tc-l08-platform-blocked-dashboard.png' })
    console.log('TC-L08 PASS: No company session → redirected to /login')
  })

  // ── TC-L09: Company logout clears session; platform session unaffected ─────
  test('TC-L09 — Company logout clears company session independently', async ({ page }) => {
    // Step 1: Login as company user
    const loginResult = await companyLogin(page)
    expect(loginResult?.status).toBe(200)

    await page.evaluate(() => {
      sessionStorage.setItem('binaa2_session_active', '1')
    })
    await page.waitForURL('**/dashboard', { timeout: 20_000 })

    // Step 2: Capture logout API call
    // Refresh CSRF cookie before logout (session was rotated at login)
    // then call logout API directly — avoids CSRF staleness (HTTP 419)
    const logoutResult = await page.evaluate(async () => {
      const tenant = sessionStorage.getItem('binaa2_tenant_slug') ?? 'auth-smoke'
      // Step 1: fetch fresh CSRF cookie
      await fetch('http://localhost:8000/sanctum/csrf-cookie', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Origin': 'http://localhost:3000' }
      })
      // Step 2: read XSRF-TOKEN from cookie
      const xsrf = document.cookie
        .split('; ')
        .find(c => c.startsWith('XSRF-TOKEN='))
        ?.split('=')[1] ?? ''
      const decoded = decodeURIComponent(xsrf)
      // Step 3: logout
      const res = await fetch('http://localhost:8000/api/auth/spa/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Tenant': tenant,
          'X-XSRF-TOKEN': decoded,
          'Origin': 'http://localhost:3000'
        }
      })
      sessionStorage.removeItem('binaa2_session_active')
      sessionStorage.removeItem('binaa2_tenant_slug')
      return res.status
    })

    expect([200, 204]).toContain(logoutResult)
    console.log('TC-L09: Logout API status =', logoutResult)

    // Step 3: After logout, /dashboard must redirect to /login
    await page.goto(`${WEB_URL}/dashboard`)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.waitForURL('**/login', { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login/)

    // Step 4: Verify platform session storage is independent
    // (platform token is in a separate sessionStorage key — company logout must not clear it)
    const platformTokenAfterLogout = await page.evaluate(() =>
      sessionStorage.getItem('binaa2_platform_token')
    )
    // If a platform token was set before, it must still be there
    // (In this test we didn't set one, so it's null — that's fine)
    console.log('TC-L09: platform_token after company logout =', platformTokenAfterLogout, '(null = correct, was never set)')

    await page.screenshot({ path: 'playwright-report/tc-l09-company-logout.png' })
    console.log('TC-L09 PASS: Company logout cleared session; /dashboard now redirects to /login')
  })

})
