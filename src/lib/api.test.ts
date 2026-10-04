import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiFetch,
  idFromUrl,
  localizedName,
  localizedText,
  localizedTextResult,
  normalizeSearchText,
  pokemonListItems,
  prettyName,
  resolveApiUrl,
} from './api'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('PokéAPI utilities', () => {
  it('extracts the ID from a URL', () => expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25))
  it('keeps only default varieties in the Pokédex list', () => {
    expect(
      pokemonListItems([
        { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
        { name: 'venusaur-mega', url: 'https://pokeapi.co/api/v2/pokemon/10033/' },
        { name: 'rattata-alola', url: 'https://pokeapi.co/api/v2/pokemon/10091/' },
        { name: 'charizard-gmax', url: 'https://pokeapi.co/api/v2/pokemon/10196/' },
      ]),
    ).toEqual([{ id: 3, name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' }])
  })
  it('formats technical names', () => expect(prettyName('special-attack')).toBe('Special Attack'))
  it('prioritizes the Portuguese translation', () =>
    expect(
      localizedText([
        { language: { name: 'en' }, flavor_text: 'English' },
        { language: { name: 'pt-br' }, flavor_text: 'Portuguese text' },
      ]),
    ).toBe('Portuguese text'))
  it('selects the requested language', () =>
    expect(
      localizedText(
        [
          { language: { name: 'en' }, flavor_text: 'English' },
          { language: { name: 'es' }, flavor_text: 'Español' },
        ],
        undefined,
        'es',
      ),
    ).toBe('Español'))
  it('uses English when the requested translation is unavailable', () =>
    expect(localizedText([{ language: { name: 'en' }, flavor_text: 'English' }], undefined, 'es')).toBe('English'))
  it('translates localized names', () =>
    expect(
      localizedName(
        [
          { language: { name: 'en' }, name: 'Thunder Punch' },
          { language: { name: 'es' }, name: 'Puño Trueno' },
        ],
        'es',
      ),
    ).toBe('Puño Trueno'))

  it('normalizes accents, symbols, and whitespace for search', () => {
    expect(normalizeSearchText('  Flabébé — Eternal_Form! ')).toBe('flabebe eternal form')
  })

  it('reports when another language was required and sanitizes line breaks', () => {
    expect(
      localizedTextResult([{ language: { name: 'en' }, effect: 'First line\nsecond\fline' }], ['effect'], 'es'),
    ).toEqual({
      text: 'First line second line',
      language: 'en',
      fallback: true,
    })
  })

  it('returns empty text for invalid collections and fields', () => {
    expect(localizedTextResult(null)).toEqual({ text: '', language: 'pt-br', fallback: false })
    expect(localizedText([{ language: { name: 'pt-br' }, flavor_text: 123 }])).toBe('')
    expect(localizedName([{ language: { name: 'pt-br' }, name: 123 }])).toBe('')
  })

  it('accepts only PokéAPI v2 HTTPS URLs', async () => {
    expect(resolveApiUrl('pokemon/25')).toBe('https://pokeapi.co/api/v2/pokemon/25')
    expect(resolveApiUrl('/pokemon/25#sprites')).toBe('https://pokeapi.co/api/v2/pokemon/25')
    expect(() => resolveApiUrl('https://pokeapi.co/api/v2/pokemon/25/')).not.toThrow()
    expect(() => resolveApiUrl('https://pokeapi.co.evil.example/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('http://pokeapi.co/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('https://pokeapi.co/api/v20/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('https://user:password@pokeapi.co/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('   ')).toThrow(ApiError)
    await expect(apiFetch('https://evil.example/collect')).rejects.toMatchObject({
      code: 'unsafe-url',
    })
  })

  it('reuses cached responses after transport finishes', async () => {
    const response = { id: 10004, name: 'cached' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(apiFetch<typeof response>('pokemon/10004')).resolves.toEqual(response)
    await expect(apiFetch<typeof response>('pokemon/10004')).resolves.toEqual(response)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      }),
    )
  })

  it('does not cache failures and allows retries', async () => {
    const response = { id: 10005, name: 'retry-success' }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    await expect(apiFetch('pokemon/10005')).rejects.toMatchObject({ status: 503, code: 'http' })
    await expect(apiFetch<typeof response>('pokemon/10005')).resolves.toEqual(response)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('distinguishes missing content from an invalid response', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('null', { status: 200 }))

    await expect(apiFetch('pokemon/10006')).rejects.toMatchObject({
      message: 'Content not found.',
      status: 404,
      code: 'http',
    })
    await expect(apiFetch('pokemon/10007')).rejects.toMatchObject({ code: 'invalid-response' })
  })

  it('rejects REST responses declared too large before processing the body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'content-length': String(9 * 1024 * 1024), 'content-type': 'application/json' },
      }),
    )

    await expect(apiFetch('pokemon/10010')).rejects.toMatchObject({ code: 'invalid-response' })
  })

  it('rejects content explicitly incompatible with JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )

    await expect(apiFetch('pokemon/10011')).rejects.toMatchObject({ code: 'invalid-response' })
  })

  it('does not start transport for an already aborted consumer', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const controller = new AbortController()
    controller.abort()

    await expect(apiFetch('pokemon/10008', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('converts a time-limit cancellation into a timeout error', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true,
          })
        }),
    )

    const request = apiFetch('pokemon/10009')
    const assertion = expect(request).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
  })

  it('reuses an in-flight request for the same URL', async () => {
    const response = { id: 10001, name: 'deduplicated' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const first = apiFetch<typeof response>('pokemon/10001')
    const second = apiFetch<typeof response>('pokemon/10001')

    await expect(Promise.all([first, second])).resolves.toEqual([response, response])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cancels only the consumer without discarding the shared request', async () => {
    let finishRequest: ((value: Response) => void) | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve
      }),
    )
    const controller = new AbortController()
    const cancelled = apiFetch<{ id: number }>('pokemon/10002', controller.signal)
    const active = apiFetch<{ id: number }>('pokemon/10002')

    controller.abort()
    finishRequest?.(
      new Response(JSON.stringify({ id: 10002 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    await expect(active).resolves.toEqual({ id: 10002 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops transport when no consumers remain', async () => {
    let transportSignal: AbortSignal | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      transportSignal = init?.signal ?? undefined
      return new Promise((_resolve, reject) => {
        transportSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        })
      })
    })
    const controller = new AbortController()
    const request = apiFetch('pokemon/10003', controller.signal)

    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    expect(transportSignal?.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
