import { expect, test } from '@playwright/test'
import { mockEvolutionFamilies } from './fixtures/evolution'

for (const width of [320, 390, 1440]) {
  test(`reads all eight evolution branches without horizontal scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockEvolutionFamilies(page)
    await page.goto('/#/pokemon/eevee')
    await expect(page.getByRole('heading', { level: 1, name: 'Eevee' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    if (width <= 390) {
      const tabsBox = await page.getByRole('tablist').boundingBox()
      const shortcutsBox = await page.getByRole('navigation', { name: 'Navegação rápida' }).boundingBox()
      expect(tabsBox!.y + tabsBox!.height).toBeLessThanOrEqual(shortcutsBox!.y)
    }
    const overview = page.getByRole('tab', { name: 'Visão geral' })
    await overview.focus()
    await page.keyboard.press('ArrowRight')
    const evolutionTab = page.getByRole('tab', { name: 'Evoluções', exact: true })
    await expect(evolutionTab).toBeFocused()
    await expect(evolutionTab).toHaveAttribute('aria-selected', 'true')
    const family = page.getByRole('list', { name: 'Linha evolutiva' })
    await expect(family.locator('.evolution-flow-descendants[data-branching="true"] > li')).toHaveCount(8)
    await expect(family.getByRole('link', { name: /Eevee/ })).toHaveAttribute('aria-current', 'page')
    for (const name of ['Vaporeon', 'Jolteon', 'Flareon', 'Espeon', 'Umbreon', 'Leafeon', 'Glaceon', 'Sylveon']) {
      const branch = family.getByRole('link', { name: new RegExp(name) }).locator('..')
      await expect(branch).toContainText('A partir de Eevee')
      await expect(branch.locator('.evolution-flow-conditions')).toContainText('Requisitos')
    }
    const leafeon = family.getByRole('link', { name: /Leafeon/ }).locator('..')
    await expect(leafeon.locator('.evolution-flow-or')).toHaveText('OU')
    const diagram = page.getByRole('region', { name: 'Fluxograma da linha evolutiva' })
    await expect(diagram).toBeVisible()
    expect(await diagram.evaluate((element) => element.clientWidth <= innerWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: /tema escuro/i }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `/tmp/atlas-evolution-${width}.png`, fullPage: true, animations: 'disabled' })
  })
}

test('keeps shared ancestors together and preserves default-variety links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockEvolutionFamilies(page)
  await page.goto('/#/pokemon/gloom')
  await page.getByRole('button', { name: 'Ver todos os caminhos evolutivos' }).click()
  const family = page.getByRole('list', { name: 'Linha evolutiva' })
  await expect(family.getByRole('link', { name: /Gloom/ })).toHaveAttribute('aria-current', 'page')
  for (const name of ['Vileplume', 'Bellossom'])
    await expect(family.getByRole('link', { name: new RegExp(name) }).locator('..')).toContainText('A partir de Gloom')
  await page.goto('/#/pokemon/burmy')
  await page.getByRole('tab', { name: 'Evoluções', exact: true }).click()
  await expect(page.locator('.evolution-flow').getByRole('link', { name: /Wormadam/ })).toHaveAttribute(
    'href',
    '#/pokemon/wormadam-plant',
  )
  await page.goto('/#/pokemon/ditto')
  await page.getByRole('tab', { name: 'Evoluções', exact: true }).click()
  await expect(page.getByText('Nenhuma evolução conhecida.')).toBeVisible()
})

test('zooms and fits the connected diagram without breaking the parent-child paths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockEvolutionFamilies(page)
  await page.goto('/#/pokemon/gloom')
  await page.getByRole('tab', { name: 'Evoluções', exact: true }).click()
  const diagram = page.getByRole('region', { name: 'Fluxograma da linha evolutiva' })
  await expect(diagram.locator('svg > path[data-flow-from]')).toHaveCount(3)
  await expect(diagram.locator('path[data-flow-from="0.0"][data-flow-to="0.0.0"]')).toHaveCount(1)
  await expect(diagram.locator('path[data-flow-from="0.0"][data-flow-to="0.0.1"]')).toHaveCount(1)
  const controls = page.getByRole('group', { name: 'Controles do fluxograma' })
  await controls.getByRole('button', { name: 'Ampliar fluxo' }).click()
  await expect(controls.getByRole('status')).toHaveText('115%')
  await controls.getByRole('button', { name: 'Ajustar fluxo' }).click()
  await expect
    .poll(async () =>
      diagram.evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 2 && element.scrollWidth <= element.clientWidth + 2,
      ),
    )
    .toBe(true)
  await controls.getByRole('button', { name: 'Restaurar zoom para 100%' }).click()
  await expect(controls.getByRole('status')).toHaveText('100%')
  await diagram.focus()
  await page.keyboard.press('ArrowDown')
  await expect.poll(async () => diagram.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})
