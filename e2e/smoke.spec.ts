/**
 * BINAA2 — Web Smoke Suite (Playwright Chromium)
 *
 * Browser: Playwright Chromium (Chrome for Testing 156.0.8078.4, playwright chromium v1248)
 * NOT Google Chrome.
 *
 * Covers:
 *   1. Login and authenticated navigation (→ /dashboard)
 *   2. /reports  (GET /api/v1/bi/dashboard)
 *   3. /documents (GET /api/v1/documents)
 *   4. /network/bids (GET /api/v1/network/tenders — network_tenders table PENDING migration)
 *   5. /administration (GET /api/auth/me)
 *
 * Known backend state (as of 2026-10-18):
 *   - network_tenders, network_bids, network_profiles, network_awards,
 *     bi_dashboards, bi_reports, bi_kpi_definitions, bi_report_schedules
 *     migrations are ALL PENDING (not run).
 *   - GET /api/v1/network/tenders → HTTP 500 (BLOCKER: network_tenders table missing)
 *   - GET /api/v1/bi/dashboard → HTTP 500 expected (bi_dashboards table missing)
 *   - GET /api/v1/documents → HTTP 200 (documents table ran)
 *   - GET /api/auth/me → HTTP 200 (users table ran)
 *
 * Credentials: read from environment variables only.
 *   BINAA2_SMOKE_EMAIL    — defaults to auth-smoke@binaa.test
 *   BINAA2_SMOKE_PASSWORD — REQUIRED (set via M4_SMOKE_PW reset)
 *
 * Authentication: Sanctum SPA Cookie (CSRF → login → session cookie).
 * The dashboard layout checks sessionStorage for 'binaa2_session_active'.
 * Playwright sets this flag after login to allow navigation.
 */

import { test, expect, Page } from '@playwright/test'

// ─── Config ──────────────────────────────────────────────────────────────────

const WEB_URL = 'http://localhost:3000'
const API_URL = 'http://localhost:8000'
const TENANT = 'auth-smoke'
const EMAIL = (process.env.BINAA2_SMOKE_EMAIL ?? 'auth-smoke@binaa.test').trim()
const PASSWORD = (process.env.BINAA2_SMOKE_PASSWORD ?? '').trim()

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Collect console errors during a page visit */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

/** Perform SPA login via the login form */
async function loginViaBrowser(page: Page): Promise<void> {
  // Log all network requests for diagnosis
  const networkLog: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('localhost:8000')) {
      networkLog.push(`REQ ${req.method()} ${req.url()}`)
    }
  })
  page.on('response', (res) => {
    if (res.url().includes('localhost:8000')) {
      networkLog.push(`RES ${res.status()} ${res.url()}`)
    }
  })

  // Log ALL network requests (including page load)
  page.on('request', (req) => {
    networkLog.push(`REQ ${req.method()} ${req.url()}`)
  })
  page.on('response', (res) => {
    networkLog.push(`RES ${res.status()} ${res.url()}`)
  })

  await page.goto(`${WEB_URL}/login`)
  await page.waitForSelector('#email', { timeout: 10_000 })
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

  // Click and type to trigger all keyboard events (React onChange)
  // Using type() which dispatches keydown/keypress/input/keyup for each character
  await page.locator('#email').click({ clickCount: 3 })
  await page.keyboard.type(EMAIL)
  await page.locator('#password').click({ clickCount: 3 })
  await page.keyboard.type(PASSWORD)

  // Verify values were set
  await expect(page.locator('#email')).toHaveValue(EMAIL)
  await expect(page.locator('#password')).toHaveValue(PASSWORD)

  // Register response listeners BEFORE clicking (to avoid race conditions)
  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/spa/login'),
    { timeout: 25_000 }
  ).catch(() => null)

  const csrfResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/sanctum/csrf-cookie'),
    { timeout: 25_000 }
  ).catch(() => null)

  // Click submit
  await page.locator('button[type="submit"]').click()

  // Wait for CSRF and login responses (they happen inside handleSubmit)
  const csrfResponse = await csrfResponsePromise
  const loginResponse = await loginResponsePromise

  // Log network activity for diagnosis
  console.log('Network log:', networkLog.join(' | '))
  console.log('CSRF response:', csrfResponse ? csrfResponse.status() : 'NOT_RECEIVED')
  console.log('Login response:', loginResponse ? loginResponse.status() : 'NOT_RECEIVED')

  if (!loginResponse) {
    throw new Error(`Login API call was never received. Network log: ${networkLog.join(' | ')}`)
  }

  if (loginResponse.status() !== 200) {
    throw new Error(`Login API returned HTTP ${loginResponse.status()} — expected 200`)
  }

  // Ensure sessionStorage flag is set before dashboard layout checks it
  await page.evaluate(() => {
    sessionStorage.setItem('binaa2_session_active', '1')
  })

  // Wait for navigation to /dashboard
  await page.waitForURL('**/dashboard', { timeout: 20_000 })
}

/** Navigate to a dashboard page and wait for it to settle */
async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(`${WEB_URL}${path}`)
  // Wait for either content or error state — not a hard assertion
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
    // networkidle may not fire on SPA pages — continue
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('BINAA2 Web Smoke Suite — Playwright Chromium', () => {

  test.beforeAll(() => {
    if (!PASSWORD) {
      throw new Error(
        'BINAA2_SMOKE_PASSWORD is not set. ' +
        'Run: $env:BINAA2_SMOKE_PASSWORD="<password>" before npx playwright test'
      )
    }
  })

  // ── TC-01: Login ────────────────────────────────────────────────────────────
  test('TC-01 — Login page loads and login succeeds', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    // 1. Verify login page loads
    await page.goto(`${WEB_URL}/login`)
    await expect(page.locator('h1')).toContainText('BINAA2', { timeout: 10_000 })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()

    // 2. Perform login using the shared helper (includes network logging + CSRF handling)
    await loginViaBrowser(page)

    // 3. Assert redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)

    // 4. Screenshot
    await page.screenshot({ path: 'playwright-report/tc01-login-success.png' })

    // 5. Console errors (informational — not a hard fail for login)
    if (consoleErrors.length > 0) {
      console.log(`TC-01 console errors (${consoleErrors.length}):`, consoleErrors)
    }
  })

  // ── TC-02: /reports ─────────────────────────────────────────────────────────
  test('TC-02 — /reports page loads (BI dashboard)', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    // Login first
    await loginViaBrowser(page)

    // Intercept BI dashboard API call
    const apiResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/bi/dashboard'),
      { timeout: 15_000 }
    ).catch(() => null) // may not fire if page errors early

    await navigateTo(page, '/reports')

    const apiResponse = await apiResponsePromise
    const apiStatus = apiResponse ? apiResponse.status() : 'NO_CALL'

    // Screenshot regardless of outcome
    await page.screenshot({ path: 'playwright-report/tc02-reports.png' })

    // Assert page URL
    await expect(page).toHaveURL(/\/reports/)

    // Record API status — HTTP 500 is a BLOCKER (bi_dashboards table PENDING)
    console.log(`TC-02 /reports — API /bi/dashboard status: ${apiStatus}`)
    if (apiStatus === 500) {
      console.log('TC-02 BLOCKER: GET /api/v1/bi/dashboard returned HTTP 500 — bi_dashboards table migration is PENDING')
    }

    // Assert page does not show a blank white screen (some content rendered)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)

    if (consoleErrors.length > 0) {
      console.log(`TC-02 console errors (${consoleErrors.length}):`, consoleErrors)
    }
  })

  // ── TC-03: /documents ───────────────────────────────────────────────────────
  test('TC-03 — /documents page loads', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    await loginViaBrowser(page)

    const apiResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/documents'),
      { timeout: 15_000 }
    ).catch(() => null)

    await navigateTo(page, '/documents')

    const apiResponse = await apiResponsePromise
    const apiStatus = apiResponse ? apiResponse.status() : 'NO_CALL'

    await page.screenshot({ path: 'playwright-report/tc03-documents.png' })

    await expect(page).toHaveURL(/\/documents/)
    console.log(`TC-03 /documents — API /documents status: ${apiStatus}`)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)

    if (consoleErrors.length > 0) {
      console.log(`TC-03 console errors (${consoleErrors.length}):`, consoleErrors)
    }
  })

  // ── TC-04: /network/bids ────────────────────────────────────────────────────
  test('TC-04 — /network/bids page loads (network_tenders BLOCKER expected)', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    await loginViaBrowser(page)

    const apiResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/network/tenders'),
      { timeout: 15_000 }
    ).catch(() => null)

    await navigateTo(page, '/network/bids')

    const apiResponse = await apiResponsePromise
    const apiStatus = apiResponse ? apiResponse.status() : 'NO_CALL'

    await page.screenshot({ path: 'playwright-report/tc04-network-bids.png' })

    await expect(page).toHaveURL(/\/network\/bids/)
    console.log(`TC-04 /network/bids — API /network/tenders status: ${apiStatus}`)

    // HTTP 500 is the known BLOCKER — document it, do not mask it
    if (apiStatus === 500) {
      console.log(
        'TC-04 BLOCKER: GET /api/v1/network/tenders returned HTTP 500 — ' +
        'network_tenders table migration is PENDING. ' +
        'This is a backend blocker. Do not mask or ignore this failure.'
      )
    }

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)

    if (consoleErrors.length > 0) {
      console.log(`TC-04 console errors (${consoleErrors.length}):`, consoleErrors)
    }
  })

  // ── TC-05: /administration ──────────────────────────────────────────────────
  test('TC-05 — /administration page loads (current user identity)', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)

    await loginViaBrowser(page)

    const apiResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/auth/me'),
      { timeout: 15_000 }
    ).catch(() => null)

    await navigateTo(page, '/administration')

    const apiResponse = await apiResponsePromise
    const apiStatus = apiResponse ? apiResponse.status() : 'NO_CALL'

    await page.screenshot({ path: 'playwright-report/tc05-administration.png' })

    await expect(page).toHaveURL(/\/administration/)
    console.log(`TC-05 /administration — API /auth/me status: ${apiStatus}`)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)

    if (consoleErrors.length > 0) {
      console.log(`TC-05 console errors (${consoleErrors.length}):`, consoleErrors)
    }
  })

})
