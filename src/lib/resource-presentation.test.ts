import { describe, expect, it } from 'vitest'
import { groupResourceEntries, resourceRecordColumns } from './resource-presentation'

const ref = (name: string) => ({ name, url: `https://pokeapi.co/api/v2/type/${name}/` })

describe('resource presentation', () => {
  it('separates move metrics, rules, related Pokemon and historical values', () => {
    const fields = groupResourceEntries('move', {
      id: 1,
      name: 'pound',
      pp: 35,
      power: 40,
      type: ref('normal'),
      meta: { crit_rate: 0 },
      learned_by_pokemon: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }],
      past_values: [{ power: 35 }],
      effect_entries: [],
    })
    expect(fields.summary.map(([key]) => key)).toEqual(['type', 'power', 'pp'])
    expect(fields.details.map(([key]) => key)).toEqual(['meta'])
    expect(fields.collections.map(([key]) => key)).toEqual(['learned_by_pokemon'])
    expect(fields.technical.map(([key]) => key)).toEqual(['past_values'])
  })

  it('keeps unfamiliar resource fields available and avoids duplicating specialized tools', () => {
    const fields = groupResourceEntries('location-area', {
      game_index: 5,
      location: ref('kanto'),
      encounter_method_rates: [],
      unknown_rules: { rule: true },
    })
    expect(
      Object.values(fields)
        .flat()
        .map(([key]) => key),
    ).toEqual(['game_index', 'location', 'unknown_rules', 'encounter_method_rates'])
    expect(groupResourceEntries('item', { prices: [], cost: 100 }).details).toEqual([['cost', 100]])
  })

  it('uses comparable flat records as columns, while leaving nested records and reference lists to their own views', () => {
    expect(
      resourceRecordColumns([
        { version: ref('red'), rate: 10 },
        { version: ref('blue'), rate: 20 },
      ]),
    ).toEqual(['version', 'rate'])
    expect(resourceRecordColumns([ref('fire'), ref('water')])).toBeNull()
    expect(resourceRecordColumns([{ encounter: { rates: [1] } }, { encounter: { rates: [2] } }])).toBeNull()
  })
})
