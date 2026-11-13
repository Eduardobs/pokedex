import { describe, expect, it } from 'vitest'
import { FEATURED_POKEMON_MAX_ID } from '../config/app'
import { parseFeaturedPokemon, randomFeaturedPokemonId } from './featured-pokemon'

describe('random featured Pokémon', () => {
  it('can reach every national ID and excludes only the previous choice', () => {
    for (const previous of [null, 1, 525, FEATURED_POKEMON_MAX_ID]) {
      const count = FEATURED_POKEMON_MAX_ID - (previous === null ? 0 : 1)
      const ids = Array.from({ length: count }, (_, i) => randomFeaturedPokemonId(previous, (i + 0.5) / count))
      expect(new Set(ids).size).toBe(count)
      expect(ids).not.toContain(previous)
      expect(Math.min(...ids)).toBe(previous === 1 ? 2 : 1)
      expect(Math.max(...ids)).toBe(
        previous === FEATURED_POKEMON_MAX_ID ? FEATURED_POKEMON_MAX_ID - 1 : FEATURED_POKEMON_MAX_ID,
      )
    }
  })
  it.each([NaN, Infinity, -1, 0, 1, 2])('keeps unexpected random samples bounded: %s', (sample) => {
    expect(randomFeaturedPokemonId(null, sample)).toBeGreaterThanOrEqual(1)
    expect(randomFeaturedPokemonId(null, sample)).toBeLessThanOrEqual(FEATURED_POKEMON_MAX_ID)
  })
  it.each([0, -1, 1026, 1.5, NaN])('ignores an invalid stored ID: %s', (previous) => {
    expect(randomFeaturedPokemonId(previous, 0)).toBe(1)
  })
  it('keeps the routable API name and rejects malformed summaries', () => {
    expect(parseFeaturedPokemon({ id: 122, name: 'mr-mime', unused: true })).toEqual({ id: 122, name: 'mr-mime' })
    for (const value of [
      null,
      {},
      { id: 0, name: 'x' },
      { id: 1, name: '../x' },
      { id: 1, name: '' },
      { id: 1026, name: 'x' },
    ]) {
      expect(() => parseFeaturedPokemon(value)).toThrow()
    }
  })
})
