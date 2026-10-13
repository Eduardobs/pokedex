import { expect, test } from '@playwright/test'

for (const catalog of ['pokemon', 'forms']) {
  test(`preserves and clears the baby filter with keyboard interaction in ${catalog}`, async ({ page }) => {
    await page.route('https://pokeapi.co/api/v2/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (['/api/v2/pokemon', '/api/v2/pokemon-form', '/api/v2/pokemon-species'].includes(path)) {
        await route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } })
      } else {
        throw new Error(`Unexpected API endpoint: ${path}`)
      }
    })
    await page.route('https://graphql.pokeapi.co/v1beta2', async (route) => {
      await route.fulfill({
        json: {
          data: {
            pokemonspecies: [
              {
                name: 'pichu',
                is_legendary: false,
                is_mythical: false,
                is_baby: true,
                pokemons: [{ name: 'pichu' }],
              },
            ],
          },
        },
      })
    })

    await page.goto(`/#/${catalog}`)
    await page.getByRole('button', { name: 'Exibir filtros' }).click()
    const baby = page.getByRole('checkbox', { name: 'Forma bebê' })
    await expect(baby).not.toBeChecked()
    await baby.focus()
    await page.keyboard.press('Space')
    await expect(baby).toBeFocused()
    await expect(baby).toBeChecked()
    await expect(page).toHaveURL(new RegExp(`#/${catalog}\\?baby=true$`))

    await page.getByRole('button', { name: /Esconder filtros/ }).click()
    await page.getByRole('button', { name: 'Remover filtro: Forma bebê' }).click()
    await expect(page).toHaveURL(new RegExp(`#/${catalog}$`))
    await page.getByRole('button', { name: /Exibir filtros/ }).click()
    await baby.focus()
    await page.keyboard.press('Space')
    await expect(baby).toBeChecked()
    await expect(page).toHaveURL(new RegExp(`#/${catalog}\\?baby=true$`))

    await page.reload()
    await page.getByRole('button', { name: /Exibir filtros/ }).click()
    await expect(baby).toBeChecked()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(baby).not.toBeChecked()
    await expect(page).toHaveURL(new RegExp(`#/${catalog}$`))
  })
}
