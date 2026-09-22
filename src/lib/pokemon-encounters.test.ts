import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { encountersForVersion, encounterVersions, parsePokemonEncounters } from './pokemon-encounters'

const resource = (endpoint: string, id: number, name: string) => ({ name, url: `https://pokeapi.co/api/v2/${endpoint}/${id}/` })

const payload = [
  {
    location_area: resource('location-area', 2, 'viridian-forest-area'),
    version_details: [
      {
        version: resource('version', 2, 'blue'),
        max_chance: 20,
        encounter_details: [{ min_level: 3, max_level: 5, chance: 10, method: resource('encounter-method', 1, 'walk'), condition_values: [] }],
      },
      {
        version: resource('version', 1, 'red'),
        max_chance: 15,
        encounter_details: [{ min_level: 3, max_level: 3, chance: 5, method: resource('encounter-method', 1, 'walk'), condition_values: [resource('encounter-condition-value', 4, 'time-night')] }],
      },
    ],
  },
]

describe('parsePokemonEncounters', () => {
  it('valida os detalhes documentados e descarta campos desconhecidos', () => {
    const highAggregateChance = structuredClone(payload[0])
    highAggregateChance.version_details[0].max_chance = 870
    const encounters = parsePokemonEncounters([{ ...highAggregateChance, ignored: 'remote extension' }])

    expect(encounters[0].version_details[0].max_chance).toBe(870)
    expect(encounters[0].version_details[0].encounter_details[0]).toEqual({
      min_level: 3,
      max_level: 5,
      chance: 10,
      method: resource('encounter-method', 1, 'walk'),
      condition_values: [],
    })
  })

  it('rejeita níveis incoerentes e referências fora da origem permitida', () => {
    const invalidLevel = structuredClone(payload)
    invalidLevel[0].version_details[0].encounter_details[0].max_level = 2
    expect(() => parsePokemonEncounters(invalidLevel)).toThrow(ApiError)

    const unsafeUrl = structuredClone(payload)
    unsafeUrl[0].location_area.url = 'https://example.com/location-area/2/'
    expect(() => parsePokemonEncounters(unsafeUrl)).toThrow(ApiError)

    expect(() => parsePokemonEncounters(Array.from({ length: 2_049 }, () => payload[0]))).toThrow(ApiError)
  })
})

describe('encounter selectors', () => {
  it('ordena versões pelo identificador da API e filtra áreas sem perder os detalhes', () => {
    const encounters = parsePokemonEncounters(payload)

    expect(encounterVersions(encounters).map(({ name }) => name)).toEqual(['red', 'blue'])
    expect(encountersForVersion(encounters, 'red')).toEqual([{
      location_area: resource('location-area', 2, 'viridian-forest-area'),
      ...encounters[0].version_details[1],
    }])
    expect(encountersForVersion(encounters, 'yellow')).toEqual([])
  })

  it('não trata relançamentos japoneses com IDs novos como versões recentes', () => {
    const encounters = parsePokemonEncounters([{
      location_area: resource('location-area', 2, 'viridian-forest-area'),
      version_details: [
        { ...payload[0].version_details[0], version: resource('version', 46, 'blue-japan') },
        { ...payload[0].version_details[0], version: resource('version', 3, 'yellow') },
      ],
    }])

    expect(encounterVersions(encounters).map(({ name }) => name)).toEqual(['blue-japan', 'yellow'])
  })
})
