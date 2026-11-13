import { describe, expect, it } from 'vitest'
import { parseEvolutionPokemon } from './evolution-pokemon'

describe('parseEvolutionPokemon', () => {
  it('orders type badges by their API slot', () => {
    const parsed = parseEvolutionPokemon({
      id: 10168,
      types: [
        { slot: 2, type: { name: 'psychic' } },
        { slot: 1, type: { name: 'ice' } },
      ],
    })
    expect(parsed.id).toBe(10168)
    expect(parsed.types.map(({ type }) => type.name)).toEqual(['ice', 'psychic'])
  })
  it.each([
    null,
    { id: -1, types: [] },
    { id: 122 },
    {
      id: 122,
      types: [
        { slot: 1, type: { name: 'ice' } },
        { slot: 1, type: { name: 'psychic' } },
      ],
    },
  ])('rejects incomplete or invalid Pokémon data: %j', (value) => {
    expect(() => parseEvolutionPokemon(value)).toThrow()
  })
})
