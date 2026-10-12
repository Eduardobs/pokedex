import { expect, test } from '@playwright/test'

for (const catalog of ['pokemon', 'forms']) {
  test(`preserves ordered type selections across reload and keyboard interaction in ${catalog}`, async ({ page }) => {
    await page.route('https://pokeapi.co/api/v2/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (['/api/v2/pokemon', '/api/v2/pokemon-form', '/api/v2/pokemon-species'].includes(path)) {
        await route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
      } else if (['/api/v2/type/water', '/api/v2/type/ice', '/api/v2/type/psychic'].includes(path)) {
        await route.fulfill({ json: { pokemon: [] } })
      } else {
        throw new Error(`Unexpected API endpoint: ${path}`)
      }
    })

    await page.goto(`/#/${catalog}`)
    await page.getByRole('button', { name: 'Exibir filtros' }).click()
    const types = page.getByRole('group', { name: 'Tipo', exact: true })
    const water = types.getByRole('checkbox', { name: 'Água' })
    const ice = types.getByRole('checkbox', { name: 'Gelo' })
    const psychic = types.getByRole('checkbox', { name: 'Psíquico' })
    await expect(types.getByRole('checkbox', { checked: true })).toHaveCount(0)

    await water.focus()
    await page.keyboard.press('Space')
    await expect(water).toBeFocused()
    await expect(water).toBeChecked()
    await expect(water).toHaveAccessibleDescription('Ordem de seleção: 1')
    await ice.focus()
    await page.keyboard.press('Space')
    await expect(ice).toBeFocused()
    await expect(ice).toHaveAccessibleDescription('Ordem de seleção: 2')
    await expect(page).toHaveURL(/type=water%2Cice$/)

    await page.reload()
    await page.getByRole('button', { name: /Exibir filtros/ }).click()
    await expect(water).toBeChecked()
    await expect(ice).toBeChecked()
    await expect(water).toHaveAccessibleDescription('Ordem de seleção: 1')
    await expect(ice).toHaveAccessibleDescription('Ordem de seleção: 2')

    await psychic.focus()
    await page.keyboard.press('Space')
    await expect(water).not.toBeChecked()
    await expect(ice).toHaveAccessibleDescription('Ordem de seleção: 1')
    await expect(psychic).toBeChecked()
    await expect(psychic).toHaveAccessibleDescription('Ordem de seleção: 2')
    await expect(page).toHaveURL(/type=ice%2Cpsychic$/)

    await page.getByRole('combobox', { name: 'Ordem' }).click()
    await page.getByRole('option', { name: 'Decrescente' }).click()
    await expect(page.getByRole('combobox', { name: 'Ordem' })).toContainText('Decrescente')
    await expect(page).toHaveURL(/type=ice%2Cpsychic&order=desc$/)
    const allTypes = types.getByRole('button', { name: 'Todos' })
    await allTypes.focus()
    await page.keyboard.press('Enter')
    await expect(allTypes).toBeFocused()
    await expect(types.getByRole('checkbox', { checked: true })).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`#/${catalog}\\?order=desc$`))

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(types.getByRole('checkbox', { checked: true })).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`#/${catalog}$`))
  })
}
