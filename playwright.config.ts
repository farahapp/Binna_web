import { defineConfig, devices } from '@playwright/test'

/**
 * BINAA2 — Playwright Smoke Suite Configuration
 *
 * Browser: Google Chrome (channel: 'chrome') — HEADED (visible window).
 * Falls back to Playwright Chromium if Chrome is not installed.
 *
 * Web URL:     http://localhost:3001  (test-only port — avoids conflict with dev server)
 * Backend URL: http://localhost:8000
 * Tenant:      auth-smoke (NEXT_PUBLIC_TENANT_SLUG=auth-smoke in web/.env.local)
 *
 * No credentials hardcoded here. Tests read from environment variables only.
 * BINAA2_SMOKE_EMAIL / BINAA2_SMOKE_PASSWORD must be set before running.
 *
 * VISIBLE MODE: headless: false — the browser window opens on the desktop.
 *
 * webServer: Playwright starts `next start -p 3001` automatically using the
 * production build in .next/ (built by `npm run build`). reuseExistingServer
 * is false so a stale or unrelated server on 3001 never silently poisons tests.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3001',
    headless: false,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      slowMo: 0,
    },
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
  webServer: {
    // Uses the production build already present in .next/
    // next is not in PATH — invoke via node_modules/.bin
    // url points to /platform/login (200) not / (307) so the health-check
    // succeeds as soon as Next.js has compiled and served that route.
    command: 'node_modules\\.bin\\next start -p 3001',
    url: 'http://localhost:3001/platform/login',
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
