import { expect, test } from '@playwright/test'
import manifest from '../../src/content/manifest.json' with { type: 'json' }

for (const theme of ['light', 'dark'] as const) {
  test(`every page renders without overflow or errors (${theme})`, async ({ page }) => {
    test.setTimeout(240_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.addInitScript((t) => {
      localStorage.setItem('rfo-settings', JSON.stringify({ state: { theme: t }, version: 0 }))
    }, theme)

    for (const ch of manifest) {
      for (let pg = 1; pg <= ch.pages.length; pg++) {
        await page.goto(`/#/ch/${ch.n}/${pg}`)
        await expect(page.locator('h3.ph')).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        expect(overflow, `ch${ch.n} p${pg} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
      }
    }
    for (const r of ['/glossary', '/notes', '/review', '/explore']) {
      await page.goto('/#' + r)
      await expect(page.locator('h3.ph')).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${r} overflows by ${overflow}px`).toBeLessThanOrEqual(0)
    }
    expect(errors).toEqual([])
  })
}

test('old #c3p2 links redirect to the new route', async ({ page }) => {
  await page.goto('/#c3p2')
  await expect(page).toHaveURL(/#\/ch\/3\/2$/)
})

test('the granule explorer opens the bundled sample', async ({ page }) => {
  await page.goto('/#/explore')
  await page.getByRole('button', { name: 'Try the sample' }).click()
  await expect(page.locator('#p-granule .read').first()).toContainText('90', { timeout: 30_000 })
  await expect(page.locator('#p-granule')).toContainText('typePrecip')
})

test.describe('after a new deploy', () => {
  // Service workers would answer from their cache and hide the missing file from the test.
  test.use({ serviceWorkers: 'block' })

  test('a missing simulator chunk reloads onto the new build instead of crashing', async ({ page }) => {
    let refused = 0
    await page.route(/ScanCurtain-.*\.js$/, (route) => {
      if (refused++ === 0) return route.fulfill({ status: 404, body: 'gone' })
      return route.continue()
    })
    await page.goto('/#/ch/3/4')
    await expect(page.locator('#p-curtain canvas').first()).toBeVisible({ timeout: 15_000 })
    expect(refused).toBeGreaterThanOrEqual(2)
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0)
  })

  test('a chunk that stays missing shows a friendly message, not a crash page', async ({ page }) => {
    await page.route(/ScanCurtain-.*\.js$/, (route) => route.fulfill({ status: 404, body: 'gone' }))
    await page.goto('/#/ch/3/4')
    await expect(page.getByText('A new version is ready')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible()
    // the rest of the page still works
    await expect(page.locator('h3.ph').first()).toBeVisible()
  })
})
