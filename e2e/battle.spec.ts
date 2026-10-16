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
  await page.addInitScript(({ key, team }) => localStorage.setItem(key, JSON.stringify([team])), {
    key: STORAGE_KEYS.teams,
    team,
  })
  await page.route('https://pokeapi.co/**', (route) => route.fulfill({ status: 503, json: {} }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/battle')
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
