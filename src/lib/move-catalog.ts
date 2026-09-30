import { GRAPHQL_API_URL, NETWORK } from '../config/app'
import { ApiError } from './api-client'

const MAX_MOVE_PAGE_SIZE = 40
const NAME_PATTERN = /^[a-z0-9-]{1,100}$/
const DAMAGE_CLASSES = new Set(['physical', 'special', 'status'])
const SUPPORTED_API_LANGUAGES = new Set(['pt-br', 'en', 'es'])

const MOVE_LIST_DETAILS_QUERY = `query MoveListDetails($ids: [Int!]!, $languages: [String!]!) {
  move(where: { id: { _in: $ids } }) {
    id
    name
    accuracy
    power
    pp
    type { name }
    movedamageclass { name }
    movenames(where: { language: { name: { _in: $languages } } }) {
      name
      language { name }
    }
  }
}`

type UnknownRecord = Record<string, unknown>

export type MoveListDetail = {
  id: number
  name: string
  names: { name: string; language: { name: string } }[]
  type: string
  damageClass: 'physical' | 'special' | 'status'
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveListDetails = Record<string, MoveListDetail>

type InFlightRequest = {
  controller: AbortController
  consumers: number
  promise: Promise<MoveListDetails>
}

const cache = new Map<string, MoveListDetails>()
const inFlight = new Map<string, InFlightRequest>()

const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function validOptionalInteger(value: unknown, maximum: number): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= maximum)
}

function validateRequest(ids: number[], languages: string[]) {
  if (
    ids.length === 0 ||
    ids.length > MAX_MOVE_PAGE_SIZE ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0 || id > 100_000) ||
    languages.length === 0 ||
    languages.length > 2 ||
    new Set(languages).size !== languages.length ||
    languages.some((language) => !SUPPORTED_API_LANGUAGES.has(language))
  ) {
    throw new ApiError('A página de golpes solicitada é inválida.', undefined, 'invalid-response')
  }
}

/** Converts an untrusted GraphQL response into the fields displayed by the move list. */
export function parseMoveListDetails(payload: unknown, expectedIds: number[]): MoveListDetails {
  if (
    !isRecord(payload) ||
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    !isRecord(payload.data) ||
    !Array.isArray(payload.data.move) ||
    payload.data.move.length !== expectedIds.length ||
    payload.data.move.length > MAX_MOVE_PAGE_SIZE
  ) {
    throw new ApiError('A PokéAPI retornou dados de golpes inválidos.', undefined, 'invalid-response')
  }

  const expected = new Set(expectedIds)
  const details: MoveListDetails = Object.create(null) as MoveListDetails
  const foundIds = new Set<number>()

  for (const entry of payload.data.move) {
    if (
      !isRecord(entry) ||
      !Number.isSafeInteger(entry.id) ||
      !expected.has(Number(entry.id)) ||
      foundIds.has(Number(entry.id)) ||
      typeof entry.name !== 'string' ||
      !NAME_PATTERN.test(entry.name) ||
      details[entry.name] ||
      !validOptionalInteger(entry.power, 10_000) ||
      !validOptionalInteger(entry.accuracy, 100) ||
      !validOptionalInteger(entry.pp, 1_000) ||
      !isRecord(entry.type) ||
      typeof entry.type.name !== 'string' ||
      !NAME_PATTERN.test(entry.type.name) ||
      !isRecord(entry.movedamageclass) ||
      typeof entry.movedamageclass.name !== 'string' ||
      !DAMAGE_CLASSES.has(entry.movedamageclass.name) ||
      !Array.isArray(entry.movenames) ||
      entry.movenames.length > 2
    ) {
      throw new ApiError('A PokéAPI retornou dados de golpes inválidos.', undefined, 'invalid-response')
    }

    const names = entry.movenames.map((value) => {
      if (
        !isRecord(value) ||
        typeof value.name !== 'string' ||
        value.name.length === 0 ||
        value.name.length > 100 ||
        !isRecord(value.language) ||
        typeof value.language.name !== 'string' ||
        !SUPPORTED_API_LANGUAGES.has(value.language.name)
      ) {
        throw new ApiError('A PokéAPI retornou nomes de golpes inválidos.', undefined, 'invalid-response')
      }
      return { name: value.name, language: { name: value.language.name } }
    })

    foundIds.add(Number(entry.id))
    details[entry.name] = {
      id: Number(entry.id),
      name: entry.name,
      names,
      type: entry.type.name,
      damageClass: entry.movedamageclass.name as MoveListDetail['damageClass'],
      power: entry.power === null ? null : Number(entry.power),
      accuracy: entry.accuracy === null ? null : Number(entry.accuracy),
      pp: entry.pp === null ? null : Number(entry.pp),
    }
  }

  return details
}

async function requestMoveListDetails(
  ids: number[],
  languages: string[],
  controller: AbortController,
): Promise<MoveListDetails> {
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
        query: MOVE_LIST_DETAILS_QUERY,
        variables: { ids, languages },
        operationName: 'MoveListDetails',
      }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    if (!response.ok) throw new ApiError('A PokéAPI não respondeu como esperado.', response.status)
    return parseMoveListDetails(await response.json(), ids)
  } catch (error) {
    if (timedOut) throw new ApiError('A PokéAPI demorou demais para responder.', undefined, 'timeout')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function consumeRequest(entry: InFlightRequest, signal?: AbortSignal): Promise<MoveListDetails> {
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

/** Loads one page of move metadata in one field-limited GraphQL request. */
export function fetchMoveListDetails(
  rawIds: number[],
  apiLanguage: 'pt-br' | 'en' | 'es',
  signal?: AbortSignal,
): Promise<MoveListDetails> {
  const ids = [...rawIds].sort((left, right) => left - right)
  const languages = apiLanguage === 'en' ? ['en'] : [apiLanguage, 'en']
  validateRequest(ids, languages)
  const key = `${languages.join(',')}:${ids.join(',')}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  let entry = inFlight.get(key)
  if (!entry) {
    const controller = new AbortController()
    entry = { controller, consumers: 0, promise: Promise.resolve(Object.create(null) as MoveListDetails) }
    entry.promise = requestMoveListDetails(ids, languages, controller)
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
