/**
 * Cairo font restoration — local production-build verification.
 * Proves the font file is served, loaded by the browser, and inherited by real Arabic UI.
 */
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'

const FONT_PATH = '/fonts/Cairo/Cairo-Variable.ttf'
const EXPECTED_SHA256 = '667c987182391c91f4e57a2f455b1794fb5e3ee6ca4ef3383e86bb690fa9c964'
const shots = path.join(__dirname, '..', '..', 'artifacts', 'font-restore')

type StyleInfo = {
  tag: string
  text: string
  fontFamily: string
  fontSize: string
  fontWeight: string
}

async function mockPlatformAuth(page: Page) {
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
  await page.route('**/api/platform/tenants/summary', (route) =>
    route.fulfill({
      json: {
        tenants: { total: 1, by_status: {}, by_classification: {} },
        registrations: { by_status: {} },
        architecture: { owner_model: 'client' },
      },
    }),
  )
  await page.route('**/api/platform/tenants?**', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 1,
            slug: 'demo-entity',
            name: 'جهة تجريبية',
            legal_type: 'organization',
            activity_type: 'contractor',
            classification: 'contracting_company',
            classification_reason: null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone: null,
            email: null,
            responsible_name: null,
            responsible_qid: null,
            qid_expires_at: null,
            identifiers: [],
          },
        ],
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 1,
        from: 1,
        to: 1,
      },
    }),
  )
}

async function fontFaces(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.load('400 16px Cairo', 'بناء قطر BINAA Qatar')
    await document.fonts.load('700 16px Cairo', 'بناء قطر BINAA Qatar')
    await document.fonts.ready
    return [...document.fonts]
      .filter((face) => face.family === 'Cairo')
      .map((face) => ({ family: face.family, weight: face.weight, status: face.status }))
  })
}

function expectCairo(info: StyleInfo | null, label: string) {
  expect(info, label).not.toBeNull()
  expect(info!.fontFamily, label).toContain('Cairo')
}

test('self-hosted Cairo loads on the login page with no Google Fonts requests', async ({ page }) => {
  const externalFontRequests: string[] = []
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) {
      externalFontRequests.push(request.url())
    }
  })

  await page.goto('/platform/login')
  await expect(page.getByRole('heading', { name: 'بناء قطر — المنصة' })).toBeVisible()

  const response = await page.request.get(FONT_PATH)
  expect(response.status(), 'font file HTTP status').toBe(200)
  expect(response.headers()['content-type'] || '').toMatch(/font|octet-stream/i)
  const bytes = await response.body()
  expect(bytes.length).toBeGreaterThan(500_000)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(EXPECTED_SHA256)

  const faces = await fontFaces(page)
  expect(faces.length, 'Cairo FontFace entries').toBeGreaterThan(0)
  expect(faces.some((face) => face.status === 'loaded'), 'Cairo actually loaded').toBe(true)

  const styles = await page.evaluate(() => {
    const pick = (selector: string): StyleInfo | null => {
      const element = document.querySelector(selector)
      if (!element) return null
      const computed = getComputedStyle(element)
      return {
        tag: element.tagName,
        text: (element.textContent || '').trim().slice(0, 40),
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
      }
    }
    return {
      dir: document.documentElement.dir,
      body: pick('body'),
      label: pick('label'),
      input: pick('input'),
      button: pick('button'),
      latinCheck: document.fonts.check('400 16px Cairo', 'BINAA Qatar'),
    }
  })

  expect(styles.dir).toBe('rtl')
  expectCairo(styles.body, 'body')
  expectCairo(styles.label, 'login label')
  expectCairo(styles.input, 'login input')
  expectCairo(styles.button, 'login button')
  expect(styles.latinCheck, 'Latin coverage in loaded Cairo').toBe(true)
  expect(externalFontRequests, 'external font requests').toEqual([])

  fs.mkdirSync(shots, { recursive: true })
  await page.screenshot({ path: path.join(shots, 'after-local-admin-login.png'), fullPage: true })
})

test('Cairo inherits through platform sidebar, table, form, button and dialog', async ({ page }) => {
  await mockPlatformAuth(page)
  await page.goto('/platform/tenants')
  await expect(page.getByRole('heading', { name: 'جميع الجهات' })).toBeVisible()
  await page.waitForSelector('table td')
  const faces = await fontFaces(page)

  const styles = await page.evaluate(() => {
    const pick = (element: Element | null): StyleInfo | null => {
      if (!element) return null
      const computed = getComputedStyle(element)
      return {
        tag: element.tagName,
        text: (element.textContent || '').trim().slice(0, 40),
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
      }
    }

    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.textContent = 'نافذة تأكيد'
    document.body.appendChild(dialog)

    const english = document.createElement('span')
    english.dir = 'ltr'
    english.textContent = 'BINAA Qatar'
    document.body.appendChild(english)

    const result = {
      sidebar: pick(document.querySelector('nav a')),
      table: pick(document.querySelector('table td.font-medium, table td')),
      form: pick(document.querySelector('input')),
      button: pick(document.querySelector('button')),
      dialog: pick(dialog),
      english: pick(english),
      latinCheck: document.fonts.check('400 16px Cairo', 'BINAA Qatar'),
    }
    dialog.remove()
    english.remove()
    return result
  })

  expectCairo(styles.sidebar, 'sidebar link')
  expectCairo(styles.table, 'table cell')
  expectCairo(styles.form, 'form input')
  expectCairo(styles.button, 'button')
  expectCairo(styles.dialog, 'dialog')
  expectCairo(styles.english, 'English text')
  expect(styles.latinCheck, 'Latin coverage in loaded Cairo').toBe(true)
  expect(faces.some((face) => face.status === 'loaded'), 'Cairo actually loaded').toBe(true)

  fs.mkdirSync(shots, { recursive: true })
  await page.screenshot({ path: path.join(shots, 'after-local-admin-tenants.png'), fullPage: true })
})
