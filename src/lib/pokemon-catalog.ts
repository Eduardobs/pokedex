import { GRAPHQL_API_URL, NETWORK, POKEMON_CATALOG_LIMIT } from '../config/app'
import { ApiError } from './api-client'
import type { PokemonSortDetails } from './pokemon-sort'

const SORT_DETAILS_QUERY = `query PokemonSortDetails {
  pokemon(limit: ${POKEMON_CATALOG_LIMIT}, order_by: { id: asc }) {
    name
    pokemonstats {
      base_stat
      stat { name }
    }
  }
}`

const RARITY_DETAILS_QUERY = `query PokemonRarityDetails {
  pokemonspecies(
    limit: ${POKEMON_CATALOG_LIMIT}
    order_by: { id: asc }
    where: { _or: [{ is_legendary: { _eq: true } }, { is_mythical: { _eq: true } }] }
  ) {
    name
    is_legendary
    is_mythical
    pokemons { name }
  }
}`

const REGION_DETAILS_QUERY = `query PokemonRegionDetails {
  pokemonspecies(limit: ${POKEMON_CATALOG_LIMIT}, order_by: { id: asc }) {
    id
    name
    pokemons { name }
  }
}`

export const POKEMON_REGIONS = [
  { name: 'kanto', firstSpecies: 1, lastSpecies: 151 },
  { name: 'johto', firstSpecies: 152, lastSpecies: 251 },
  { name: 'hoenn', firstSpecies: 252, lastSpecies: 386 },
  { name: 'sinnoh', firstSpecies: 387, lastSpecies: 493 },
  { name: 'unova', firstSpecies: 494, lastSpecies: 649 },
  { name: 'kalos', firstSpecies: 650, lastSpecies: 721 },
  { name: 'alola', firstSpecies: 722, lastSpecies: 809 },
  { name: 'galar', firstSpecies: 810, lastSpecies: 898 },
  { name: 'hisui', firstSpecies: 899, lastSpecies: 905 },
  { name: 'paldea', firstSpecies: 906, lastSpecies: 1025 },
] as const

export type PokemonRegion = (typeof POKEMON_REGIONS)[number]['name']

const STAT_NAMES = new Set([
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
])
let cachedDetails: Record<string, PokemonSortDetails> | undefined
let cachedRarityDetails: Record<string, PokemonRarityDetails> | undefined
let cachedRegionDetails: Record<string, PokemonRegion> | undefined

export type PokemonRarityDetails = {
  isLegendary: boolean
  isMythical: boolean
}

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Converts the untrusted GraphQL payload into the small shape used by sorting. */
export function parsePokemonSortDetails(payload: unknown): Record<string, PokemonSortDetails> {
  if (
    !isRecord(payload) ||
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.pokemon) ||
    payload.data.pokemon.length === 0
  ) {
    throw new ApiError(
      'A PokéAPI retornou dados de ordenação inválidos.',
      undefined,
      'invalid-response',
    )
  }
  if (payload.data.pokemon.length > POKEMON_CATALOG_LIMIT) {
    throw new ApiError('A PokéAPI retornou dados demais.', undefined, 'invalid-response')
  }

  const details: Record<string, PokemonSortDetails> = Object.create(null) as Record<
    string,
    PokemonSortDetails
  >
  for (const entry of payload.data.pokemon) {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      !/^[a-z0-9-]{1,100}$/.test(entry.name) ||
      !Array.isArray(entry.pokemonstats) ||
      entry.pokemonstats.length !== STAT_NAMES.size ||
      details[entry.name]
    ) {
      throw new ApiError(
        'A PokéAPI retornou dados de ordenação inválidos.',
        undefined,
        'invalid-response',
      )
    }

    const foundStats = new Set<string>()
    const stats = entry.pokemonstats.map((rawStat) => {
      if (
        !isRecord(rawStat) ||
        !Number.isInteger(rawStat.base_stat) ||
        Number(rawStat.base_stat) < 0 ||
        Number(rawStat.base_stat) > 10_000 ||
        !isRecord(rawStat.stat) ||
        typeof rawStat.stat.name !== 'string' ||
        !STAT_NAMES.has(rawStat.stat.name) ||
        foundStats.has(rawStat.stat.name)
      ) {
        throw new ApiError('A PokéAPI retornou atributos inválidos.', undefined, 'invalid-response')
      }
      foundStats.add(rawStat.stat.name)
      return {
        base_stat: Number(rawStat.base_stat),
        effort: 0,
        stat: { name: rawStat.stat.name, url: '' },
      }
    })
    details[entry.name] = { stats }
  }
  return details
}

/** Maps each Pokémon variety to the legendary/mythical flags of its species. */
export function parsePokemonRarityDetails(payload: unknown): Record<string, PokemonRarityDetails> {
  if (
    !isRecord(payload) ||
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.pokemonspecies) ||
    payload.data.pokemonspecies.length === 0
  ) {
    throw new ApiError(
      'A PokéAPI retornou dados de raridade inválidos.',
      undefined,
      'invalid-response',
    )
  }
  if (payload.data.pokemonspecies.length > POKEMON_CATALOG_LIMIT) {
    throw new ApiError('A PokéAPI retornou dados demais.', undefined, 'invalid-response')
  }

  const details: Record<string, PokemonRarityDetails> = Object.create(null) as Record<
    string,
    PokemonRarityDetails
  >
  for (const species of payload.data.pokemonspecies) {
    if (
      !isRecord(species) ||
      typeof species.name !== 'string' ||
      !/^[a-z0-9-]{1,100}$/.test(species.name) ||
      typeof species.is_legendary !== 'boolean' ||
      typeof species.is_mythical !== 'boolean' ||
      (!species.is_legendary && !species.is_mythical) ||
      !Array.isArray(species.pokemons) ||
      species.pokemons.length === 0
    ) {
      throw new ApiError(
        'A PokéAPI retornou dados de raridade inválidos.',
        undefined,
        'invalid-response',
      )
    }

    for (const pokemon of species.pokemons) {
      if (
        !isRecord(pokemon) ||
        typeof pokemon.name !== 'string' ||
        !/^[a-z0-9-]{1,100}$/.test(pokemon.name) ||
        details[pokemon.name]
      ) {
        throw new ApiError(
          'A PokéAPI retornou variedades inválidas.',
          undefined,
          'invalid-response',
        )
      }
      details[pokemon.name] = { isLegendary: species.is_legendary, isMythical: species.is_mythical }
    }
  }
  return details
}

/** Maps each Pokémon variety to the region where its species was introduced. */
export function parsePokemonRegionDetails(payload: unknown): Record<string, PokemonRegion> {
  if (
    !isRecord(payload) ||
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.pokemonspecies) ||
    payload.data.pokemonspecies.length === 0
  ) {
    throw new ApiError(
      'A PokéAPI retornou dados de região inválidos.',
      undefined,
      'invalid-response',
    )
  }
  if (payload.data.pokemonspecies.length > POKEMON_CATALOG_LIMIT) {
    throw new ApiError('A PokéAPI retornou dados demais.', undefined, 'invalid-response')
  }

  const details: Record<string, PokemonRegion> = Object.create(null) as Record<
    string,
    PokemonRegion
  >
  const speciesIds = new Set<number>()
  for (const species of payload.data.pokemonspecies) {
    if (
      !isRecord(species) ||
      !Number.isInteger(species.id) ||
      Number(species.id) < 1 ||
      Number(species.id) > POKEMON_CATALOG_LIMIT ||
      speciesIds.has(Number(species.id)) ||
      typeof species.name !== 'string' ||
      !/^[a-z0-9-]{1,100}$/.test(species.name) ||
      !Array.isArray(species.pokemons) ||
      species.pokemons.length === 0
    ) {
      throw new ApiError(
        'A PokéAPI retornou dados de região inválidos.',
        undefined,
        'invalid-response',
      )
    }
    speciesIds.add(Number(species.id))
    const region = POKEMON_REGIONS.find(
      ({ firstSpecies, lastSpecies }) =>
        Number(species.id) >= firstSpecies && Number(species.id) <= lastSpecies,
    )?.name
    if (!region)
      throw new ApiError(
        'A PokéAPI retornou uma espécie sem região conhecida.',
        undefined,
        'invalid-response',
      )

    for (const pokemon of species.pokemons) {
      if (
        !isRecord(pokemon) ||
        typeof pokemon.name !== 'string' ||
        !/^[a-z0-9-]{1,100}$/.test(pokemon.name) ||
        details[pokemon.name]
      ) {
        throw new ApiError(
          'A PokéAPI retornou variedades inválidas.',
          undefined,
          'invalid-response',
        )
      }
      details[pokemon.name] = region
    }
  }
  return details
}

async function fetchPokemonCatalogDetails<T>(
  query: string,
  operationName: string,
  parse: (payload: unknown) => T,
  signal?: AbortSignal,
) {
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')

  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = window.setTimeout(abort, NETWORK.requestTimeoutMs)

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, operationName }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    if (!response.ok) throw new ApiError('A PokéAPI não respondeu como esperado.', response.status)
    return parse(await response.json())
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new ApiError('A PokéAPI demorou demais para responder.', undefined, 'timeout')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

/** Loads every sortable stat in one fixed, field-limited request. */
export async function fetchPokemonSortDetails(
  signal?: AbortSignal,
): Promise<Record<string, PokemonSortDetails>> {
  if (cachedDetails) return cachedDetails
  cachedDetails = await fetchPokemonCatalogDetails(
    SORT_DETAILS_QUERY,
    'PokemonSortDetails',
    parsePokemonSortDetails,
    signal,
  )
  return cachedDetails
}

/** Loads and caches the rare-species catalog in one field-limited request. */
export async function fetchPokemonRarityDetails(
  signal?: AbortSignal,
): Promise<Record<string, PokemonRarityDetails>> {
  if (cachedRarityDetails) return cachedRarityDetails
  cachedRarityDetails = await fetchPokemonCatalogDetails(
    RARITY_DETAILS_QUERY,
    'PokemonRarityDetails',
    parsePokemonRarityDetails,
    signal,
  )
  return cachedRarityDetails
}

/** Loads and caches the region where every catalog species was introduced. */
export async function fetchPokemonRegionDetails(
  signal?: AbortSignal,
): Promise<Record<string, PokemonRegion>> {
  if (cachedRegionDetails) return cachedRegionDetails
  cachedRegionDetails = await fetchPokemonCatalogDetails(
    REGION_DETAILS_QUERY,
    'PokemonRegionDetails',
    parsePokemonRegionDetails,
    signal,
  )
  return cachedRegionDetails
}
