import { expect, test } from '@playwright/test'
import { STORAGE_KEYS } from '../src/config/app'
import type { Team } from '../src/lib/teams'

test('selects battle difficulty with the keyboard before starting on mobile', async ({ page }) => {
  const team: Team = {
    id: 'battle-team',
    name: 'Battle team',
    competitiveFormat: 'singles-6v6',
    members: Array.from({ length: 6 }, (_, index) => ({
      id: `member-${index}`,
      pokemon: 'pikachu',
      level: 100,
      friendship: 255,
      shiny: false,
      gender: 'male',
      tera: 'electric',
      ability: 'static',
      nature: 'hardy',
      item: '',
      moves: ['thunderbolt', 'quick-attack', 'growl', 'thunder-wave'],
      evs: [0, 0, 0, 0, 0, 0],
      ivs: [31, 31, 31, 31, 31, 31],
      abilityActive: false,
      itemActive: false,
    })),
  }
  await page.addInitScript(
    ({ key, team }) =>
      localStorage.setItem(key, JSON.stringify([team, { ...team, id: 'second', name: 'Second team' }])),
    {
      key: STORAGE_KEYS.teams,
      team,
    },
  )
  await page.route('https://pokeapi.co/**', (route) => route.fulfill({ status: 503, json: {} }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/battle')
  const teamSelector = page.getByRole('combobox', { name: 'Sua equipe' })
  await teamSelector.focus()
  await teamSelector.press('ArrowDown')
  await expect(page.getByRole('option', { name: /Battle team/ })).toBeFocused()
  await page.getByRole('option', { name: /Battle team/ }).press('End')
  const secondTeam = page.getByRole('option', { name: /Second team/ })
  await expect(secondTeam).toBeFocused()
  await expect(secondTeam.getByRole('img', { name: 'Pikachu' })).toHaveCount(6)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await secondTeam.press('Enter')
  await expect(teamSelector).toContainText('Second team')
  await expect(teamSelector.getByRole('img', { name: 'Pikachu' })).toHaveCount(6)
  await expect(teamSelector).toBeFocused()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  const difficulty = page.getByRole('combobox', { name: 'Dificuldade' })
  await expect(difficulty).toHaveValue('medium')
  await expect(difficulty.getByRole('option')).toHaveCount(6)
  await difficulty.focus()
  await difficulty.press('End')
  await difficulty.press('Tab')
  await expect(difficulty).toHaveValue('expert')
  await expect(difficulty).toHaveAccessibleDescription(/Pokémon já revelados/)
  await expect(page.getByRole('button', { name: 'Iniciar batalha' })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('opens battle preparation with the team selected in the editor', async ({ page }) => {
  await page.addInitScript(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify(
          ['first', 'second'].map((id) => ({
            id,
            name: id,
            competitiveFormat: 'singles-6v6',
            members: Array.from({ length: 6 }, (_, index) => ({
              id: `${id}-${index}`,
              pokemon: 'pikachu',
              level: 100,
              friendship: 255,
              shiny: false,
              gender: 'male',
              tera: 'electric',
              ability: 'static',
              nature: 'hardy',
              item: '',
              moves: ['thunderbolt', 'quick-attack', 'growl', 'thunder-wave'],
              evs: [0, 0, 0, 0, 0, 0],
              ivs: [31, 31, 31, 31, 31, 31],
              abilityActive: false,
              itemActive: false,
            })),
          })),
        ),
      ),
    { key: STORAGE_KEYS.teams },
  )
  await page.route('https://pokeapi.co/**', (route) => route.fulfill({ status: 503, json: {} }))
  await page.goto('/#/teams')
  await page.getByRole('combobox', { name: 'Selecionar equipe' }).click()
  await page.getByRole('option', { name: 'second', exact: true }).click()
  await page.getByRole('button', { name: 'Batalhar com esta equipe' }).click()
  await expect(page).toHaveURL(/battle\?team=second/)
  await expect(page.getByRole('combobox', { name: 'Sua equipe' })).toContainText('second')
  const difficulty = page.getByRole('combobox', { name: 'Dificuldade' })
  await expect(difficulty.getByRole('option')).toHaveCount(6)
  await difficulty.selectOption('expert')
  await expect(difficulty).toHaveValue('expert')
})
