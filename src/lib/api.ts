import type { ApiList, NamedResource, PokemonListItem } from '../types'
import type { Language } from '../contexts/LanguageContext'

export const API_BASE = 'https://pokeapi.co/api/v2'
const MAX_CACHE_ENTRIES = 250
const cache = new Map<string, unknown>()
type PendingRequest = { promise: Promise<unknown>; controller: AbortController; consumers: number; settled: boolean }
const pendingRequests = new Map<string, PendingRequest>()

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message) }
}

function cacheResponse(url: string, data: unknown) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(url, data)
}

function observeWithSignal<T>(request: Promise<T>, signal?: AbortSignal, onFinish?: () => void): Promise<T> {
  let finished = false
  let abortHandler: (() => void) | undefined
  const finish = () => {
    if (finished) return
    finished = true
    if (abortHandler) signal?.removeEventListener('abort', abortHandler)
    onFinish?.()
  }

  if (!signal) return request.finally(finish)
  if (signal.aborted) {
    finish()
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  }

  return new Promise<T>((resolve, reject) => {
    abortHandler = () => {
      finish()
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    signal.addEventListener('abort', abortHandler, { once: true })
    request.then(
      (data) => { finish(); resolve(data) },
      (error: unknown) => { finish(); reject(error) },
    )
  })
}

export function apiFetch<T>(pathOrUrl: string, signal?: AbortSignal): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}/${pathOrUrl.replace(/^\//, '')}`
  if (cache.has(url)) {
    const data = cache.get(url) as T
    cache.delete(url)
    cache.set(url, data)
    return observeWithSignal(Promise.resolve(data), signal)
  }

  let pending = pendingRequests.get(url)
  if (!pending) {
    const controller = new AbortController()
    pending = { promise: Promise.resolve(), controller, consumers: 0, settled: false }
    pending.promise = fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status === 404 ? 'Conteúdo não encontrado.' : 'A PokéAPI não respondeu como esperado.', response.status)
        const data = await response.json() as T
        cacheResponse(url, data)
        return data
      })
      .finally(() => {
        pending!.settled = true
        if (pendingRequests.get(url) === pending) pendingRequests.delete(url)
      })
    pendingRequests.set(url, pending)
  }

  const current = pending
  current.consumers += 1
  const release = () => {
    current.consumers -= 1
    queueMicrotask(() => {
      if (!current.settled && current.consumers === 0 && pendingRequests.get(url) === current) current.controller.abort()
    })
  }
  return observeWithSignal(current.promise as Promise<T>, signal, release)
}

export async function listResource(endpoint: string, limit = 24, offset = 0, signal?: AbortSignal) {
  return apiFetch<ApiList>(`${endpoint}?limit=${limit}&offset=${offset}`, signal)
}

export const idFromUrl = (url: string) => Number(url.split('/').filter(Boolean).at(-1))
export const pokemonArtwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
export const itemSprite = (name: string) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`
export const pokemonListItems = (resources: NamedResource[]): PokemonListItem[] => resources.map((item) => ({ ...item, id: idFromUrl(item.url) }))

export const prettyName = (value: string) => value
  .replace(/-/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

export const formatNumber = (value: number, language: Language = 'pt-BR') => new Intl.NumberFormat(language).format(value)

export function localizedText(entries: unknown, keys: string[] = ['flavor_text', 'effect', 'description'], language = 'pt-br'): string {
  if (!Array.isArray(entries)) return ''
  const candidates = entries as Array<Record<string, unknown>>
  const selected = candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === language)
    ?? candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'en')
    ?? candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'pt-br')
    ?? candidates[0]
  if (!selected) return ''
  const key = keys.find((item) => typeof selected[item] === 'string')
  return key ? String(selected[key]).replace(/[\n\f]/g, ' ') : ''
}

export function localizedName(entries: unknown, language = 'pt-br'): string {
  if (!Array.isArray(entries)) return ''
  const candidates = entries as Array<{ name?: unknown; language?: NamedResource }>
  const selected = candidates.find((entry) => entry.language?.name === language)
    ?? candidates.find((entry) => entry.language?.name === 'en')
    ?? candidates.find((entry) => entry.language?.name === 'pt-br')
  return typeof selected?.name === 'string' ? selected.name : ''
}
