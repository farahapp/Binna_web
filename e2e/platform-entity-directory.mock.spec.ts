/**
 * Entity directory section separation — mock-backed local Playwright.
 * Does not create accounts or hit Production.
 */
import { expect, test, type Page, type Route } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const now = new Date().toISOString()
const shots = path.join(__dirname, '..', '..', 'docs', 'uat-screenshots', 'entity-directory')

const fixtures = {
  individual: {
    id: 11,
    slug: 'ind-contractor',
    name: 'مقاول فرد تجريبي',
    legal_type: 'individual',
    activity_type: 'contractor',
    classification: 'individual_contractor',
    classification_reason: null,
    status: 'active',
    created_at: now,
    updated_at: now,
    phone: null,
    email: null,
    responsible_name: null,
    responsible_qid: null,
    qid_expires_at: null,
    identifiers: [],
  },
  company: {
    id: 12,
    slug: 'co-contractor',
    name: 'شركة مقاولات تجريبية',
    legal_type: 'organization',
    activity_type: 'contractor',
    classification: 'contracting_company',
    classification_reason: null,
    status: 'active',
    created_at: now,
    updated_at: now,
    phone: null,
    email: null,
    responsible_name: null,
    responsible_qid: null,
    qid_expires_at: null,
    identifiers: [],
  },
  consultant: {
    id: 13,
    slug: 'consultant-office',
    name: 'مكتب استشاري تجريبي',
    legal_type: 'organization',
    activity_type: 'consultant',
    classification: 'engineering_consultancy',
    classification_reason: null,
    status: 'active',
    created_at: now,
    updated_at: now,
    phone: null,
    email: null,
    responsible_name: null,
    responsible_qid: null,
    qid_expires_at: null,
    identifiers: [],
  },
  ownerInd: {
    id: 14,
    slug: 'owner-person',
    name: 'مالك فرد تجريبي',
    legal_type: 'individual',
    activity_type: 'owner',
    classification: 'property_owner',
    classification_reason: null,
    status: 'active',
    created_at: now,
    updated_at: now,
    phone: null,
    email: null,
    responsible_name: null,
    responsible_qid: null,
    qid_expires_at: null,
    identifiers: [],
  },
  ownerOrg: {
    id: 15,
    slug: 'owner-org',
    name: 'جهة مالكة تجريبية',
    legal_type: 'organization',
    activity_type: 'owner',
    classification: 'property_owner',
    classification_reason: null,
    status: 'active',
    created_at: now,
    updated_at: now,
    phone: null,
    email: null,
    responsible_name: null,
    responsible_qid: null,
    qid_expires_at: null,
    identifiers: [],
  },
  needsReview: {
    id: 16,
    slug: 'core-owner-org-like',
    name: 'Core Owner Org',
    legal_type: null,
    activity_type: null,
    classification: 'needs_review',
    classification_reason: 'missing_legal_type',
    status: 'active',
    created_at: now,
    updated_at: now,
    phone: null,
    email: null,
    responsible_name: null,
    responsible_qid: null,
    qid_expires_at: null,
    identifiers: [],
  },
}

const summary = {
  tenants: {
    total: 6,
    by_status: { pending: 0, active: 6, suspended: 0 },
    by_classification: {
      contracting_company: 1,
      individual_contractor: 1,
      engineering_consultancy: 1,
      property_owner: 2,
      needs_review: 1,
    },
    contractors_total: 2,
    consultants_total: 1,
    owners_total: 2,
  },
  registrations: { by_status: {} },
  architecture: { owner_model: 'client', owner_tenant_product: false },
}

function pageOf(data: unknown[]) {
  return {
    data,
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: data.length,
    from: data.length ? 1 : null,
    to: data.length || null,
  }
}

async function auth(page: Page) {
  await page.addInitScript(() => {
    document.cookie = 'XSRF-TOKEN=csrf-test-token; path=/'
  })
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/platform/auth/me', (route) =>
    route.fulfill({
      json: {
        id: 1,
        name: 'Admin',
        email: 'admin@example.test',
        is_active: true,
        permissions: ['platform.tenants.view'],
      },
    }),
  )
  await page.route('**/api/platform/tenants/summary', (route) => route.fulfill({ json: summary }))
}

async function fulfillList(route: Route) {
  const url = new URL(route.request().url())
  const classification = url.searchParams.get('classification')
  const legalType = url.searchParams.get('legal_type')
  const group = url.searchParams.get('group')
  let rows = Object.values(fixtures)
  if (classification === 'individual_contractor') rows = [fixtures.individual]
  else if (classification === 'contracting_company') rows = [fixtures.company]
  else if (classification === 'engineering_consultancy') rows = [fixtures.consultant]
  else if (classification === 'property_owner') {
    rows = [fixtures.ownerInd, fixtures.ownerOrg]
    if (legalType === 'individual') rows = [fixtures.ownerInd]
    if (legalType === 'organization') rows = [fixtures.ownerOrg]
  } else if (group === 'contractors') rows = [fixtures.individual, fixtures.company]
  return route.fulfill({ json: pageOf(rows) })
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(shots, { recursive: true })
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true })
}

test.beforeEach(async ({ page }) => {
  await auth(page)
  await page.route('**/api/platform/tenants?**', fulfillList)
})

test('sidebar exposes separate entity sections', async ({ page }) => {
  await page.goto('/platform/tenants')
  const nav = page.getByRole('navigation', { name: 'قائمة إدارة المنصة' })
  await expect(nav.getByRole('link', { name: 'المقاولون', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'الاستشاريون', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'الملاك', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'جميع الجهات', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'جميع الجهات' })).toBeVisible()
  await shot(page, '01-all-entities')
})

test('contractors section filters individuals and companies via tabs', async ({ page }) => {
  const seen: string[] = []
  await page.route('**/api/platform/tenants?**', async (route) => {
    const classification = new URL(route.request().url()).searchParams.get('classification')
    if (classification) seen.push(classification)
    return fulfillList(route)
  })
  await page.goto('/platform/tenants/contractors')
  await expect(page.getByRole('heading', { name: 'المقاولون' })).toBeVisible()
  await expect(page.getByText('مقاول فرد تجريبي')).toBeVisible()
  await expect(page.getByText('شركة مقاولات تجريبية')).toHaveCount(0)
  await shot(page, '02-contractors-individuals')

  const shell = page.locator('[data-platform-shell="ready"]')
  const nav = page.getByRole('navigation', { name: 'قائمة إدارة المنصة' })
  await expect(shell).toBeVisible()
  await expect(nav).toBeVisible()

  await page.getByRole('tab', { name: /شركات مقاولات/ }).click()
  await expect(shell).toBeVisible()
  await expect(nav).toBeVisible()
  await expect.poll(() => seen.includes('contracting_company')).toBeTruthy()
  await expect(page.getByText('شركة مقاولات تجريبية')).toBeVisible()
  await expect(page.getByText('مقاول فرد تجريبي')).toHaveCount(0)
  await shot(page, '03-contractors-companies')
})

test('entity section navigation keeps platform shell visible', async ({ page }) => {
  await page.goto('/platform/tenants/contractors')
  const shell = page.locator('[data-platform-shell="ready"]')
  const nav = page.getByRole('navigation', { name: 'قائمة إدارة المنصة' })
  const topbar = page.getByRole('link', { name: 'بناء قطر — المنصة' })
  await expect(shell).toBeVisible()
  await expect(nav).toBeVisible()
  await expect(topbar).toBeVisible()

  await nav.getByRole('link', { name: 'الاستشاريون', exact: true }).click()
  await expect(shell).toBeVisible()
  await expect(nav).toBeVisible()
  await expect(topbar).toBeVisible()
  await expect(page.getByRole('heading', { name: 'الاستشاريون' })).toBeVisible()

  await nav.getByRole('link', { name: 'الملاك', exact: true }).click()
  await expect(shell).toBeVisible()
  await expect(nav).toBeVisible()
  await expect(topbar).toBeVisible()
  await expect(page.getByRole('heading', { name: 'الملاك' })).toBeVisible()

  await nav.getByRole('link', { name: 'المقاولون', exact: true }).click()
  await expect(shell).toBeVisible()
  await expect(nav).toBeVisible()
  await expect(page.getByRole('heading', { name: 'المقاولون' })).toBeVisible()
  await shot(page, '07-shell-persistent-nav')
})

test('consultants section shows consultants only', async ({ page }) => {
  await page.goto('/platform/tenants/consultants')
  await expect(page.getByRole('heading', { name: 'الاستشاريون' })).toBeVisible()
  await expect(page.getByText('مكتب استشاري تجريبي')).toBeVisible()
  await expect(page.getByText('مقاول فرد تجريبي')).toHaveCount(0)
  await expect(page.getByTestId('section-count')).toContainText('1')
  await shot(page, '04-consultants')
})

test('owners section shows owners with individual/org labels', async ({ page }) => {
  await page.goto('/platform/tenants/owners')
  await expect(page.getByRole('heading', { name: 'الملاك' })).toBeVisible()
  await expect(page.getByText('مالك فرد تجريبي')).toBeVisible()
  await expect(page.getByText('جهة مالكة تجريبية')).toBeVisible()
  await expect(page.getByText('مالك فرد').first()).toBeVisible()
  await expect(page.getByText('جهة مالكة').first()).toBeVisible()
  await expect(page.getByTestId('section-count')).toContainText('Owner = Client')
  await shot(page, '05-owners')
})

test('unclassified entity shows needs-review label not blank type', async ({ page }) => {
  await page.route('**/api/platform/tenants?**', (route) =>
    route.fulfill({ json: pageOf([fixtures.needsReview]) }),
  )
  await page.goto('/platform/tenants')
  await expect(page.getByText('Core Owner Org')).toBeVisible()
  await expect(page.getByText('غير مصنّف — يحتاج مراجعة')).toBeVisible()
  await expect(page.getByText('الصفة القانونية غير متوفرة في السجل')).toBeVisible()
  await shot(page, '06-needs-review')
})

const productionShapedUnclassified = [1, 2, 3].map((index) => ({
  id: 100 + index,
  slug: `unclassified-${index}`,
  name: `جهة غير مصنفة ${index}`,
  legal_type: 'organization',
  activity_type: null,
  classification: 'needs_review',
  classification_reason: 'missing_activity_type',
  status: 'active',
  created_at: now,
  updated_at: now,
  phone: null,
  email: null,
  responsible_name: null,
  responsible_qid: null,
  qid_expires_at: null,
  identifiers: [],
}))

const unclassifiedSummary = {
  tenants: {
    total: 3,
    by_status: { pending: 0, active: 3, suspended: 0 },
    by_classification: {
      contracting_company: 0,
      individual_contractor: 0,
      engineering_consultancy: 0,
      property_owner: 0,
      needs_review: 3,
    },
    contractors_total: 0,
    consultants_total: 0,
    owners_total: 0,
  },
  registrations: { by_status: {} },
  architecture: { owner_model: 'client', owner_tenant_product: false },
}

test('three organization records without activity stay needs-review and are filterable', async ({ page }) => {
  const seenClassifications: string[] = []
  await page.route('**/api/platform/tenants/summary', (route) =>
    route.fulfill({ json: unclassifiedSummary }),
  )
  await page.route('**/api/platform/tenants?**', async (route) => {
    seenClassifications.push(new URL(route.request().url()).searchParams.get('classification') ?? '')
    return route.fulfill({ json: pageOf(productionShapedUnclassified) })
  })

  await page.goto('/platform/tenants')
  await expect(page.getByTestId('section-count')).toContainText('3')
  await expect(page.locator('tr[data-classification="needs_review"]')).toHaveCount(3)
  await expect(page.getByTestId('review-notice')).toContainText('3 جهات تحتاج مراجعة')
  await expect(page.getByText('النشاط غير محدد في السجل')).toHaveCount(3)
  await expect(page.getByText('legal=organization · activity=null')).toHaveCount(3)

  await page.getByTestId('review-filter').click()
  await expect.poll(() => seenClassifications.includes('needs_review')).toBeTruthy()
  await expect(page.locator('tr[data-classification="needs_review"]')).toHaveCount(3)
  await expect(page.getByTestId('review-notice')).toHaveCount(0)
})

test('typed sections stay empty and explain unclassified records without assigning them', async ({ page }) => {
  await page.route('**/api/platform/tenants/summary', (route) =>
    route.fulfill({ json: unclassifiedSummary }),
  )
  await page.route('**/api/platform/tenants?**', (route) =>
    route.fulfill({ json: pageOf([]) }),
  )

  for (const section of ['contractors', 'consultants', 'owners']) {
    await page.goto(`/platform/tenants/${section}`)
    await expect(page.getByTestId('section-count')).toContainText('0')
    await expect(page.getByText(/3 جهات غير مصنفة تظهر في «جميع الجهات» بحالة «يحتاج مراجعة» ولم تُسند إلى نوع/)).toBeVisible()
    await expect(page.locator('tr[data-classification]')).toHaveCount(0)
  }
})
