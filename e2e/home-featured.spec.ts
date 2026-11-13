import { expect, test } from '@playwright/test'
import { API_BASE_URL } from './fixtures/api-config'

test('refreshes the highlighted Pokémon while keeping the three starters fixed', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    if (!new URL(route.request().url()).pathname.includes('/pokemon/')) return route.fulfill({ status: 404, json: {} })
    const identifier = new URL(route.request().url()).pathname.split('/').at(-1)
    const id = identifier === 'ivysaur' ? 2 : Number(identifier)
    const name = id === 1 ? 'bulbasaur' : id === 2 ? 'ivysaur' : 'venusaur'
    await route.fulfill({
      json: {
        id,
        name,
        height: 10,
        weight: 130,
        types: [],
        stats: [],
        abilities: [],
        moves: [],
        sprites: {},
        species: { name, url: `${API_BASE_URL}/pokemon-species/${id}` },
      },
    })
  })
  await page.goto('/#/')
  const first = page.getByRole('link', { name: 'Abrir ficha de Bulbasaur' })
  await expect(first).toBeVisible()
  await expect(first).toHaveAttribute('href', '#/pokemon/bulbasaur')
  await page.reload()
  const second = page.getByRole('link', { name: 'Abrir ficha de Ivysaur' })
  await expect(second).toBeVisible()
  await expect(second.getByRole('img')).toHaveAttribute('src', /official-artwork\/2\.png$/)
  for (const name of ['Bulbasaur', 'Charmander', 'Squirtle']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
  }
  await second.click()
  await expect(page).toHaveURL(/#\/pokemon\/ivysaur$/)
})
