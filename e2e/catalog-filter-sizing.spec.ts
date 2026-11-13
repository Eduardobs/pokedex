import { expect, test } from '@playwright/test'
import { expectReadablePresentation, mockPresentation } from './fixtures/presentation'

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`keeps Pokémon filter text inside its controls at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript((theme) => localStorage.setItem('atlas-theme', theme), theme)
      await mockPresentation(page)
      await page.goto('/#/pokemon')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Exibir filtros' }).click()
      await expect(page.getByRole('group', { name: 'Tipo', exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('expanded-filters.png'), fullPage: true })
      await expectReadablePresentation(page)
      await page.getByRole('combobox', { name: 'Ordenar por' }).click()
      await page.screenshot({ path: testInfo.outputPath('sort-options.png'), fullPage: true })
      await expectReadablePresentation(page)
      await page.keyboard.press('Escape')
      await page.getByRole('combobox', { name: 'Região', exact: true }).click()
      await expectReadablePresentation(page)
    })
  }
}
