import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client'
import { parsePokemonRarityDetails, parsePokemonRegionDetails, parsePokemonSortDetails } from './pokemon-catalog'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

describe('Pokédex stat catalog', () => {
  const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name, index) => ({
    base_stat: 50 + index,
    stat: { name },
  }))

  it('keeps only the fields required for sorting', () => {
    expect(
      parsePokemonSortDetails({
        data: {
          pokemon: [
            {
              name: 'pikachu',
              pokemonstats: stats,
              ignored: 'value',
            },
          ],
        },
      }),
    ).toEqual({
      pikachu: {
        stats: stats.map(({ base_stat, stat }) => ({
          base_stat,
          effort: 0,
          stat: { ...stat, url: '' },
        })),
      },
    })
  })

  it('rejects unexpected names and stats', () => {
    expect(() => parsePokemonSortDetails({ data: { pokemon: [{ name: '__proto__', pokemonstats: stats }] } })).toThrow(
      ApiError,
    )
    expect(() =>
      parsePokemonSortDetails({
        data: {
          pokemon: [
            {
              name: 'pikachu',
              pokemonstats: stats.map((stat, index) => (index ? stat : { ...stat, base_stat: -1 })),
            },
          ],
        },
      }),
    ).toThrow(ApiError)
    expect(() =>
      parsePokemonSortDetails({
        errors: [{ message: 'partial response' }],
        data: { pokemon: [{ name: 'pikachu', pokemonstats: stats }] },
      }),
    ).toThrow(ApiError)
  })

  it('rejects empty catalogs, duplicate Pokémon, and duplicate stats', () => {
    expect(() => parsePokemonSortDetails({ data: { pokemon: [] } })).toThrow(ApiError)
    expect(() =>
      parsePokemonSortDetails({
        data: {
          pokemon: [
            { name: 'pikachu', pokemonstats: stats },
            { name: 'pikachu', pokemonstats: stats },
          ],
        },
      }),
    ).toThrow(ApiError)
    expect(() =>
      parsePokemonSortDetails({
        data: {
          pokemon: [
            {
              name: 'pikachu',
              pokemonstats: stats.map((stat, index) => (index === 1 ? stats[0] : stat)),
            },
          ],
        },
      }),
    ).toThrow(ApiError)
  })

  it('fetches the catalog with POST and reuses the validated result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { pokemon: [{ name: 'pikachu', pokemonstats: stats }] } }), {
        status: 200,
      }),
    )
    const { fetchPokemonSortDetails } = await import('./pokemon-catalog')

    const first = await fetchPokemonSortDetails()
    const second = await fetchPokemonSortDetails()

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graphql.pokeapi.co/v1beta2',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      }),
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toMatchObject({ operationName: 'PokemonSortDetails' })
    expect(body.query).toContain('pokemonstats')
  })

  it('preserves the status of catalog HTTP failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }))
    const { fetchPokemonSortDetails } = await import('./pokemon-catalog')

    await expect(fetchPokemonSortDetails()).rejects.toMatchObject({ status: 503, code: 'http' })
  })

  it('distinguishes a timeout from cancellation requested by the consumer', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true,
          })
        }),
    )
    const { fetchPokemonSortDetails } = await import('./pokemon-catalog')

    const timedOut = fetchPokemonSortDetails()
    const timeoutAssertion = expect(timedOut).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(15_000)
    await timeoutAssertion

    const controller = new AbortController()
    const cancelled = fetchPokemonSortDetails(controller.signal)
    const cancelAssertion = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await cancelAssertion
  })
})

describe('Pokédex rarity catalog', () => {
  const rarityPayload = {
    data: {
      pokemonspecies: [
        {
          name: 'mewtwo',
          is_legendary: true,
          is_mythical: false,
          pokemons: [{ name: 'mewtwo' }],
        },
        {
          name: 'deoxys',
          is_legendary: false,
          is_mythical: true,
          pokemons: [{ name: 'deoxys-normal' }, { name: 'deoxys-attack' }],
        },
      ],
    },
  }

  it('applies the species classification to all of its varieties', () => {
    expect(parsePokemonRarityDetails(rarityPayload)).toEqual({
      mewtwo: { isLegendary: true, isMythical: false },
      'deoxys-normal': { isLegendary: false, isMythical: true },
      'deoxys-attack': { isLegendary: false, isMythical: true },
    })
  })

  it('rejects partial responses and invalid varieties', () => {
    expect(() => parsePokemonRarityDetails({ ...rarityPayload, errors: [{ message: 'partial response' }] })).toThrow(
      ApiError,
    )
    expect(() => parsePokemonRarityDetails({ data: { pokemonspecies: [] } })).toThrow(ApiError)
    expect(() =>
      parsePokemonRarityDetails({
        data: {
          pokemonspecies: [
            {
              name: 'mewtwo',
              is_legendary: true,
              is_mythical: false,
              pokemons: [{ name: '__proto__' }],
            },
          ],
        },
      }),
    ).toThrow(ApiError)
  })

  it('fetches and reuses the validated classification', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(rarityPayload), { status: 200 }))
    const { fetchPokemonRarityDetails } = await import('./pokemon-catalog')

    const first = await fetchPokemonRarityDetails()
    const second = await fetchPokemonRarityDetails()

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toMatchObject({ operationName: 'PokemonRarityDetails' })
    expect(body.query).toContain('is_legendary')
    expect(body.query).toContain('is_mythical')
    expect(body.query).toContain('pokemons { name }')
  })
})

describe('Pokédex region catalog', () => {
  const regionPayload = {
    data: {
      pokemonspecies: [
        { id: 1, name: 'bulbasaur', pokemons: [{ name: 'bulbasaur' }] },
        { id: 194, name: 'wooper', pokemons: [{ name: 'wooper' }, { name: 'wooper-paldea' }] },
        { id: 899, name: 'wyrdeer', pokemons: [{ name: 'wyrdeer' }] },
      ],
    },
  }

  it('associates all varieties with the species debut region', () => {
    expect(parsePokemonRegionDetails(regionPayload)).toEqual({
      bulbasaur: 'kanto',
      wooper: 'johto',
      'wooper-paldea': 'johto',
      wyrdeer: 'hisui',
    })
  })

  it('rejects partial responses, species without a region, and duplicate varieties', () => {
    expect(() => parsePokemonRegionDetails({ ...regionPayload, errors: [{ message: 'partial response' }] })).toThrow(
      ApiError,
    )
    expect(() =>
      parsePokemonRegionDetails({
        data: {
          pokemonspecies: [
            {
              id: 1026,
              name: 'future',
              pokemons: [{ name: 'future' }],
            },
          ],
        },
      }),
    ).toThrow(ApiError)
    expect(() =>
      parsePokemonRegionDetails({
        data: {
          pokemonspecies: [
            { id: 1, name: 'one', pokemons: [{ name: 'shared' }] },
            { id: 152, name: 'two', pokemons: [{ name: 'shared' }] },
          ],
        },
      }),
    ).toThrow(ApiError)
  })

  it('fetches and reuses the validated regional classification', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(regionPayload), { status: 200 }))
    const { fetchPokemonRegionDetails } = await import('./pokemon-catalog')

    const first = await fetchPokemonRegionDetails()
    const second = await fetchPokemonRegionDetails()

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toMatchObject({ operationName: 'PokemonRegionDetails' })
    expect(body.query).toContain('id')
    expect(body.query).toContain('pokemons { name }')
  })
})
