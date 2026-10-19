import { GRAPHQL_API_URL, NETWORK, POKEMON_CATALOG_LIMIT } from '../config/app'
import { ApiError, readBoundedJsonResponse } from './api-client'

const MAX_CARD_BATCH_SIZE = 32
const NAME_PATTERN = /^[a-z0-9-]{1,100}$/
const TYPE_PATTERN = /^[a-z0-9-]{1,32}$/

const POKEMON_CARD_QUERY = `query PokemonCardDetails($names: [String!]!) {
  pokemon(limit: ${MAX_CARD_BATCH_SIZE}, where: { name: { _in: $names } }) {
    id
    name
    pokemontypes(order_by: { slot: asc }) { slot type { name } }
  }
}`

const FORM_CARD_QUERY = `query PokemonFormCardDetails($names: [String!]!) {
  pokemonform(limit: ${MAX_CARD_BATCH_SIZE}, where: { name: { _in: $names } }) {
    name
    is_battle_only
    pokemon {
      id
      name
      pokemontypes(order_by: { slot: asc }) { slot type { name } }
    }
  }
}`

export type PokemonCardDetails = {
  id: number
  name: string
  types: { slot: number; type: { name: string; url: string } }[]
  isBattleOnly: boolean
}

type CardKind = 'pokemon' | 'form'
type UnknownRecord = Record<string, unknown>
type InFlightRequest = {
  controller: AbortController
  consumers: number
  promise: Promise<Record<string, PokemonCardDetails>>
}

const cache = new Map<string, PokemonCardDetails>()
const inFlight = new Map<string, InFlightRequest>()
const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function validateNames(rawNames: string[]) {
  const names = [...new Set(rawNames)].sort()
  if (names.length === 0 || names.length > MAX_CARD_BATCH_SIZE || names.some((name) => !NAME_PATTERN.test(name))) {
    throw new ApiError('The requested card batch is invalid.', undefined, 'invalid-response')
  }
  return names
}

function parseTypes(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 2) {
    throw new ApiError('PokéAPI returned invalid card types.', undefined, 'invalid-response')
  }
  const slots = new Set<number>()
  return value.map((entry) => {
    if (
      !isRecord(entry) ||
      !Number.isInteger(entry.slot) ||
      Number(entry.slot) < 1 ||
      Number(entry.slot) > 2 ||
      slots.has(Number(entry.slot)) ||
      !isRecord(entry.type) ||
      typeof entry.type.name !== 'string' ||
      !TYPE_PATTERN.test(entry.type.name)
    ) {
      throw new ApiError('PokéAPI returned invalid card types.', undefined, 'invalid-response')
    }
    slots.add(Number(entry.slot))
    return { slot: Number(entry.slot), type: { name: entry.type.name, url: '' } }
  })
}

export function parsePokemonCardDetails(
  payload: unknown,
  expectedNames: string[],
  kind: CardKind,
): Record<string, PokemonCardDetails> {
  if (!isRecord(payload) || (Array.isArray(payload.errors) && payload.errors.length > 0) || !isRecord(payload.data)) {
    throw new ApiError('PokéAPI returned invalid card data.', undefined, 'invalid-response')
  }
  const entries = payload.data[kind === 'pokemon' ? 'pokemon' : 'pokemonform']
  if (!Array.isArray(entries) || entries.length !== expectedNames.length || entries.length > MAX_CARD_BATCH_SIZE) {
    throw new ApiError('PokéAPI returned incomplete card data.', undefined, 'invalid-response')
  }

  const expected = new Set(expectedNames)
  const details: Record<string, PokemonCardDetails> = Object.create(null) as Record<string, PokemonCardDetails>
  for (const rawEntry of entries) {
    if (
      !isRecord(rawEntry) ||
      typeof rawEntry.name !== 'string' ||
      !expected.has(rawEntry.name) ||
      details[rawEntry.name]
    ) {
      throw new ApiError('PokéAPI returned invalid card data.', undefined, 'invalid-response')
    }
    const pokemon = kind === 'pokemon' ? rawEntry : rawEntry.pokemon
    if (
      !isRecord(pokemon) ||
      !Number.isSafeInteger(pokemon.id) ||
      Number(pokemon.id) <= 0 ||
      Number(pokemon.id) > 100_000 ||
      typeof pokemon.name !== 'string' ||
      !NAME_PATTERN.test(pokemon.name) ||
      (kind === 'form' && typeof rawEntry.is_battle_only !== 'boolean')
    ) {
      throw new ApiError('PokéAPI returned invalid card data.', undefined, 'invalid-response')
    }
    details[rawEntry.name] = {
      id: Number(pokemon.id),
      name: pokemon.name,
      types: parseTypes(pokemon.pokemontypes),
      isBattleOnly: kind === 'form' ? Boolean(rawEntry.is_battle_only) : false,
    }
  }
  return details
}

async function requestCardDetails(kind: CardKind, names: string[], controller: AbortController) {
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, NETWORK.requestTimeoutMs)
  try {
    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: kind === 'pokemon' ? POKEMON_CARD_QUERY : FORM_CARD_QUERY,
        variables: { names },
        operationName: kind === 'pokemon' ? 'PokemonCardDetails' : 'PokemonFormCardDetails',
      }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    if (!response.ok) throw new ApiError('PokéAPI did not respond as expected.', response.status)
    return parsePokemonCardDetails(await readBoundedJsonResponse(response), names, kind)
  } catch (error) {
    if (timedOut) throw new ApiError('PokéAPI took too long to respond.', undefined, 'timeout')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function consumeRequest(entry: InFlightRequest, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  entry.consumers += 1
  return new Promise<Record<string, PokemonCardDetails>>((resolve, reject) => {
    let settled = false
    const finish = () => {
      if (settled) return false
      settled = true
      signal?.removeEventListener('abort', abort)
      entry.consumers -= 1
      return true
    }
    const abort = () => {
      if (!finish()) return
      if (entry.consumers === 0) entry.controller.abort()
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    entry.promise.then(
      (value) => finish() && resolve(value),
      (error: unknown) => finish() && reject(error),
    )
  })
}

export function fetchPokemonCardDetails(rawNames: string[], kind: CardKind, signal?: AbortSignal) {
  const requestedNames = [...new Set(rawNames)].sort()
  const result: Record<string, PokemonCardDetails> = Object.create(null) as Record<string, PokemonCardDetails>
  const missing = requestedNames.filter((name) => {
    const cached = cache.get(`${kind}:${name}`)
    if (cached) result[name] = cached
    return !cached
  })
  if (missing.length === 0) return Promise.resolve(result)
  const names = validateNames(missing)
  const key = `${kind}:${names.join(',')}`
  let entry = inFlight.get(key)
  if (!entry) {
    const controller = new AbortController()
    entry = { controller, consumers: 0, promise: Promise.resolve(result) }
    entry.promise = requestCardDetails(kind, names, controller)
      .then((batch) => {
        Object.entries(batch).forEach(([name, detail]) => {
          if (cache.size >= POKEMON_CATALOG_LIMIT * 2) cache.delete(cache.keys().next().value as string)
          cache.set(`${kind}:${name}`, detail)
        })
        return batch
      })
      .finally(() => {
        if (inFlight.get(key) === entry) inFlight.delete(key)
      })
    inFlight.set(key, entry)
  }
  return consumeRequest(entry, signal).then((batch) => Object.assign(result, batch))
}
