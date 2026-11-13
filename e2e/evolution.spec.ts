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
      await page
        .getByRole('tablist')
        .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
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
  await expect(page.locator('.evolution-flow').getByRole('link', { name: /Wormadam.*Manto vegetal/ })).toHaveAttribute(
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

test('connects regional and gender evolutions only to compatible source nodes', async ({ page }) => {
  await mockEvolutionFamilies(page)
  await page.goto('/#/pokemon/mime-jr')
  await page.getByRole('tab', { name: 'Evoluções', exact: true }).click()
  const family = page.getByRole('list', { name: 'Linha evolutiva' })
  const regional = family.locator('a[href="#/pokemon/mr-mime-galar"]')
  await expect(regional).toContainText('Galar')
  await expect(regional.getByRole('group', { name: 'Tipos' })).toContainText('Gelo')
  await expect(regional.getByRole('group', { name: 'Tipos' })).toContainText('Psíquico')
  await expect(family.locator('a[href="#/pokemon/mr-mime"]').getByRole('group', { name: 'Tipos' })).toContainText(
    'Fada',
  )
  await expect(regional.locator('img')).toHaveAttribute('src', /10168\.png$/)
  await expect(regional.locator('..').getByRole('link', { name: /Mr Rime/ })).toHaveCount(1)
  await expect(
    family
      .locator('a[href="#/pokemon/mr-mime"]')
      .locator('..')
      .getByRole('link', { name: /Mr Rime/ }),
  ).toHaveCount(0)
  await page.goto('/#/pokemon/burmy')
  await page.getByRole('tab', { name: 'Evoluções', exact: true }).click()
  const male = family.getByRole('link', { name: /Burmy.*Macho/ }).locator('..')
  const female = family.getByRole('link', { name: /Burmy.*Fêmea/ }).locator('..')
  await expect(male.getByRole('link', { name: /Mothim/ })).toHaveCount(1)
  await expect(male.getByRole('link', { name: /Wormadam/ })).toHaveCount(0)
  await expect(female.getByRole('link', { name: /Wormadam/ })).toHaveCount(3)
  await expect(female.getByRole('link', { name: /Mothim/ })).toHaveCount(0)
  for (const [cloak, label, id] of [
    ['plant', 'Manto vegetal', 413],
    ['sandy', 'Manto arenoso', 10004],
    ['trash', 'Manto de lixo', 10005],
  ] as const) {
    const wormadam = female.getByRole('link', { name: new RegExp(`Wormadam.*${label}`) })
    await expect(wormadam).toHaveAttribute('href', `#/pokemon/wormadam-${cloak}`)
    await expect(wormadam.locator('img')).toHaveAttribute('src', new RegExp(`${id}\\.png$`))
    await expect(wormadam.locator('..')).toContainText(`Na forma ${label}`)
  }
})

test('shows female White-Striped Basculin evolving into female Basculegion', async ({ page }) => {
  await mockEvolutionFamilies(page)
  await page.goto('/#/pokemon/basculin')
  await page.getByRole('tab', { name: 'Evoluções', exact: true }).click()
  const family = page.getByRole('list', { name: 'Linha evolutiva' })
  const female = family.getByRole('link', { name: /Basculin.*Listra branca.*Fêmea/ }).locator('..')
  const destination = female.getByRole('link', { name: /Basculegion.*Fêmea/ })
  await expect(destination).toHaveAttribute('href', '#/pokemon/basculegion-female')
  await expect(destination.locator('img')).toHaveAttribute('src', /10248\.png$/)
  await expect(female.getByRole('link', { name: /Basculegion.*Macho/ })).toHaveCount(0)
  const male = family.getByRole('link', { name: /Basculin.*Listra branca.*Macho/ }).locator('..')
  await expect(male.getByRole('link', { name: /Basculegion.*Macho/ })).toHaveAttribute(
    'href',
    '#/pokemon/basculegion-male',
  )
  for (const stripe of ['vermelha', 'azul']) {
    const sources = family.getByRole('link', { name: new RegExp(`Basculin.*Listra ${stripe}`) })
    await expect(sources).toHaveCount(2)
    for (const source of await sources.all())
      await expect(source.locator('..').getByRole('link', { name: /Basculegion/ })).toHaveCount(0)
  }
})

for (const width of [320, 390, 1440]) {
  for (const language of ['pt-BR', 'en', 'es']) {
    test(`keeps Decidueye type badges on one line at ${width}px in ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((locale) => localStorage.setItem('atlas-language', locale), language)
      await mockEvolutionFamilies(page)
      await page.goto('/#/pokemon/rowlet')
      await page.locator('#tab-evolution').click()
      const nodes = page.locator('.evolution-flow-node')
      await expect(nodes).toHaveCount(4)
      await page.evaluate(() => document.fonts.ready)
      for (const node of await nodes.all()) {
        const badges = node.locator('.type-badge')
        await expect(badges).toHaveCount(2)
        await expect
          .poll(() =>
            node.evaluate((element) => {
              const types = Array.from(element.querySelectorAll('.type-badge')).map((badge) =>
                badge.getBoundingClientRect(),
              )
              const card = element.getBoundingClientRect()
              return (
                types.length === 2 &&
                Math.abs(types[0].top - types[1].top) < 1 &&
                types.every((type) => type.left >= card.left && type.right <= card.right)
              )
            }),
          )
          .toBe(true)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    })
  }
}
