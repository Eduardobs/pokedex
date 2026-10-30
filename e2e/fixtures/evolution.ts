import type { Page } from '@playwright/test'
import type { EvolutionDetail, EvolutionNode } from '../../src/types'

const api = 'https://pokeapi.co/api/v2'
const ref = (endpoint: string, name: string, id: number) => ({ name, url: `${api}/${endpoint}/${id}/` })
const method = (overrides: Partial<EvolutionDetail> = {}): EvolutionDetail => ({
  trigger: ref('evolution-trigger', 'level-up', 1),
  item: null,
  gender: null,
  held_item: null,
  known_move: null,
  known_move_type: null,
  location: null,
  min_level: null,
  min_happiness: null,
  min_beauty: null,
  min_affection: null,
  near_special_rock: false,
  needs_overworld_rain: false,
  party_species: null,
  party_type: null,
  relative_physical_stats: null,
  time_of_day: '',
  trade_species: null,
  turn_upside_down: false,
  ...overrides,
})
const item = (name: string, id: number) =>
  method({ trigger: ref('evolution-trigger', 'use-item', 3), item: ref('item', name, id) })
const node = (
  name: string,
  id: number,
  evolves_to: EvolutionNode[] = [],
  evolution_details: EvolutionDetail[] = [],
): EvolutionNode => ({ is_baby: false, species: ref('pokemon-species', name, id), evolves_to, evolution_details })

const families = [
  node('eevee', 133, [
    node('vaporeon', 134, [], [item('water-stone', 84)]),
    node('jolteon', 135, [], [item('thunder-stone', 83)]),
    node('flareon', 136, [], [item('fire-stone', 82)]),
    node('espeon', 196, [], [method({ min_happiness: 160, time_of_day: 'day' })]),
    node('umbreon', 197, [], [method({ min_happiness: 160, time_of_day: 'night' })]),
    node('leafeon', 470, [], [item('leaf-stone', 85), method({ location: ref('location', 'eterna-forest', 8) })]),
    node('glaceon', 471, [], [item('ice-stone', 885)]),
    node('sylveon', 700, [], [method({ known_move_type: ref('type', 'fairy', 18), min_affection: 2 })]),
  ]),
  node('oddish', 43, [
    node(
      'gloom',
      44,
      [node('vileplume', 45, [], [item('leaf-stone', 85)]), node('bellossom', 182, [], [item('sun-stone', 80)])],
      [method({ min_level: 21 })],
    ),
  ]),
  node('feebas', 349, [
    node(
      'milotic',
      350,
      [],
      [
        method({ min_beauty: 170 }),
        method({ trigger: ref('evolution-trigger', 'trade', 2), held_item: ref('item', 'prism-scale', 537) }),
      ],
    ),
  ]),
  node('burmy', 412, [
    node('wormadam', 413, [], [method({ min_level: 20, gender: 1 })]),
    node('mothim', 414, [], [method({ min_level: 20, gender: 2 })]),
  ]),
  node('ditto', 132),
]
function flatten(root: EvolutionNode): EvolutionNode[] {
  return [root, ...root.evolves_to.flatMap(flatten)]
}

export async function mockEvolutionFamilies(page: Page) {
  const members = families.flatMap((family, index) => flatten(family).map((entry) => ({ entry, family: index + 1 })))
  await page.route(`${api}/**`, async (route) => {
    const url = new URL(route.request().url())
    const [endpoint, identifier] = url.pathname.slice('/api/v2/'.length).split('/')
    if (endpoint === 'evolution-chain')
      return route.fulfill({
        json: { id: Number(identifier), baby_trigger_item: null, chain: families[Number(identifier) - 1] },
      })
    if (endpoint === 'type')
      return route.fulfill({
        json: {
          id: 1,
          name: identifier,
          damage_relations: { double_damage_from: [], half_damage_from: [], no_damage_from: [] },
        },
      })
    const member = members.find(
      ({ entry }) => entry.species.name === identifier || entry.species.url.endsWith(`/${identifier}/`),
    )
    if (endpoint === 'pokemon' && !identifier) return route.fulfill({ json: { count: 0, results: [] } })
    if (!member) return route.fulfill({ status: 404, json: {} })
    const { entry, family } = member
    const id = Number(entry.species.url.split('/').filter(Boolean).at(-1))
    if (endpoint === 'pokemon-species')
      return route.fulfill({
        json: {
          id,
          name: entry.species.name,
          evolution_chain: { url: `${api}/evolution-chain/${family}/` },
          flavor_text_entries: [
            { flavor_text: 'Uma família Pokémon com diferentes caminhos evolutivos.', language: { name: 'pt-br' } },
          ],
          genera: [],
          color: ref('pokemon-color', 'brown', 3),
          shape: ref('pokemon-shape', 'quadruped', 8),
          habitat: null,
          generation: ref('generation', 'generation-i', 1),
          growth_rate: ref('growth-rate', 'medium', 2),
          egg_groups: [],
          gender_rate: 4,
          capture_rate: 45,
          base_happiness: 50,
          hatch_counter: 10,
          varieties: [],
          is_baby: false,
          is_legendary: false,
          is_mythical: false,
        },
      })
    if (endpoint === 'pokemon')
      return route.fulfill({
        json: {
          id,
          name: entry.species.name,
          species: entry.species,
          height: 3,
          weight: 65,
          base_experience: 65,
          sprites: {
            front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
            front_shiny: null,
          },
          types: [{ slot: 1, type: ref('type', 'normal', 1) }],
          stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name, i) => ({
            base_stat: 50 + i * 5,
            effort: 0,
            stat: ref('stat', name, i + 1),
          })),
          abilities: [],
          moves: [],
          forms: [],
          game_indices: [],
          held_items: [],
          location_area_encounters: `${api}/pokemon/${id}/encounters`,
        },
      })
    return route.fulfill({ status: 404, json: {} })
  })
}
