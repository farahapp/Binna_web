import { defineConfig, devices } from '@playwright/test'

/**
 * BINAA2 — Playwright Smoke Suite Configuration
 *
 * Browser: Google Chrome (channel: 'chrome') — HEADED (visible window).
 * Falls back to Playwright Chromium if Chrome is not installed.
 *
 * Web URL:     http://localhost:3000
 * Backend URL: http://localhost:8000
 * Tenant:      auth-smoke (NEXT_PUBLIC_TENANT_SLUG=auth-smoke in web/.env.local)
 *
 * No credentials hardcoded here. Tests read from environment variables only.
 * BINAA2_SMOKE_EMAIL / BINAA2_SMOKE_PASSWORD must be set before running.
 *
 * VISIBLE MODE: headless: false — the browser window opens on the desktop.
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
    baseURL: 'http://localhost:3000',
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
  // Do NOT start a webServer here — Next.js dev server must already be running.
  // Run: cd web && npm run dev (in a separate terminal) before running tests.
})
