import type { Page } from '@playwright/test'
import sets from '../../src/data/third-party/pokemon-showdown-gen9-random-battle-sets.json' with { type: 'json' }
import { STORAGE_KEYS } from '../../src/config/app'

export async function prepareMobileBattle(page: Page) {
  const names = ['venusaur', 'charizard', 'blastoise', 'pikachu', 'snorlax', 'gengar'] as const
  const types = ['grass', 'fire', 'water', 'electric', 'normal', 'ghost']
  const id = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const ref = (name: string, resource: string) => ({ name, url: `https://pokeapi.co/api/v2/${resource}/${name}/` })
  await page.addInitScript(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify([
          {
            id: 'mobile-team',
            name: 'Mobile team',
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
              item: 'leftovers',
              moves: ['thunderbolt', 'quick-attack', 'growl', 'thunder-wave'],
              evs: [0, 0, 0, 0, 0, 0],
              ivs: [31, 31, 31, 31, 31, 31],
              abilityActive: false,
              itemActive: false,
            })),
          },
        ]),
      ),
    { key: STORAGE_KEYS.teams },
  )
  await page.route('https://pokeapi.co/**', async (route) => {
    const [resource, name] = new URL(route.request().url()).pathname.replace('/api/v2/', '').split('/')
    if (resource === 'pokemon' && !name) {
      await route.fulfill({
        json: { results: names.map((name, i) => ({ name, url: `https://pokeapi.co/api/v2/pokemon/${i + 1}/` })) },
      })
    } else if (resource === 'pokemon' && names.includes(name as (typeof names)[number])) {
      const index = names.indexOf(name as (typeof names)[number])
      const entries = sets[name as (typeof names)[number]].sets
      await route.fulfill({
        json: {
          id: index + 1,
          name,
          species: ref(name, 'pokemon-species'),
          stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name) => ({
            base_stat: 100,
            stat: ref(name, 'stat'),
          })),
          types: [{ type: ref(types[index], 'type') }],
          abilities: [...new Set(['static', ...entries.flatMap((set) => set.abilities.map(id))])].map((name) => ({
            ability: ref(name, 'ability'),
          })),
          moves: [
            ...new Set([
              'thunderbolt',
              'quick-attack',
              'growl',
              'thunder-wave',
              ...entries.flatMap((set) => set.movepool.map(id)),
            ]),
          ].map((name) => ({ move: ref(name, 'move') })),
        },
      })
    } else if (resource === 'pokemon-species') {
      await route.fulfill({ json: { id: 1, gender_rate: 4 } })
    } else if (resource === 'move') {
      await route.fulfill({
        json: {
          name,
          type: ref('electric', 'type'),
          damage_class: ref('special', 'move-damage-class'),
          power: 90,
          accuracy: 100,
          pp: 15,
          priority: 0,
          target: ref('selected-pokemon', 'move-target'),
          flavor_text_entries: [
            {
              language: ref('pt-br', 'language'),
              flavor_text: 'Descrição completa do movimento para consultar antes de agir. '.repeat(12),
            },
          ],
        },
      })
    } else if (resource === 'ability' || resource === 'item') {
      await route.fulfill({
        json: {
          name,
          effect_entries: [
            {
              language: ref('pt-br', 'language'),
              effect: 'Descrição completa da habilidade ou item, sem truncamento. '.repeat(8),
            },
          ],
        },
      })
    } else {
      throw new Error(`Unexpected battle request: ${route.request().url()}`)
    }
  })
  await page.goto('/#/battle')
  await page.getByRole('button', { name: 'Iniciar batalha' }).click()
}
