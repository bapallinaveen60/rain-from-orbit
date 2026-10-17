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
    for (const r of ['/glossary', '/notes', '/review']) {
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
