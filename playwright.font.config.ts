import { defineConfig, devices } from '@playwright/test'

/** Local verification of the self-hosted Cairo font against the production build. */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['cairo-font.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3004',
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'node_modules\\.bin\\next start -p 3004',
    url: 'http://localhost:3004/platform/login',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: 'https://api.binaaqatar.com',
    },
  },
})
