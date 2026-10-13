import { expect, test } from '@playwright/test'

const ref = (name: string, endpoint = 'type', id = 1) => ({ name, url: `https://pokeapi.co/api/v2/${endpoint}/${id}/` })
test('compares moves through Explore and preserves both selections after reload', async ({ page }) => {
  const unexpected: string[] = []
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1)
    if (name === 'thunderbolt' || name === 'ember') {
      await route.fulfill({
        json: {
          name,
          type: ref(name === 'ember' ? 'fire' : 'electric'),
          damage_class: ref('special', 'move-damage-class'),
          power: name === 'ember' ? 40 : 90,
          accuracy: 100,
          pp: 15,
          priority: 0,
          past_values: [],
        },
      })
    } else {
      unexpected.push(route.request().url())
      await route.fulfill({ status: 404, json: {} })
    }
  })
  await page.goto('/#/explore')
  await page.getByRole('link', { name: 'Comparar golpes' }).click()
  await page.getByRole('textbox', { name: 'Primeiro golpe' }).fill('thunderbolt')
  await page.getByRole('textbox', { name: 'Primeiro golpe' }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Thunderbolt' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Segundo golpe' }).fill('ember')
  await page.getByRole('textbox', { name: 'Segundo golpe' }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Ember' })).toBeVisible()
  await expect(page).toHaveURL(/left=thunderbolt&right=ember/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Thunderbolt' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ember' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('textbox', { name: 'Segundo golpe' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(unexpected).toEqual([])
})

test('shares historical type selection and updates the calculator with the chart', async ({ page }) => {
  await page.route('https://pokeapi.co/api/v2/type/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1)!
    const relations = { no_damage_to: [], half_damage_to: [], double_damage_to: [] }
    await route.fulfill({
      json: {
        name,
        generation: ref('generation-i', 'generation', name === 'fairy' ? 6 : 1),
        damage_relations: relations,
        past_damage_relations:
          name === 'ghost'
            ? [
                {
                  generation: ref('generation-v', 'generation', 5),
                  damage_relations: { ...relations, half_damage_to: [{ name: 'steel' }] },
                },
              ]
            : [],
      },
    })
  })
  await page.goto('/#/types-table')
  await page.getByRole('combobox', { name: 'Geração' }).click()
  await page.getByRole('option', { name: 'Geração 5', exact: true }).click()
  await expect(page).toHaveURL(/generation=5/)
  await page.getByRole('button', { name: 'Fantasma → Metal: Dano ½×' }).click()
  await expect(page.getByRole('status')).toContainText('0,5×')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Geração' })).toContainText('Geração 5')
  await expect(page.getByRole('button', { name: 'Fantasma → Metal: Dano ½×' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Fada →/ })).toHaveCount(0)
})
