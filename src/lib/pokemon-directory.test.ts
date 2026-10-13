import { describe, expect, it } from 'vitest'
import { filterPokemonCatalogMetadata, pokemonSearchSuggestions } from './pokemon-directory'

const pokemon = [
  { id: 6, name: 'charizard-mega-x' },
  { id: 12, name: 'butterfree-gmax' },
  { id: 26, name: 'raichu-alola' },
]

describe('filterPokemonCatalogMetadata', () => {
  it('combines region and rarity filters without discarding the original entries', () => {
    expect(
      filterPokemonCatalogMetadata(pokemon, {
        region: 'kanto',
        regionDetails: {
          'charizard-mega-x': 'kanto',
          'butterfree-gmax': 'kanto',
          'raichu-alola': 'alola',
        },
        legendary: true,
        mythical: false,
        baby: false,
        rarityDetails: {
          'charizard-mega-x': { isLegendary: true, isMythical: false, isBaby: false },
          'butterfree-gmax': { isLegendary: false, isMythical: false, isBaby: false },
        },
      }),
    ).toEqual([pokemon[0]])
    expect(pokemon).toHaveLength(3)
  })

  it('combines baby and legendary selections while intersecting the region', () => {
    const entries = [{ name: 'pichu' }, { name: 'cleffa' }, { name: 'raikou' }, { name: 'pikachu' }]
    const filters = {
      region: 'johto' as const,
      regionDetails: { pichu: 'johto' as const, cleffa: 'johto' as const, raikou: 'johto' as const },
      legendary: false,
      mythical: false,
      baby: true,
      rarityDetails: {
        pichu: { isLegendary: false, isMythical: false, isBaby: true },
        cleffa: { isLegendary: false, isMythical: false, isBaby: true },
        raikou: { isLegendary: true, isMythical: false, isBaby: false },
      },
    }
    expect(filterPokemonCatalogMetadata(entries, filters)).toEqual(entries.slice(0, 2))
    expect(filterPokemonCatalogMetadata(entries, { ...filters, legendary: true })).toEqual(entries.slice(0, 3))
    expect(filterPokemonCatalogMetadata(entries, { ...filters, region: 'kanto' })).toEqual([])
    expect(filterPokemonCatalogMetadata(entries, { ...filters, rarityDetails: null })).toEqual([])
  })

  it('returns no speculative matches while required metadata is unavailable', () => {
    expect(
      filterPokemonCatalogMetadata(pokemon, {
        region: 'kanto',
        regionDetails: null,
        legendary: false,
        mythical: false,
        baby: false,
        rarityDetails: null,
      }),
    ).toEqual([])
  })
})

describe('pokemonSearchSuggestions', () => {
  it('matches alternate labels, prioritizes names that start with the query and applies a limit', () => {
    expect(
      pokemonSearchSuggestions(
        pokemon,
        'raI',
        (entry) => [entry.name, entry.name === 'charizard-mega-x' ? 'Raio X' : ''],
        2,
      ).map(({ name }) => name),
    ).toEqual(['raichu-alola', 'charizard-mega-x'])
  })

  it('does not suggest entries for empty or numeric-only queries', () => {
    expect(pokemonSearchSuggestions(pokemon, '')).toEqual([])
    expect(pokemonSearchSuggestions(pokemon, '26')).toEqual([])
  })
})
