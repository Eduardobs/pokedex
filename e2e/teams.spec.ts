import { expect, test } from '@playwright/test'

test('creates multiple teams, edits a member and preserves it after reload', async ({ page }) => {
  const ref = (name: string, resource: string) => ({ name, url: `https://pokeapi.co/api/v2/${resource}/1/` })
  await page.route('https://pokeapi.co/api/v2/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v2/', '')
    const pokemon = {
      name: 'pikachu',
      id: 25,
      species: ref('pikachu', 'pokemon-species'),
      types: [{ type: ref('electric', 'type') }],
      abilities: [{ ability: ref('static', 'ability') }],
      moves: [
        { move: ref('thunderbolt', 'move') },
        ...Array.from({ length: 8 }, (_, index) => ({ move: ref(`test-move-${index + 1}`, 'move') })),
      ],
      stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name, i) => ({
        stat: ref(name, 'stat'),
        base_stat: [35, 55, 40, 50, 50, 90][i],
      })),
    }
    const payload =
      path === 'pokemon'
        ? { results: [ref('pikachu', 'pokemon')] }
        : path === 'pokemon/pikachu'
          ? pokemon
          : path === 'pokemon-species/pikachu'
            ? { id: 25, gender_rate: 4 }
            : path === 'item'
              ? {
                  results: [
                    ref('choice-scarf', 'item'),
                    ...Array.from({ length: 8 }, (_, index) => ref(`test-item-${index + 1}`, 'item')),
                    ref('choice-scarf', 'item'),
                  ],
                }
              : path === 'ability/static'
                ? { names: [], effect_entries: [] }
                : path.startsWith('item/')
                  ? {
                      name: path.split('/')[1],
                      sprites: {
                        default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${path.split('/')[1]}.png`,
                      },
                      names: [],
                      effect_entries: [{ short_effect: 'Changes a battle stat.', language: ref('en', 'language') }],
                      flavor_text_entries: [],
                    }
                  : path === 'move/thunderbolt' || path.startsWith('move/test-move-')
                    ? {
                        name: path.split('/')[1],
                        type: ref('electric', 'type'),
                        damage_class: ref('special', 'move-damage-class'),
                        power: 90,
                        accuracy: 100,
                        pp: 15,
                        priority: 0,
                      }
                    : null
    await route.fulfill({ status: payload ? 200 : 404, json: payload ?? {} })
  })
  await page.goto('/#/teams')
  await page.getByRole('button', { name: 'Nova equipe' }).click()
  await page.getByLabel('Nome da equipe').fill('Kanto')
  await page.getByRole('textbox', { name: 'Nome original ou número do Pokémon' }).fill('pikachu')
  await page.getByRole('button', { name: 'Pikachu', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar Pikachu' }).click()
  await expect(page.getByRole('heading', { name: 'Pikachu', exact: true })).toBeVisible()
  await page.getByLabel('Nível', { exact: true }).fill('50')
  await page.getByLabel('Shiny', { exact: true }).check()
  await page.getByText('Feminino', { exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Feminino' }).locator('xpath=..').locator('svg')).toBeVisible()
  await page.getByRole('combobox', { name: 'Tipo Tera' }).click()
  const fireType = page.getByRole('option', { name: 'Fogo' })
  await expect(fireType.locator('use')).toHaveAttribute('href', /#type-fire$/)
  await fireType.click()
  const teamControls = page.locator('.team-toolbar > .catalog-select, .team-toolbar > label, .team-toolbar > button')
  const controlBoxes = await teamControls.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().bottom),
  )
  expect(Math.max(...controlBoxes) - Math.min(...controlBoxes)).toBeLessThanOrEqual(2)
  const tabImage = page.getByRole('tab', { name: 'Pikachu' }).locator('img')
  await expect(tabImage).toHaveAttribute('src', /\/other\/home\/shiny\/25\.png$/)
  await page.getByRole('button', { name: 'Item equipado' }).click()
  const choiceScarf = page.getByRole('option', { name: /Choice Scarf/ })
  await expect(choiceScarf).toContainText('Changes a battle stat.')
  await expect(choiceScarf.locator('img')).toBeVisible()
  await page.getByRole('button', { name: 'Carregar mais itens' }).click()
  await expect(page.getByRole('option', { name: /Test Item 8/ })).toBeVisible()
  await choiceScarf.click()
  await page.getByRole('button', { name: 'Golpe 1', exact: true }).click()
  await page.getByRole('button', { name: 'Carregar mais golpes' }).click()
  await expect(page.getByRole('option', { name: /Test Move 8/ })).toBeVisible()
  const moveOption = page.getByRole('option', { name: /Thunderbolt/ })
  await expect(moveOption).toContainText('90')
  await expect(moveOption).toContainText('100')
  await expect(moveOption).toContainText('15')
  await moveOption.click()
  await expect(page.getByText('Thunderbolt', { exact: true }).last()).toBeVisible()
  await page.getByRole('slider').first().fill('252')
  await page.getByLabel('IV HP').fill('12')
  await page.getByRole('button', { name: 'Limpar' }).click()
  await expect(page.getByRole('slider').first()).toHaveValue('0')
  await expect(page.getByLabel('IV HP')).toHaveValue('31')
  await page.getByRole('slider').first().fill('252')
  await page.getByRole('combobox', { name: 'Regras competitivas' }).click()
  await page.getByRole('option', { name: /Duplas 4×4/ }).click()
  await page.reload()
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Kanto')
  await expect(page.getByLabel('Nível', { exact: true })).toHaveValue('50')
  await expect(page.getByLabel('Shiny', { exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Feminino' })).toBeChecked()
  await expect(page.getByRole('combobox', { name: 'Tipo Tera' })).toContainText('Fogo')
  await expect(page.getByRole('combobox', { name: 'Regras competitivas' })).toContainText('Duplas 4×4')
  await expect(page.getByRole('button', { name: 'Item equipado' })).toContainText('Choice Scarf')
  await expect(page.getByRole('button', { name: 'Golpe 1', exact: true })).toContainText('Thunderbolt')
  await expect(page.getByRole('slider').first()).toHaveValue('252')
  await page.getByRole('button', { name: 'Nova equipe' }).click()
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Equipe 2')
  await page.getByRole('button', { name: 'Excluir equipe' }).click()
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Kanto')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Pikachu', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Golpe 1', exact: true }).click()
  await expect(page.getByRole('option', { name: /Thunderbolt/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
