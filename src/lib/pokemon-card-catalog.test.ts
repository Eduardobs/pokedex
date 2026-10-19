import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client'
import { parsePokemonCardDetails } from './pokemon-card-catalog'

const pokemonPayload = {
  data: {
    pokemon: [
      {
        id: 25,
        name: 'pikachu',
        pokemontypes: [{ slot: 1, type: { name: 'electric' } }],
      },
      {
        id: 1,
        name: 'bulbasaur',
        pokemontypes: [
          { slot: 1, type: { name: 'grass' } },
          { slot: 2, type: { name: 'poison' } },
        ],
      },
    ],
  },
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('Pokémon card catalog', () => {
  it('maps a bounded Pokémon batch to the card model', () => {
    expect(parsePokemonCardDetails(pokemonPayload, ['bulbasaur', 'pikachu'], 'pokemon')).toEqual({
      bulbasaur: {
        id: 1,
        name: 'bulbasaur',
        types: [
          { slot: 1, type: { name: 'grass', url: '' } },
          { slot: 2, type: { name: 'poison', url: '' } },
        ],
        isBattleOnly: false,
      },
      pikachu: {
        id: 25,
        name: 'pikachu',
        types: [{ slot: 1, type: { name: 'electric', url: '' } }],
        isBattleOnly: false,
      },
    })
  })

  it('maps form identity, types, and battle-only status', () => {
    expect(
      parsePokemonCardDetails(
        {
          data: {
            pokemonform: [
              {
                name: 'charizard-mega-x',
                is_battle_only: true,
                pokemon: {
                  id: 10034,
                  name: 'charizard-mega-x',
                  pokemontypes: [
                    { slot: 1, type: { name: 'fire' } },
                    { slot: 2, type: { name: 'dragon' } },
                  ],
                },
              },
            ],
          },
        },
        ['charizard-mega-x'],
        'form',
      ),
    ).toMatchObject({
      'charizard-mega-x': { id: 10034, name: 'charizard-mega-x', isBattleOnly: true },
    })
  })

  it('rejects incomplete, duplicate, and malformed batches', () => {
    expect(() => parsePokemonCardDetails({ data: { pokemon: [] } }, ['pikachu'], 'pokemon')).toThrow(ApiError)
    expect(() =>
      parsePokemonCardDetails(
        { data: { pokemon: [pokemonPayload.data.pokemon[0], pokemonPayload.data.pokemon[0]] } },
        ['pikachu', 'bulbasaur'],
        'pokemon',
      ),
    ).toThrow(ApiError)
    expect(() =>
      parsePokemonCardDetails(
        {
          data: {
            pokemon: [{ ...pokemonPayload.data.pokemon[0], pokemontypes: [{ slot: 1, type: { name: '__proto__' } }] }],
          },
        },
        ['pikachu'],
        'pokemon',
      ),
    ).toThrow(ApiError)
  })

  it('replaces per-card REST fan-out with one field-limited request and caches it', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(pokemonPayload), { headers: { 'content-type': 'application/json' } }),
      )
    const { fetchPokemonCardDetails } = await import('./pokemon-card-catalog')

    const first = await fetchPokemonCardDetails(['pikachu', 'bulbasaur'], 'pokemon')
    const second = await fetchPokemonCardDetails(['bulbasaur', 'pikachu'], 'pokemon')

    expect(first).toEqual(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toMatchObject({
      operationName: 'PokemonCardDetails',
      variables: { names: ['bulbasaur', 'pikachu'] },
    })
    expect(body.query).toContain('pokemontypes')
    expect(body.query).not.toContain('pokemonsprites')
  })

  it('rejects more than one rendered batch', async () => {
    const { fetchPokemonCardDetails } = await import('./pokemon-card-catalog')
    expect(() =>
      fetchPokemonCardDetails(
        Array.from({ length: 33 }, (_, index) => `pokemon-${index + 1}`),
        'pokemon',
      ),
    ).toThrow('The requested card batch is invalid.')
  })
})
