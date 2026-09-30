import { GRAPHQL_API_URL, NETWORK } from '../config/app'
import { ApiError } from './api-client'

const MAX_ABILITY_PAGE_SIZE = 40
const NAME_PATTERN = /^[a-z0-9-]{1,100}$/
const SUPPORTED_API_LANGUAGES = new Set(['pt-br', 'en', 'es'])

const ABILITY_LIST_DETAILS_QUERY = `query AbilityListDetails($ids: [Int!]!, $languages: [String!]!) {
  ability(where: { id: { _in: $ids } }) {
    id
    name
    abilityeffecttexts(where: { language: { name: { _in: $languages } } }) {
      short_effect
      language { name }
    }
  }
}`

type UnknownRecord = Record<string, unknown>

export type AbilityEffectEntry = {
  short_effect: string
  language: { name: string }
}

export type AbilityListDetail = {
  id: number
  name: string
  effectEntries: AbilityEffectEntry[]
}

export type AbilityListDetails = Record<string, AbilityListDetail>

type InFlightRequest = {
  controller: AbortController
  consumers: number
  promise: Promise<AbilityListDetails>
}

const cache = new Map<string, AbilityListDetails>()
const inFlight = new Map<string, InFlightRequest>()

const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function validateRequest(ids: number[], languages: string[]) {
  if (
    ids.length === 0 ||
    ids.length > MAX_ABILITY_PAGE_SIZE ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0 || id > 100_000) ||
    languages.length === 0 ||
    languages.length > 2 ||
    new Set(languages).size !== languages.length ||
    languages.some((language) => !SUPPORTED_API_LANGUAGES.has(language))
  ) {
    throw new ApiError('A página de habilidades solicitada é inválida.', undefined, 'invalid-response')
  }
}

/** Converts an untrusted GraphQL response into the fields displayed by the ability list. */
export function parseAbilityListDetails(payload: unknown, expectedIds: number[]): AbilityListDetails {
  if (
    !isRecord(payload) ||
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.ability) ||
    payload.data.ability.length !== expectedIds.length ||
    payload.data.ability.length > MAX_ABILITY_PAGE_SIZE
  ) {
    throw new ApiError('A PokéAPI retornou dados de habilidades inválidos.', undefined, 'invalid-response')
  }

  const expected = new Set(expectedIds)
  const details: AbilityListDetails = Object.create(null) as AbilityListDetails
  const foundIds = new Set<number>()

  for (const entry of payload.data.ability) {
    if (
      !isRecord(entry) ||
      !Number.isSafeInteger(entry.id) ||
      !expected.has(Number(entry.id)) ||
      foundIds.has(Number(entry.id)) ||
      typeof entry.name !== 'string' ||
      !NAME_PATTERN.test(entry.name) ||
      details[entry.name] ||
      !Array.isArray(entry.abilityeffecttexts) ||
      entry.abilityeffecttexts.length > 2
    ) {
      throw new ApiError('A PokéAPI retornou dados de habilidades inválidos.', undefined, 'invalid-response')
    }

    const foundLanguages = new Set<string>()
    const effectEntries = entry.abilityeffecttexts.map((value) => {
      if (
        !isRecord(value) ||
        typeof value.short_effect !== 'string' ||
        value.short_effect.length === 0 ||
        value.short_effect.length > 5_000 ||
        !isRecord(value.language) ||
        typeof value.language.name !== 'string' ||
        !SUPPORTED_API_LANGUAGES.has(value.language.name) ||
        foundLanguages.has(value.language.name)
      ) {
        throw new ApiError('A PokéAPI retornou descrições de habilidades inválidas.', undefined, 'invalid-response')
      }
      foundLanguages.add(value.language.name)
      return { short_effect: value.short_effect, language: { name: value.language.name } }
    })

    foundIds.add(Number(entry.id))
    details[entry.name] = { id: Number(entry.id), name: entry.name, effectEntries }
  }

  return details
}

async function requestAbilityListDetails(
  ids: number[],
  languages: string[],
  controller: AbortController,
): Promise<AbilityListDetails> {
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
        query: ABILITY_LIST_DETAILS_QUERY,
        variables: { ids, languages },
        operationName: 'AbilityListDetails',
      }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    if (!response.ok) throw new ApiError('A PokéAPI não respondeu como esperado.', response.status)
    return parseAbilityListDetails(await response.json(), ids)
  } catch (error) {
    if (timedOut) throw new ApiError('A PokéAPI demorou demais para responder.', undefined, 'timeout')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function consumeRequest(entry: InFlightRequest, signal?: AbortSignal): Promise<AbilityListDetails> {
  if (signal?.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  entry.consumers += 1

  return new Promise((resolve, reject) => {
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
      (value) => {
        if (finish()) resolve(value)
      },
      (error: unknown) => {
        if (finish()) reject(error)
      },
    )
  })
}

/** Loads one page of ability descriptions in one field-limited GraphQL request. */
export function fetchAbilityListDetails(
  rawIds: number[],
  apiLanguage: 'pt-br' | 'en' | 'es',
  signal?: AbortSignal,
): Promise<AbilityListDetails> {
  const ids = [...rawIds].sort((left, right) => left - right)
  const languages = apiLanguage === 'en' ? ['en'] : [apiLanguage, 'en']
  validateRequest(ids, languages)
  const key = `${languages.join(',')}:${ids.join(',')}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  let entry = inFlight.get(key)
  if (!entry) {
    const controller = new AbortController()
    entry = { controller, consumers: 0, promise: Promise.resolve(Object.create(null) as AbilityListDetails) }
    entry.promise = requestAbilityListDetails(ids, languages, controller)
      .then((value) => {
        if (cache.size >= NETWORK.cacheMaxEntries) cache.delete(cache.keys().next().value as string)
        cache.set(key, value)
        return value
      })
      .finally(() => {
        if (inFlight.get(key) === entry) inFlight.delete(key)
      })
    inFlight.set(key, entry)
  }

  return consumeRequest(entry, signal)
}
