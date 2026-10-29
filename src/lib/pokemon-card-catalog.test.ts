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
  it('loads and caches Pokédex cards through REST without requesting GraphQL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      expect(url).toMatch(/^https:\/\/pokeapi.co\/api\/v2\/pokemon\//)
      const pokemon = pokemonPayload.data.pokemon.find((entry) => url.endsWith(`/${entry.name}`))!
      return Response.json({ ...pokemon, types: pokemon.pokemontypes })
    })
    const { fetchPokemonCardDetails } = await import('./pokemon-card-catalog')
    const details = await fetchPokemonCardDetails(['pikachu', 'bulbasaur'], 'pokemon')
    expect(details.pikachu.types[0].type.name).toBe('electric')
    expect(details.bulbasaur.types).toHaveLength(2)
    await fetchPokemonCardDetails(['pikachu', 'bulbasaur'], 'pokemon')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('loads the routable Pokémon for a REST form fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('graphql.pokeapi.co')) return new Response('{}', { status: 404 })
      return Response.json(
        url.includes('pokemon-form/')
          ? { name: 'pikachu-rock-star', is_battle_only: false, pokemon: { name: 'pikachu-rock-star' } }
          : { id: 10080, name: 'pikachu-rock-star', types: [{ slot: 1, type: { name: 'electric' } }] },
      )
    })
    const { fetchPokemonCardDetails } = await import('./pokemon-card-catalog')
    await expect(fetchPokemonCardDetails(['pikachu-rock-star'], 'form')).resolves.toMatchObject({
      'pikachu-rock-star': { id: 10080, name: 'pikachu-rock-star', isBattleOnly: false },
    })
  })

  it('rejects malformed REST fallback data without caching card details', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) =>
        String(input).includes('graphql.pokeapi.co')
          ? new Response('{}', { status: 404 })
          : Response.json({ id: 25, name: 'pikachu', types: [] }),
      )
    const { fetchPokemonCardDetails } = await import('./pokemon-card-catalog')
    await expect(fetchPokemonCardDetails(['pikachu'], 'pokemon')).rejects.toMatchObject({ code: 'invalid-response' })
    await expect(fetchPokemonCardDetails(['pikachu'], 'pokemon')).rejects.toMatchObject({ code: 'invalid-response' })
    expect(
      fetchMock.mock.calls.every(([input]) => String(input).startsWith('https://pokeapi.co/api/v2/pokemon/')),
    ).toBe(true)
  })

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
