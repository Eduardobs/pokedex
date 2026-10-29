import { expect, test } from '@playwright/test'

const api = 'https://pokeapi.co/api/v2'
const ref = (resource: string, name: string, id: number) => ({ name, url: `${api}/${resource}/${id}/` })

for (const width of [320, 1440]) {
  test(`reads and paginates structured Explore records at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route(`${api}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/v2/move/thunderbolt') {
        await route.fulfill({
          json: {
            id: 85,
            name: 'thunderbolt',
            names: [],
            power: 90,
            accuracy: 100,
            pp: 15,
            priority: 0,
            type: ref('type', 'electric', 13),
            damage_class: ref('move-damage-class', 'special', 3),
            stat_changes: Array.from({ length: 8 }, (_, index) => ({
              change: index + 1,
              stat: ref('stat', 'special-attack', 4),
            })),
            learned_by_pokemon: [ref('pokemon', 'pikachu', 25)],
            past_values: [{ power: 80 }],
          },
        })
      } else if (path === '/api/v2/location-area/forest') {
        await route.fulfill({
          json: {
            id: 1,
            name: 'forest',
            game_index: 5,
            pokemon_encounters: [
              {
                pokemon: ref('pokemon', 'pikachu', 25),
                version_details: [
                  {
                    version: ref('version', 'red', 1),
                    max_chance: 20,
                    encounter_details: [
                      { chance: 20, min_level: 2, max_level: 4, method: ref('encounter-method', 'walk', 1) },
                    ],
                  },
                ],
              },
            ],
          },
        })
      } else await route.fulfill({ status: 404, json: {} })
    })
    await page.goto('/#/explore/move/thunderbolt')
    await expect(page.getByRole('heading', { name: 'Resumo', exact: true })).toBeVisible()
    const sectionNavigation = page.getByRole('navigation', { name: 'Seções deste registro' })
    await sectionNavigation.getByRole('button', { name: /Relações e coleções/ }).click()
    await expect(page.getByRole('heading', { name: 'Relações e coleções', exact: true })).toBeFocused()
    const table = page.getByRole('table', { name: 'Alterações de atributos' })
    await expect(table.getByRole('cell', { name: '6', exact: true })).toBeVisible()
    const records = page.locator('article').filter({ has: table })
    await records.getByRole('button', { name: 'Próxima', exact: true }).click()
    await expect(table.getByRole('cell', { name: '8', exact: true })).toBeVisible()
    await expect(records).toContainText('7–8 de 8')
    await expect(page.getByRole('img', { name: 'Pikachu' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `/tmp/atlas-explore-move-${width}.png`, fullPage: true, animations: 'disabled' })
    await page.goto('/#/explore/location-area/forest')
    await page.getByText('Detalhes desta relação', { exact: true }).click()
    await expect(page.getByText('Chance máxima', { exact: true })).toBeVisible()
    await page.getByText(/Explorar estrutura/).click()
    await expect(page.getByText('Nível mínimo', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: /tema escuro/i }).click()
    await expect(page.getByText('Nível mínimo', { exact: true })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: `/tmp/atlas-explore-structured-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  })
}
