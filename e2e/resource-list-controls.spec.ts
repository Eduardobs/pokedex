import { expect, test } from '@playwright/test'
import { API_BASE_PATH, API_BASE_URL, GRAPHQL_API_URL } from './fixtures/api-config'

for (const width of [320, 768, 1440]) {
  test(`filters and sorts the complete move list from its header at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    const moves = Array.from({ length: 45 }, (_, i) => ({
      name: `move-${i + 1}`,
      url: `${API_BASE_URL}/move/${i + 1}/`,
    }))
    await page.route(`${API_BASE_URL}/**`, (route) => {
      const url = new URL(route.request().url())
      if (url.pathname !== `${API_BASE_PATH}/move`) return route.fulfill({ status: 404, json: {} })
      const offset = Number(url.searchParams.get('offset') || 0)
      const limit = Number(url.searchParams.get('limit') || 40)
      return route.fulfill({
        json: { count: moves.length, next: null, previous: null, results: moves.slice(offset, offset + limit) },
      })
    })
    await page.route(GRAPHQL_API_URL, (route) => {
      const request = route.request().postDataJSON() as { variables: { ids: number[] } }
      expect(request.variables.ids.length).toBeLessThanOrEqual(40)
      return route.fulfill({
        json: {
          data: {
            move: request.variables.ids.map((id) => ({
              id,
              name: `move-${id}`,
              accuracy: 100,
              power: id,
              pp: 10,
              type: { name: id === 45 ? 'fire' : 'water' },
              movedamageclass: { name: 'special' },
              movenames: [{ name: `Golpe ${id}`, language: { name: 'pt-br' } }],
            })),
          },
        },
      })
    })
    await page.goto('/#/explore/move')
    await expect(page.getByRole('link', { name: /Abrir detalhes de Golpe 1\./ })).toBeVisible()
    const header = page.locator('.data-list .resource-list-controls')
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(width < 721 ? 230 : width < 1280 ? 160 : 100)
    const sort = header.getByRole('button', { name: 'Ordenar por Poder', exact: true })
    await sort.focus()
    await sort.press('Enter')
    await expect(page.getByRole('link', { name: /Abrir detalhes de Golpe 1\./ })).toBeVisible()
    await sort.press('Enter')
    await expect(page.locator('.move-list-row').first()).toHaveAccessibleName(/Abrir detalhes de Golpe 45\./)
    await page.getByRole('button', { name: 'Próxima', exact: true }).first().click()
    await expect(page.locator('.move-list-row')).toHaveCount(5)
    await expect(sort).toHaveAttribute('aria-pressed', 'true')
    await header.getByRole('textbox', { name: 'Filtrar Tipo', exact: true }).fill('fogo')
    await expect(page.locator('.move-list-row')).toHaveCount(1)
    await expect(page).toHaveURL(/filter.type=fogo/)
    await page.reload()
    await expect(header.getByRole('textbox', { name: 'Filtrar Tipo', exact: true })).toHaveValue('fogo')
    await expect(page.locator('.move-list-row')).toHaveCount(1)
    await expect(page.locator('.move-list-row')).toHaveAccessibleName(/Abrir detalhes de Golpe 45\./)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await header.screenshot({ path: testInfo.outputPath('compact-header-light.png') })
    await page.getByRole('button', { name: /tema escuro/i }).click()
    await expect(header.getByRole('textbox', { name: 'Filtrar Tipo', exact: true })).toBeVisible()
    await header.screenshot({ path: testInfo.outputPath('compact-header-dark.png') })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}
