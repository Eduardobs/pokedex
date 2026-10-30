import { afterEach, expect, it, vi } from 'vitest'
import { NETWORK, POKEMON_3D_API_URL } from '../config/app'

const catalog = [{ id: 25, forms: [] }]

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function setup() {
  vi.resetModules()
  return (await import('./pokemon-3d')).fetchPokemon3D
}

it('shares transport, omits credentials and caches only within the configured lifetime', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn().mockImplementation(async () => Response.json(catalog))
  vi.stubGlobal('fetch', fetch)
  const load = await setup()
  const first = load(new AbortController().signal)
  const second = load(new AbortController().signal)
  expect(await first).toEqual(catalog)
  expect(await second).toEqual(catalog)
  expect(fetch).toHaveBeenCalledExactlyOnceWith(POKEMON_3D_API_URL, {
    signal: expect.any(AbortSignal),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  await load(new AbortController().signal)
  expect(fetch).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(NETWORK.cacheTtlMs + 1)
  await load(new AbortController().signal)
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('lets one consumer cancel without interrupting another consumer', async () => {
  let resolve!: (response: Response) => void
  const fetch = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done
      }),
  )
  vi.stubGlobal('fetch', fetch)
  const load = await setup()
  const consumer = new AbortController()
  const first = load(consumer.signal)
  const firstRejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
  const second = load(new AbortController().signal)
  consumer.abort()
  await firstRejected
  const transport = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].signal!
  expect(transport.aborted).toBe(false)
  resolve(Response.json(catalog))
  expect(await second).toEqual(catalog)
})

it('aborts abandoned transport and starts a fresh request for a new consumer', async () => {
  const fetch = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal!.addEventListener('abort', () => reject(options.signal!.reason), { once: true })
      }),
  )
  vi.stubGlobal('fetch', fetch)
  const load = await setup()
  const consumer = new AbortController()
  const request = load(consumer.signal)
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
  consumer.abort()
  await rejected
  expect(fetch.mock.calls[0][1].signal!.aborted).toBe(true)
  fetch.mockImplementationOnce(async () => Response.json(catalog))
  expect(await load(new AbortController().signal)).toEqual(catalog)
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('does not start a request for an already aborted consumer', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const load = await setup()
  const controller = new AbortController()
  controller.abort()
  await expect(load(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetch).not.toHaveBeenCalled()
})

it('does not cache HTTP failures or malformed catalogs and supports retry', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    .mockResolvedValueOnce(Response.json({ unexpected: [] }))
    .mockResolvedValueOnce(Response.json(catalog))
  vi.stubGlobal('fetch', fetch)
  const load = await setup()
  await expect(load(new AbortController().signal)).rejects.toMatchObject({ status: 503 })
  await expect(load(new AbortController().signal)).rejects.toMatchObject({ code: 'invalid-response' })
  expect(await load(new AbortController().signal)).toEqual(catalog)
  expect(fetch).toHaveBeenCalledTimes(3)
})

it('bounds request lifetime and releases the failed request for retry', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal!.addEventListener('abort', () => reject(options.signal!.reason), { once: true })
      }),
  )
  vi.stubGlobal('fetch', fetch)
  const load = await setup()
  const rejected = expect(load(new AbortController().signal)).rejects.toMatchObject({ name: 'TimeoutError' })
  await vi.advanceTimersByTimeAsync(NETWORK.requestTimeoutMs)
  await rejected
  expect(fetch.mock.calls[0][1].signal!.aborted).toBe(true)
  fetch.mockImplementationOnce(async () => Response.json(catalog))
  expect(await load(new AbortController().signal)).toEqual(catalog)
})
