import { expect, test, type Locator } from '@playwright/test'
import { prepareMobileBattle } from './fixtures/battle'

async function iconPresentation(tooltip: Locator) {
  return tooltip.locator('svg, img').evaluateAll((icons) =>
    icons.map((icon) => {
      const style = getComputedStyle(icon)
      return {
        color: style.color,
        width: style.width,
        height: style.height,
        filter: style.filter,
        opacity: style.opacity,
      }
    }),
  )
}

for (const theme of ['light', 'dark']) {
  test(`trainer roster preserves tooltip icon colors and sizes in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await prepareMobileBattle(page)
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme)

    for (const side of ['player', 'opponent']) {
      const field = page.locator(`.battle-active.${side}`)
      await field.locator('.battle-sprite-trigger').hover()
      const fieldTooltip = field.getByRole('tooltip')
      await expect(fieldTooltip).toBeVisible()
      const expected = await iconPresentation(fieldTooltip)
      expect(expected.length).toBeGreaterThan(0)

      const roster = page.locator(`.battle-trainer.${side} .battle-roster-tooltip-trigger`).first()
      await roster.hover()
      const rosterTooltip = roster.getByRole('tooltip')
      await expect(rosterTooltip).toBeVisible()
      expect(await iconPresentation(rosterTooltip)).toEqual(expected)

      // Exercise the KO presentation without coupling this CSS regression to battle RNG.
      await roster.evaluate((el) => el.closest('li')!.classList.add('is-fainted'))
      expect(await iconPresentation(rosterTooltip)).toEqual(expected)
      const indicator = roster.locator(':scope > img, :scope > svg')
      await expect(indicator).toHaveCSS('opacity', '0.75')
      await roster.evaluate((el) => el.closest('li')!.classList.remove('is-fainted'))
    }
    const genderColor = await page
      .locator('.battle-active.player .battle-gender-icon svg')
      .first()
      .evaluate((el) => getComputedStyle(el).color)
    await page.getByRole('button', { name: 'Trocar Pokémon', exact: true }).click()
    const replacement = page.locator('.battle-switch-button').first()
    await replacement.hover()
    await expect(replacement.getByRole('tooltip')).toBeVisible()
    await expect(replacement.locator('.battle-gender-icon svg')).toHaveCSS('color', genderColor)
  })
}
