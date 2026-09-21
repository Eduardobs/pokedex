import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api-client'
import { parsePokemonRarityDetails, parsePokemonRegionDetails, parsePokemonSortDetails } from './pokemon-catalog'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

describe('catálogo de atributos da Pokédex', () => {
  const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
    .map((name, index) => ({ base_stat: 50 + index, stat: { name } }))

  it('mantém somente os campos necessários para ordenar', () => {
    expect(parsePokemonSortDetails({ data: { pokemon: [{
      name: 'pikachu',
      pokemonstats: stats,
      ignored: 'value',
    }] } })).toEqual({
      pikachu: { stats: stats.map(({ base_stat, stat }) => ({ base_stat, effort: 0, stat: { ...stat, url: '' } })) },
    })
  })

  it('rejeita nomes e atributos inesperados', () => {
    expect(() => parsePokemonSortDetails({ data: { pokemon: [{ name: '__proto__', pokemonstats: stats }] } })).toThrow(ApiError)
    expect(() => parsePokemonSortDetails({ data: { pokemon: [{ name: 'pikachu', pokemonstats: stats.map((stat, index) => index ? stat : { ...stat, base_stat: -1 }) }] } })).toThrow(ApiError)
    expect(() => parsePokemonSortDetails({ errors: [{ message: 'partial response' }], data: { pokemon: [{ name: 'pikachu', pokemonstats: stats }] } })).toThrow(ApiError)
  })

  it('rejeita catálogos vazios, Pokémon duplicados e atributos duplicados', () => {
    expect(() => parsePokemonSortDetails({ data: { pokemon: [] } })).toThrow(ApiError)
    expect(() => parsePokemonSortDetails({ data: { pokemon: [
      { name: 'pikachu', pokemonstats: stats },
      { name: 'pikachu', pokemonstats: stats },
    ] } })).toThrow(ApiError)
    expect(() => parsePokemonSortDetails({ data: { pokemon: [{
      name: 'pikachu',
      pokemonstats: stats.map((stat, index) => index === 1 ? stats[0] : stat),
    }] } })).toThrow(ApiError)
  })

  it('busca o catálogo com POST e reutiliza o resultado validado', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { pokemon: [{ name: 'pikachu', pokemonstats: stats }] } }), { status: 200 }),
    )
    const { fetchPokemonSortDetails } = await import('./pokemon-catalog')

    const first = await fetchPokemonSortDetails()
    const second = await fetchPokemonSortDetails()

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://graphql.pokeapi.co/v1beta2', expect.objectContaining({
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    }))
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body).toMatchObject({ operationName: 'PokemonSortDetails' })
    expect(body.query).toContain('pokemonstats')
  })

  it('preserva o status de falhas HTTP do catálogo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }))
    const { fetchPokemonSortDetails } = await import('./pokemon-catalog')

    await expect(fetchPokemonSortDetails()).rejects.toMatchObject({ status: 503, code: 'http' })
  })

  it('distingue timeout de cancelamento solicitado pelo consumidor', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))
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

describe('catálogo de raridade da Pokédex', () => {
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

  it('aplica a classificação da espécie a todas as suas variedades', () => {
    expect(parsePokemonRarityDetails(rarityPayload)).toEqual({
      mewtwo: { isLegendary: true, isMythical: false },
      'deoxys-normal': { isLegendary: false, isMythical: true },
      'deoxys-attack': { isLegendary: false, isMythical: true },
    })
  })

  it('rejeita respostas parciais e variedades inválidas', () => {
    expect(() => parsePokemonRarityDetails({ ...rarityPayload, errors: [{ message: 'partial response' }] })).toThrow(ApiError)
    expect(() => parsePokemonRarityDetails({ data: { pokemonspecies: [] } })).toThrow(ApiError)
    expect(() => parsePokemonRarityDetails({ data: { pokemonspecies: [{
      name: 'mewtwo',
      is_legendary: true,
      is_mythical: false,
      pokemons: [{ name: '__proto__' }],
    }] } })).toThrow(ApiError)
  })

  it('busca e reutiliza a classificação validada', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(rarityPayload), { status: 200 }),
    )
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

describe('catálogo de regiões da Pokédex', () => {
  const regionPayload = {
    data: {
      pokemonspecies: [
        { id: 1, name: 'bulbasaur', pokemons: [{ name: 'bulbasaur' }] },
        { id: 194, name: 'wooper', pokemons: [{ name: 'wooper' }, { name: 'wooper-paldea' }] },
        { id: 899, name: 'wyrdeer', pokemons: [{ name: 'wyrdeer' }] },
      ],
    },
  }

  it('associa todas as variedades à região de estreia da espécie', () => {
    expect(parsePokemonRegionDetails(regionPayload)).toEqual({
      bulbasaur: 'kanto',
      wooper: 'johto',
      'wooper-paldea': 'johto',
      wyrdeer: 'hisui',
    })
  })

  it('rejeita respostas parciais, espécies sem região e variedades duplicadas', () => {
    expect(() => parsePokemonRegionDetails({ ...regionPayload, errors: [{ message: 'partial response' }] })).toThrow(ApiError)
    expect(() => parsePokemonRegionDetails({ data: { pokemonspecies: [{
      id: 1026, name: 'future', pokemons: [{ name: 'future' }],
    }] } })).toThrow(ApiError)
    expect(() => parsePokemonRegionDetails({ data: { pokemonspecies: [
      { id: 1, name: 'one', pokemons: [{ name: 'shared' }] },
      { id: 152, name: 'two', pokemons: [{ name: 'shared' }] },
    ] } })).toThrow(ApiError)
  })

  it('busca e reutiliza a classificação regional validada', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(regionPayload), { status: 200 }),
    )
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
