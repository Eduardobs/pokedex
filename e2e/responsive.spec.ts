import { expect, test } from '@playwright/test'

for (const width of [320, 390, 768, 901, 1024, 1440]) {
  test(`keeps navigation controls inside the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/#/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    const theme = page.getByRole('button', { name: /tema escuro/i })
    await expect(theme).toBeInViewport()
  })
}

test('collapses the brand before switching navigation to the hamburger menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 844 })
  await page.goto('/#/')
  const brandText = page.locator('.brand .logo > span:last-child')
  const menuButton = page.getByRole('button', { name: 'Alternar menu' })
  const navigation = page.getByRole('navigation', { name: 'Navegação principal' })
  const pokedexGroup = navigation.getByRole('button', { name: 'Pokédex' })
  const pokedexLink = navigation.getByRole('link', {
    name: 'Pokédex',
  })

  await expect(brandText).toBeVisible()
  await expect(menuButton).toBeHidden()

  await page.setViewportSize({ width: 901, height: 844 })
  await expect(brandText).toBeHidden()
  await expect(pokedexGroup).toBeVisible()
  await expect(menuButton).toBeHidden()

  await page.setViewportSize({ width: 768, height: 844 })
  await expect(brandText).toBeHidden()
  await expect(pokedexGroup).toBeHidden()
  await expect(menuButton).toBeVisible()
  await menuButton.click()
  await expect(pokedexGroup).toBeVisible()
  await pokedexGroup.click()
  await expect(pokedexLink).toBeVisible()
})

test('opens mobile map filters without moving the map and restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('https://*.mapgenie.io/**', (route) => route.abort())
  await page.goto('/#/maps/kanto')
  const viewport = page.getByLabel(/Mapa de Kanto\. Use as setas/)
  await expect(viewport).toBeVisible()
  const before = await viewport.boundingBox()
  expect(before!.y).toBeLessThan(500)
  const trigger = page.getByRole('button', { name: 'Exibir filtros' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Filtros do mapa' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Limpar', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  expect((await viewport.boundingBox())!.y).toBe(before!.y)
  await expect(page.getByText('0 pins visíveis')).toBeVisible()
})

test('keeps selected defender values inside their type selectors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 844 })
  await page.goto('/#/types-table')

  for (const name of ['Primeiro tipo defensor', 'Segundo tipo defensor']) {
    const selector = page.getByRole('combobox', { name })
    const selectedValue = selector.locator('.catalog-select-copy strong')
    const [selectorBox, valueBox] = await Promise.all([selector.boundingBox(), selectedValue.boundingBox()])

    expect(selectorBox).not.toBeNull()
    expect(valueBox).not.toBeNull()
    expect(valueBox!.y).toBeGreaterThanOrEqual(selectorBox!.y)
    expect(valueBox!.y + valueBox!.height).toBeLessThanOrEqual(selectorBox!.y + selectorBox!.height)
  }
})

test('supports compact global search and a single keyboard entry into the type matrix', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/types-table')
  await page.getByRole('button', { name: 'Buscar Pokémon' }).click()
  await expect(page.getByRole('textbox', { name: 'Buscar Pokémon' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Buscar Pokémon' })).toBeFocused()
  await page.getByRole('button', { name: 'Abrir matriz de tipos' }).click()
  const first = page.getByRole('button', { name: 'Normal → Normal: Dano 1×' })
  await first.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Normal → Fogo: Dano 1×' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('combobox', { name: 'Primeiro tipo defensor' })).toContainText('Fogo')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Normal → Água/ })).not.toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

test('cycles through visible mobile navigation including newly expanded links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/')
  const trigger = page.getByRole('button', { name: 'Alternar menu' })
  await trigger.click()
  const navigation = page.getByRole('navigation', { name: 'Navegação principal' })
  const first = navigation.getByRole('button', { name: 'Pokédex' })
  await expect(first).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(navigation.getByRole('button', { name: 'Batalhas' })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(navigation.getByRole('link', { name: 'Criar equipes' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(navigation.getByRole('link', { name: 'Batalhar' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(first).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

for (const theme of ['light', 'dark']) {
  test(`keeps task shortcuts readable on narrow screens in ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.goto('/#/')
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value
    }, theme)
    const workflows = page.getByRole('region', { name: 'O que você quer fazer agora?' })
    await expect(workflows.getByRole('link')).toHaveCount(3)
    for (const link of await workflows.getByRole('link').all()) {
      await link.scrollIntoViewIfNeeded()
      await expect(link).toBeInViewport()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  })
}
