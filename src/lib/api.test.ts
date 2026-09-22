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

describe('utilitários da PokéAPI', () => {
  it('extrai o id de uma URL', () => expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25))
  it('mantém apenas as variedades padrão na listagem da Pokédex', () => {
    expect(pokemonListItems([
      { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
      { name: 'venusaur-mega', url: 'https://pokeapi.co/api/v2/pokemon/10033/' },
      { name: 'rattata-alola', url: 'https://pokeapi.co/api/v2/pokemon/10091/' },
      { name: 'charizard-gmax', url: 'https://pokeapi.co/api/v2/pokemon/10196/' },
    ])).toEqual([
      { id: 3, name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
    ])
  })
  it('formata nomes técnicos', () => expect(prettyName('special-attack')).toBe('Special Attack'))
  it('prioriza tradução em português', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
    { language: { name: 'pt-br' }, flavor_text: 'Português' },
  ])).toBe('Português'))
  it('seleciona o idioma solicitado', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
    { language: { name: 'es' }, flavor_text: 'Español' },
  ], undefined, 'es')).toBe('Español'))
  it('usa inglês quando a tradução solicitada não existe', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
  ], undefined, 'es')).toBe('English'))
  it('traduz nomes localizados', () => expect(localizedName([
    { language: { name: 'en' }, name: 'Thunder Punch' },
    { language: { name: 'es' }, name: 'Puño Trueno' },
  ], 'es')).toBe('Puño Trueno'))

  it('normaliza acentos, símbolos e espaços para busca', () => {
    expect(normalizeSearchText('  Flabébé — Forma_Eterna! ')).toBe('flabebe forma eterna')
  })

  it('informa quando precisou usar outro idioma e higieniza quebras de linha', () => {
    expect(localizedTextResult([
      { language: { name: 'en' }, effect: 'First line\nsecond\fline' },
    ], ['effect'], 'es')).toEqual({
      text: 'First line second line',
      language: 'en',
      fallback: true,
    })
  })

  it('retorna texto vazio para coleções e campos inválidos', () => {
    expect(localizedTextResult(null)).toEqual({ text: '', language: 'pt-br', fallback: false })
    expect(localizedText([{ language: { name: 'pt-br' }, flavor_text: 123 }])).toBe('')
    expect(localizedName([{ language: { name: 'pt-br' }, name: 123 }])).toBe('')
  })

  it('aceita somente URLs HTTPS da PokéAPI v2', async () => {
    expect(resolveApiUrl('pokemon/25')).toBe('https://pokeapi.co/api/v2/pokemon/25')
    expect(resolveApiUrl('/pokemon/25#sprites')).toBe('https://pokeapi.co/api/v2/pokemon/25')
    expect(() => resolveApiUrl('https://pokeapi.co/api/v2/pokemon/25/')).not.toThrow()
    expect(() => resolveApiUrl('https://pokeapi.co.evil.example/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('http://pokeapi.co/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('https://pokeapi.co/api/v20/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('https://user:password@pokeapi.co/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('   ')).toThrow(ApiError)
    await expect(apiFetch('https://evil.example/collect')).rejects.toMatchObject({ code: 'unsafe-url' })
  })

  it('reaproveita respostas em cache depois que o transporte termina', async () => {
    const response = { id: 10004, name: 'cached' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    )

    await expect(apiFetch<typeof response>('pokemon/10004')).resolves.toEqual(response)
    await expect(apiFetch<typeof response>('pokemon/10004')).resolves.toEqual(response)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }))
  })

  it('não armazena falhas em cache e permite tentar novamente', async () => {
    const response = { id: 10005, name: 'retry-success' }
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }))

    await expect(apiFetch('pokemon/10005')).rejects.toMatchObject({ status: 503, code: 'http' })
    await expect(apiFetch<typeof response>('pokemon/10005')).resolves.toEqual(response)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('diferencia conteúdo inexistente de uma resposta inválida', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('null', { status: 200 }))

    await expect(apiFetch('pokemon/10006')).rejects.toMatchObject({
      message: 'Conteúdo não encontrado.',
      status: 404,
      code: 'http',
    })
    await expect(apiFetch('pokemon/10007')).rejects.toMatchObject({ code: 'invalid-response' })
  })

  it('não inicia o transporte para um consumidor já cancelado', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const controller = new AbortController()
    controller.abort()

    await expect(apiFetch('pokemon/10008', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('converte cancelamento por tempo excedido em um erro de timeout', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))

    const request = apiFetch('pokemon/10009')
    const assertion = expect(request).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
  })

  it('reaproveita uma requisição em andamento para a mesma URL', async () => {
    const response = { id: 10001, name: 'deduplicated' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    )

    const first = apiFetch<typeof response>('pokemon/10001')
    const second = apiFetch<typeof response>('pokemon/10001')

    await expect(Promise.all([first, second])).resolves.toEqual([response, response])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cancela apenas o consumidor, sem descartar a requisição compartilhada', async () => {
    let finishRequest: ((value: Response) => void) | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((resolve) => { finishRequest = resolve }))
    const controller = new AbortController()
    const cancelled = apiFetch<{ id: number }>('pokemon/10002', controller.signal)
    const active = apiFetch<{ id: number }>('pokemon/10002')

    controller.abort()
    finishRequest?.(new Response(JSON.stringify({ id: 10002 }), { status: 200 }))

    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
    await expect(active).resolves.toEqual({ id: 10002 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('interrompe o transporte quando não há mais consumidores', async () => {
    let transportSignal: AbortSignal | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      transportSignal = init?.signal ?? undefined
      return new Promise((_resolve, reject) => {
        transportSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
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
