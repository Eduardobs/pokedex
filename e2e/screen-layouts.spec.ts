import { expect, test } from '@playwright/test'
import { prepareMobileBattle } from './fixtures/battle'
import { expectReadablePresentation, mockPresentation } from './fixtures/presentation'

// Mobile coverage lives in presentation.spec.ts; these widths exercise multi-column layouts.
for (const width of [768, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`keeps every screen readable at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      test.setTimeout(90000)
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript((theme) => {
        localStorage.setItem('atlas-theme', theme)
        localStorage.setItem('atlas-pokemon-favorites', JSON.stringify(['eevee']))
      }, theme)
      await mockPresentation(page)
      for (const route of [
        '',
        'pokemon',
        'forms',
        'favorites',
        'explore',
        'explore/move',
        'explore/move/thunderbolt',
        'types-table',
        'compare-moves?left=thunderbolt&right=thunderbolt',
        'maps',
        'maps/kanto',
        'maps/paldea',
        'maps/kitakami',
        'maps/terrarium',
        'maps/hisui-region',
        'maps/lumiose-city',
        'pokemon/eevee',
        'not-a-route',
      ]) {
        await page.goto('/#/' + route)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        if (['pokemon', 'forms', 'favorites'].includes(route))
          await expect(page.locator('.pokemon-card h3').first()).toBeVisible()
        if (route.startsWith('maps/')) {
          const spacing = await page.locator('.map-category-list label').evaluateAll((labels) =>
            labels.every((label) => {
              const icon = label.querySelector('.map-category-icon')!.getBoundingClientRect()
              const name = label.querySelector('span:not(.map-category-icon)')!.getBoundingClientRect()
              const count = label.querySelector('b')!.getBoundingClientRect()
              return name.left - icon.right >= 8 && count.left - name.right >= 8
            }),
          )
          expect(spacing).toBe(true)
        }
        await expectReadablePresentation(page)
        await page.screenshot({
          path: testInfo.outputPath(`${route.replace(/[^a-z0-9]+/gi, '-') || 'home'}.png`),
          fullPage: true,
        })
      }
    })

    test(`keeps the populated team and battle readable at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript((theme) => localStorage.setItem('atlas-theme', theme), theme)
      await prepareMobileBattle(page)
      await expectReadablePresentation(page)
      await page.screenshot({ path: testInfo.outputPath('battle.png'), fullPage: true })
      await page.goto('/#/teams')
      await expect(page.getByRole('tab').first()).toBeVisible()
      for (const control of await page.locator('.move-select > .move-select-trigger').all()) {
        const bounds = await control.boundingBox()
        expect(bounds?.height).toBeLessThanOrEqual(116)
      }
      await expectReadablePresentation(page)
      await page.screenshot({ path: testInfo.outputPath('team.png'), fullPage: true })
      await page.getByRole('button', { name: 'Batalhar com esta equipe' }).click()
      await expect(page.getByRole('button', { name: 'Iniciar batalha' })).toBeVisible()
      await expectReadablePresentation(page)
    })
  }
}
