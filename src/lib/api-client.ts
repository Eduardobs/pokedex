import { withNetworkSlot } from './network-limits'
import { API_BASE_URL, API_ORIGIN, NETWORK } from '../config/app'

type CacheEntry = { data: unknown; expiresAt: number; bytes: number }
type PendingRequest = {
  promise: Promise<unknown>
  controller: AbortController
  consumers: number
  settled: boolean
}

const cache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, PendingRequest>()

export function clearApiCache() {
  cache.clear()
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code: 'http' | 'timeout' | 'unsafe-url' | 'invalid-response' = 'http',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Only the configured HTTPS API is a valid data source, including URLs returned by it. */
export function resolveApiUrl(pathOrUrl: string): string {
  const input = pathOrUrl.trim()
  if (!input || input.length > 2048) throw new ApiError('Invalid API path.', undefined, 'unsafe-url')

  let url: URL
  try {
    const absolute = /^[a-z][a-z\d+.-]*:/i.test(input)
    url = absolute ? new URL(input) : new URL(input.replace(/^\/+/, ''), `${API_BASE_URL}/`)
  } catch {
    throw new ApiError('Invalid API URL.', undefined, 'unsafe-url')
  }

  const apiPath = `${new URL(API_BASE_URL).pathname.replace(/\/+$/, '')}/`
  if (
    url.protocol !== 'https:' ||
    url.origin !== API_ORIGIN ||
    !url.pathname.startsWith(apiPath) ||
    url.username ||
    url.password ||
    /%(?:2f|5c|00)/i.test(url.pathname)
  ) {
    throw new ApiError('API origin is not allowed.', undefined, 'unsafe-url')
  }
  url.hash = ''
  return url.toString()
}

export function evictApiCache(pathOrUrl: string) {
  cache.delete(resolveApiUrl(pathOrUrl))
}

function cacheResponse(url: string, data: unknown) {
  const now = Date.now()
  for (const [key, entry] of cache) if (entry.expiresAt <= now) cache.delete(key)
  const bytes = new TextEncoder().encode(JSON.stringify(data)).byteLength
  if (bytes > NETWORK.cacheMaxBytes) return
  cache.delete(url)
  let total = [...cache.values()].reduce((sum, entry) => sum + entry.bytes, 0)
  while (cache.size && (cache.size >= NETWORK.cacheMaxEntries || total + bytes > NETWORK.cacheMaxBytes)) {
    const key = cache.keys().next().value!
    total -= cache.get(key)!.bytes
    cache.delete(key)
  }
  cache.set(url, { data, bytes, expiresAt: now + NETWORK.cacheTtlMs })
}

function readCache<T>(url: string): T | undefined {
  const entry = cache.get(url)
  if (!entry) return undefined
  cache.delete(url)
  if (entry.expiresAt <= Date.now()) return undefined
  cache.set(url, entry)
  return entry.data as T
}

function validateJsonBounds(value: unknown) {
  let nodes = 0
  const visit = (current: unknown, depth: number) => {
    nodes += 1
    if (nodes > NETWORK.maxJsonNodes || depth > NETWORK.maxJsonDepth)
      throw new ApiError('PokéAPI returned too much data.', undefined, 'invalid-response')
    if (typeof current === 'string' && current.length > NETWORK.maxStringLength)
      throw new ApiError('PokéAPI returned text that is too large.', undefined, 'invalid-response')
    if (Array.isArray(current)) {
      if (current.length > NETWORK.maxArrayItems)
        throw new ApiError('PokéAPI returned a list that is too large.', undefined, 'invalid-response')
      current.forEach((item) => visit(item, depth + 1))
      return
    }
    if (current === null || typeof current !== 'object') return
    const entries = Object.entries(current)
    if (entries.length > NETWORK.maxObjectKeys)
      throw new ApiError('PokéAPI returned an object that is too large.', undefined, 'invalid-response')
    entries.forEach(([key, item]) => {
      if (key.length > NETWORK.maxStringLength) throw new ApiError('Invalid JSON key.', undefined, 'invalid-response')
      visit(item, depth + 1)
    })
  }
  visit(value, 0)
}

export async function readBoundedJsonResponse(
  response: Response,
  maximumBytes: number = NETWORK.maxResponseBytes,
): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (contentType && !/\b(?:application|text)\/[\w.+-]*json\b/i.test(contentType)) {
    await response.body?.cancel()
    throw new ApiError('PokéAPI returned an unexpected format.', response.status, 'invalid-response')
  }
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel()
    throw new ApiError('PokéAPI returned a response that is too large.', response.status, 'invalid-response')
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let text = ''
  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maximumBytes) {
        await reader.cancel()
        throw new ApiError('PokéAPI returned a response that is too large.', response.status, 'invalid-response')
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } else {
    text = await response.text()
    if (new TextEncoder().encode(text).byteLength > maximumBytes) {
      throw new ApiError('PokéAPI returned a response that is too large.', response.status, 'invalid-response')
    }
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ApiError('PokéAPI returned invalid JSON.', response.status, 'invalid-response')
  }
  if (data === null || typeof data !== 'object')
    throw new ApiError('PokéAPI returned invalid data.', response.status, 'invalid-response')
  validateJsonBounds(data)
  return data
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
      (data) => {
        finish()
        resolve(data)
      },
      (error: unknown) => {
        finish()
        reject(error)
      },
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
  if (!pending || pending.controller.signal.aborted) {
    const controller = new AbortController()
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, NETWORK.requestTimeoutMs)
    pending = { promise: Promise.resolve(), controller, consumers: 0, settled: false }
    pending.promise = withNetworkSlot(
      () =>
        fetch(url, {
          redirect: 'error',
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) {
            await response.body?.cancel()
            throw new ApiError(
              response.status === 404 ? 'Content not found.' : 'PokéAPI did not respond as expected.',
              response.status,
            )
          }
          const data = await readBoundedJsonResponse(response, NETWORK.maxRestResponseBytes)
          controller.signal.throwIfAborted()
          cacheResponse(url, data)
          return data
        }),
      controller.signal,
    )
      .catch((error: unknown) => {
        if (timedOut) throw new ApiError('PokéAPI took too long to respond.', undefined, 'timeout')
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
      if (!current.settled && current.consumers === 0 && pendingRequests.get(url) === current)
        current.controller.abort()
    })
  }
  return observeWithSignal(current.promise as Promise<T>, signal, release)
}
