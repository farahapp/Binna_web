import { defineConfig, devices } from '@playwright/test'

/** Mocked tests for the Platform Admin WhatsApp Management Centre on :3030. */
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'platform-whatsapp-management.mock.spec.ts',
    'platform-whatsapp-dual-account.spec.ts',
  ],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3030',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
})
