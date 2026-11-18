/**
 * Mock-backed navigation / 403 / 401 UI contracts.
 * Does not hit Production. Safe to run locally with next start.
 */
import { expect, test, type Page } from '@playwright/test'

async function mockSession(page: Page, permissions: string[]) {
  await page.addInitScript(() => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token; path=/'
  })
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/platform/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 9,
        name: 'Limited Operator',
        email: 'limited@example.test',
        is_active: true,
        permissions,
      },
    }),
  )
}

test.describe('Platform Admin nav + denial (mock)', () => {
  test('hides unauthorized nav links and shows denial gate', async ({ page }) => {
    await mockSession(page, ['platform.tenants.view'])
    await page.route('**/api/platform/tenants?**', (route) =>
      route.fulfill({
        json: {
          data: [],
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: 0,
          from: null,
          to: null,
        },
      }),
    )
    await page.route('**/api/platform/users**', (route) =>
      route.fulfill({ status: 403, json: { message: 'Forbidden' } }),
    )
    await page.route('**/api/platform/dashboard', (route) =>
      route.fulfill({ json: { generated_at: new Date().toISOString(), sections: {} } }),
    )

    await page.route('**/api/platform/tenants/summary', (route) =>
      route.fulfill({
        json: {
          tenants: {
            total: 0,
            by_status: { pending: 0, active: 0, suspended: 0 },
            by_classification: {
              contracting_company: 0,
              individual_contractor: 0,
              engineering_consultancy: 0,
              property_owner: 0,
              needs_review: 0,
            },
            contractors_total: 0,
            consultants_total: 0,
            owners_total: 0,
          },
          registrations: { by_status: {} },
          architecture: { owner_model: 'client', owner_tenant_product: false },
        },
      }),
    )
    await page.goto('/platform')
    const nav = page.getByRole('navigation', { name: 'قائمة إدارة المنصة' })
    await expect(nav.getByRole('link', { name: 'المقاولون', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'الاستشاريون', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'الملاك', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'جميع الجهات', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'المستأجرون', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'طلبات التسجيل', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'المندوبون', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'مستخدمو المنصة', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'الأدوار', exact: true })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'سجل التدقيق', exact: true })).toHaveCount(0)

    await page.goto('/platform/users')
    await expect(
      page.getByText(/ليس(ت)? لديك صلاحية|صلاحية عرض هذه الصفحة/i),
    ).toBeVisible()
  })

  test('401 from /me sends guest to login', async ({ page }) => {
    await page.route('**/api/platform/auth/me', (route) =>
      route.fulfill({ status: 401, json: { message: 'Unauthenticated.' } }),
    )
    await page.goto('/platform/roles', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/platform\/login/, { timeout: 20_000 })
    await expect(page.locator('#email')).toBeVisible()
  })

  test('shows registration links and working page when view permissions are granted', async ({ page }) => {
    await mockSession(page, [
      'platform.tenants.view',
      'platform.tenant_registrations.view',
      'platform.registration_representatives.view',
    ])
    await page.route('**/api/platform/registration-representatives**', (route) =>
      route.fulfill({ json: { data: [] } }),
    )
    await page.route('**/api/platform/tenant-registrations**', (route) =>
      route.fulfill({ json: { data: [], current_page: 1, last_page: 1, total: 0 } }),
    )

    await page.goto('/platform/registration-representatives')
    const nav = page.getByRole('navigation', { name: 'قائمة إدارة المنصة' })
    await expect(nav.getByRole('link', { name: 'طلبات التسجيل', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'المندوبون', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'هويات مندوبي التسجيل' })).toBeVisible()

    await nav.getByRole('link', { name: 'المندوبون', exact: true }).click()
    await expect(page).toHaveURL(/\/platform\/registration-representatives$/)
    await expect(page.getByRole('heading', { name: 'هويات مندوبي التسجيل' })).toBeVisible()
  })
})
