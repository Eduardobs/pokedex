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

const STAT_NAMES = new Set(['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'])
let cachedDetails: Record<string, PokemonSortDetails> | undefined

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Converts the untrusted GraphQL payload into the small shape used by sorting. */
export function parsePokemonSortDetails(payload: unknown): Record<string, PokemonSortDetails> {
  if (!isRecord(payload) || (Array.isArray(payload.errors) && payload.errors.length > 0) || !isRecord(payload.data) || !Array.isArray(payload.data.pokemon) || payload.data.pokemon.length === 0) {
    throw new ApiError('A PokéAPI retornou dados de ordenação inválidos.', undefined, 'invalid-response')
  }
  if (payload.data.pokemon.length > POKEMON_CATALOG_LIMIT) {
    throw new ApiError('A PokéAPI retornou dados demais.', undefined, 'invalid-response')
  }

  const details: Record<string, PokemonSortDetails> = Object.create(null) as Record<string, PokemonSortDetails>
  for (const entry of payload.data.pokemon) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || !/^[a-z0-9-]{1,100}$/.test(entry.name) || !Array.isArray(entry.pokemonstats) || entry.pokemonstats.length !== STAT_NAMES.size || details[entry.name]) {
      throw new ApiError('A PokéAPI retornou dados de ordenação inválidos.', undefined, 'invalid-response')
    }

    const foundStats = new Set<string>()
    const stats = entry.pokemonstats.map((rawStat) => {
      if (!isRecord(rawStat) || !Number.isInteger(rawStat.base_stat) || Number(rawStat.base_stat) < 0 || Number(rawStat.base_stat) > 10_000 || !isRecord(rawStat.stat) || typeof rawStat.stat.name !== 'string' || !STAT_NAMES.has(rawStat.stat.name) || foundStats.has(rawStat.stat.name)) {
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

/** Loads every sortable stat in one fixed, field-limited request. */
export async function fetchPokemonSortDetails(signal?: AbortSignal): Promise<Record<string, PokemonSortDetails>> {
  if (cachedDetails) return cachedDetails
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')

  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = window.setTimeout(abort, NETWORK.requestTimeoutMs)

  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SORT_DETAILS_QUERY, operationName: 'PokemonSortDetails' }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    if (!response.ok) throw new ApiError('A PokéAPI não respondeu como esperado.', response.status)
    cachedDetails = parsePokemonSortDetails(await response.json())
    return cachedDetails
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
