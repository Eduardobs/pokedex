import { API_BASE_PATH, API_BASE_URL, GRAPHQL_API_URL } from './fixtures/api-config'
import { expect, test } from '@playwright/test'

test('loads Pokédex card types through REST without the GraphQL service', async ({ page }) => {
  let graphqlRequests = 0
  await page.route(`${GRAPHQL_API_URL}**`, async (route) => {
    graphqlRequests += 1
    await route.fulfill({ status: 404, json: {} })
  })
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === `${API_BASE_PATH}/pokemon`) {
      await route.fulfill({
        json: {
          count: 1,
          next: null,
          previous: null,
          results: [{ name: 'pikachu', url: `${API_BASE_URL}/pokemon/25/` }],
        },
      })
    } else if (url.pathname === `${API_BASE_PATH}/pokemon/pikachu`) {
      await route.fulfill({
        json: {
          id: 25,
          name: 'pikachu',
          types: [{ slot: 1, type: { name: 'electric' } }],
        },
      })
    } else {
      throw new Error(`Unexpected API endpoint: ${url.pathname}`)
    }
  })
  await page.goto('/#/pokemon')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Pikachu', exact: true }) })
  await expect(card.getByText('Elétrico', { exact: true })).toBeVisible()
  expect(graphqlRequests).toBe(0)
})
