import { describe, expect, it } from 'vitest'
import { API_BASE } from './api'
import { isRelatedPokemonList, parseRelatedPokemonList } from './related-pokemon'

describe('related Pokémon lists', () => {
  it('recognizes direct species references and nested relation records', () => {
    expect(
      parseRelatedPokemonList([
        { name: 'bulbasaur', url: `${API_BASE}/pokemon-species/1/` },
        {
          entry_number: 25,
          pokemon_species: { name: 'pikachu', url: `${API_BASE}/pokemon-species/25/` },
        },
      ]),
    ).toEqual([
      { id: 1, name: 'bulbasaur', details: [] },
      { id: 25, name: 'pikachu', details: [{ key: 'entry_number', value: 25 }] },
    ])
  })

  it('does not specialize mixed, malformed, or untrusted arrays', () => {
    expect(isRelatedPokemonList([])).toBe(false)
    expect(
      isRelatedPokemonList([
        { name: 'bulbasaur', url: `${API_BASE}/pokemon-species/1/` },
        { name: 'not-a-pokemon', url: `${API_BASE}/ability/65/` },
      ]),
    ).toBe(false)
    expect(
      isRelatedPokemonList([{ name: 'unsafe', url: 'https://example.com/api/v2/pokemon/1/' }]),
    ).toBe(false)
  })
})
