import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, idFromUrl, localizedName, localizedText, prettyName, resolveApiUrl } from './api'

describe('utilitários da PokéAPI', () => {
  it('extrai o id de uma URL', () => expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25))
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

  it('aceita somente URLs HTTPS da PokéAPI v2', async () => {
    expect(resolveApiUrl('pokemon/25')).toBe('https://pokeapi.co/api/v2/pokemon/25')
    expect(() => resolveApiUrl('https://pokeapi.co/api/v2/pokemon/25/')).not.toThrow()
    expect(() => resolveApiUrl('https://pokeapi.co.evil.example/api/v2/pokemon/25')).toThrow(ApiError)
    expect(() => resolveApiUrl('http://pokeapi.co/api/v2/pokemon/25')).toThrow(ApiError)
    await expect(apiFetch('https://evil.example/collect')).rejects.toMatchObject({ code: 'unsafe-url' })
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
    fetchMock.mockRestore()
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
    fetchMock.mockRestore()
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
    fetchMock.mockRestore()
  })
})
