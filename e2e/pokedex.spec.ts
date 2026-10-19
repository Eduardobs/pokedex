import { expect, test, type Page } from '@playwright/test'

const apiBase = 'https://pokeapi.co/api/v2'

const pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  order: 35,
  is_default: true,
  location_area_encounters: `${apiBase}/pokemon/25/encounters`,
  sprites: {
    front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    front_shiny: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png',
    other: {
      'official-artwork': {
        front_default:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        front_shiny:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/25.png',
      },
    },
  },
  types: [{ slot: 1, type: { name: 'electric', url: `${apiBase}/type/13/` } }],
  stats: [],
  abilities: [],
  moves: [],
  species: { name: 'pikachu', url: `${apiBase}/pokemon-species/25/` },
  forms: [],
  game_indices: [],
}

const list = {
  count: 1,
  next: null,
  previous: null,
  results: [{ name: 'pikachu', url: `${apiBase}/pokemon/25/` }],
}

async function mockPokeApi(page: Page, options: { failFirstList?: boolean } = {}) {
  let listRequests = 0
  await page.route(`${apiBase}/**`, async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/v2/pokemon' && url.searchParams.get('limit') === '2000') {
      listRequests += 1
      if (options.failFirstList && listRequests === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', json: list })
      return
    }
    if (url.pathname === '/api/v2/pokemon/pikachu') {
      await route.fulfill({ status: 200, contentType: 'application/json', json: pokemon })
      return
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
  return {
    get listRequests() {
      return listRequests
    },
  }
}

test('searches the Pokédex and persists a favorite across a reload', async ({ page }) => {
  await mockPokeApi(page)

  await page.goto('/#/')
  await page.getByRole('link', { name: 'Abrir Pokédex' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Encontre seu Pokémon' })).toBeVisible()

  const search = page.getByRole('combobox', { name: 'Filtrar todos os Pokémon por nome ou número' })
  await search.fill('pika')
  await expect(page).toHaveURL(/#\/pokemon\?q=pika$/)
  await expect(page.getByRole('heading', { level: 3, name: 'Pikachu' })).toBeVisible()

  await page.getByRole('button', { name: /Adicionar pikachu aos favoritos/i }).click()
  await expect(page.getByRole('status')).toContainText('pikachu foi adicionado aos favoritos.')
  await page.getByRole('button', { name: 'Pokédex' }).click()
  await page.getByRole('link', { name: /Favoritos 1/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pokémon favoritos' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Pikachu' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { level: 3, name: 'Pikachu' })).toBeVisible()
  await page.getByRole('button', { name: /Remover pikachu dos favoritos/i }).click()
  await expect(page.getByRole('heading', { name: 'Sua coleção está vazia' })).toBeVisible()
})

test('recovers the Pokédex after a failed API request', async ({ page }) => {
  const api = await mockPokeApi(page, { failFirstList: true })

  await page.goto('/#/pokemon')
  await expect(page.getByText('Não foi possível carregar a Pokédex. Verifique sua conexão.')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()

  await expect(page.getByRole('heading', { level: 3, name: 'Pikachu' })).toBeVisible()
  expect(api.listRequests).toBe(2)
})

test('persists language and theme preferences across a reload', async ({ page }) => {
  await page.goto('/#/')

  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Idioma' }).click()
  await page.getByRole('option', { name: /English/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Discover. Explore.')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Enable light theme' })).toBeVisible()
})

test('opens the Random Battle route and guides players without a complete team', async ({ page }) => {
  await page.goto('/#/battle')

  await expect(page.getByRole('heading', { level: 1, name: 'Batalha' })).toBeVisible()
  await expect(page.getByText('Random Battle · Singles 6×6')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Criar uma equipe' })).toHaveAttribute('href', '#/teams')
  await expect(page).toHaveTitle('Batalha · Atlas Pokémon')

  await page.setViewportSize({ width: 320, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})

test('keeps the mobile Pokémon detail and its statistics inside the page', async ({ page }) => {
  await mockPokeApi(page)
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/#/pokemon/pikachu')
  await expect(page.getByRole('heading', { name: 'Pikachu', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Atributos base' })).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.getByRole('tab', { name: 'Visão geral' }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})
