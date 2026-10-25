import { NETWORK, POKEMON_3D_API_URL } from '../config/app'
import { ApiError, readBoundedJsonResponse } from './api-client'

export type Pokemon3D = { id: number; forms: { name: string; model: string; formName: string }[] }

export function parsePokemon3D(value: unknown): Pokemon3D[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'pokemon' in value
      ? value.pokemon
      : null
  if (!Array.isArray(rows) || rows.length > 2000)
    throw new ApiError('Invalid 3D catalog', undefined, 'invalid-response')
  const ids = new Set<number>()
  return rows.map((row: unknown) => {
    if (
      !row ||
      typeof row !== 'object' ||
      !('id' in row) ||
      typeof row.id !== 'number' ||
      !Number.isSafeInteger(row.id) ||
      row.id < 1 ||
      ids.has(row.id) ||
      !('forms' in row) ||
      !Array.isArray(row.forms) ||
      row.forms.length > 100
    )
      throw new ApiError('Invalid 3D entry', undefined, 'invalid-response')
    ids.add(row.id)
    return {
      id: row.id,
      forms: row.forms.flatMap((form: unknown) => {
        if (
          !form ||
          typeof form !== 'object' ||
          !('name' in form) ||
          typeof form.name !== 'string' ||
          !('formName' in form) ||
          typeof form.formName !== 'string' ||
          !('model' in form) ||
          typeof form.model !== 'string'
        )
          throw new ApiError('Invalid 3D form', undefined, 'invalid-response')
        const url = new URL(form.model)
        if (
          url.origin !== 'https://raw.githubusercontent.com' ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          !/^\/Pokemon-3D-api\/assets\/(?:refs\/heads\/)?main\/models\/(?:opt|glb)\/[a-zA-Z0-9/_-]+(?:\.glb)?$/.test(
            url.pathname,
          )
        )
          throw new ApiError('Unsafe model URL', undefined, 'unsafe-url')
        // The public catalog contains incomplete links; omit them without losing valid models.
        if (!url.pathname.endsWith('.glb')) return []
        return [{ name: form.name, formName: form.formName, model: url.href }]
      }),
    }
  })
}

let cache: { data: Pokemon3D[]; expires: number } | undefined
let pending: { promise: Promise<Pokemon3D[]>; controller: AbortController; consumers: number } | undefined

export async function fetchPokemon3D(signal: AbortSignal): Promise<Pokemon3D[]> {
  signal.throwIfAborted()
  if (cache && cache.expires > Date.now()) return cache.data
  if (!pending || pending.controller.signal.aborted) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
      NETWORK.requestTimeoutMs,
    )
    const request = { controller, consumers: 0, promise: Promise.resolve([] as Pokemon3D[]) }
    request.promise = (async () => {
      try {
        const response = await fetch(POKEMON_3D_API_URL, {
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        })
        if (!response.ok) throw new ApiError('3D API request failed', response.status)
        const data = parsePokemon3D(await readBoundedJsonResponse(response))
        controller.signal.throwIfAborted()
        cache = { data, expires: Date.now() + NETWORK.cacheTtlMs }
        return data
      } finally {
        clearTimeout(timeout)
        if (pending === request) pending = undefined
      }
    })()
    pending = request
  }
  const request = pending
  request.consumers++
  return new Promise((resolve, reject) => {
    let released = false
    const release = () => {
      if (released) return
      released = true
      signal.removeEventListener('abort', abort)
      if (--request.consumers === 0) request.controller.abort()
    }
    const abort = () => {
      release()
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
    request.promise.then(
      (data) => {
        if (!released) {
          release()
          resolve(data)
        }
      },
      (error) => {
        if (!released) {
          release()
          reject(error)
        }
      },
    )
  })
}

export function selectPokemon3D(
  catalog: Pokemon3D[],
  pokemon: { id: number; name: string; is_default: boolean },
  speciesId: number,
  shiny: boolean,
): string | null {
  const forms = catalog.find((entry) => entry.id === speciesId)?.forms ?? []
  if (pokemon.is_default) return forms.find((form) => form.formName === (shiny ? 'shiny' : 'regular'))?.model ?? null
  // Match explicit alternate-form names; never substitute the base species model.
  const normalize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .sort()
      .join(' ')
  const target = pokemon.name
    .replace(/-alola$/, '-alolan')
    .replace(/-galar$/, '-galarian')
    .replace(/-hisui$/, '-hisuian')
    .replace(/-paldea$/, '-paldean')
    .replace(/-gmax$/, '-g-max')
  return forms.find((form) => normalize(form.name) === normalize(`${shiny ? 'shiny ' : ''}${target}`))?.model ?? null
}
