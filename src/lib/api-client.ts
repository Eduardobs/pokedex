import { API_BASE_URL, API_ORIGIN, NETWORK } from '../config/app'

type CacheEntry = { data: unknown; expiresAt: number }
type PendingRequest = { promise: Promise<unknown>; controller: AbortController; consumers: number; settled: boolean }

const cache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, PendingRequest>()

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code: 'http' | 'timeout' | 'unsafe-url' | 'invalid-response' = 'http') {
    super(message)
    this.name = 'ApiError'
  }
}

/** Only the documented HTTPS API is a valid data source, including URLs returned by it. */
export function resolveApiUrl(pathOrUrl: string): string {
  const input = pathOrUrl.trim()
  if (!input) throw new ApiError('Caminho da API inválido.', undefined, 'unsafe-url')

  let url: URL
  try {
    const absolute = /^[a-z][a-z\d+.-]*:/i.test(input)
    url = absolute
      ? new URL(input)
      : new URL(input.replace(/^\/+/, ''), `${API_BASE_URL}/`)
  } catch {
    throw new ApiError('URL da API inválida.', undefined, 'unsafe-url')
  }

  const apiPath = `${new URL(API_BASE_URL).pathname}/`
  if (url.protocol !== 'https:' || url.origin !== API_ORIGIN || !url.pathname.startsWith(apiPath) || url.username || url.password) {
    throw new ApiError('Origem da API não permitida.', undefined, 'unsafe-url')
  }
  url.hash = ''
  return url.toString()
}

function cacheResponse(url: string, data: unknown) {
  if (cache.size >= NETWORK.cacheMaxEntries) cache.delete(cache.keys().next().value as string)
  cache.set(url, { data, expiresAt: Date.now() + NETWORK.cacheTtlMs })
}

function readCache<T>(url: string): T | undefined {
  const entry = cache.get(url)
  if (!entry) return undefined
  cache.delete(url)
  if (entry.expiresAt <= Date.now()) return undefined
  cache.set(url, entry)
  return entry.data as T
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
  let url: string
  try {
    url = resolveApiUrl(pathOrUrl)
  } catch (error) {
    return Promise.reject(error)
  }

  if (signal?.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))

  const cached = readCache<T>(url)
  if (cached !== undefined) return observeWithSignal(Promise.resolve(cached), signal)

  let pending = pendingRequests.get(url)
  if (!pending) {
    const controller = new AbortController()
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, NETWORK.requestTimeoutMs)
    pending = { promise: Promise.resolve(), controller, consumers: 0, settled: false }
    pending.promise = fetch(url, {
      headers: { Accept: 'application/json' },
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status === 404 ? 'Conteúdo não encontrado.' : 'A PokéAPI não respondeu como esperado.', response.status)
        const data: unknown = await response.json()
        if (data === null || typeof data !== 'object') {
          throw new ApiError('A PokéAPI retornou dados inválidos.', response.status, 'invalid-response')
        }
        cacheResponse(url, data)
        return data
      })
      .catch((error: unknown) => {
        if (timedOut) throw new ApiError('A PokéAPI demorou demais para responder.', undefined, 'timeout')
        throw error
      })
      .finally(() => {
        window.clearTimeout(timeout)
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
