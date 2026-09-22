import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../lib/api'
import { useApi } from './useApi'

vi.mock('../lib/api', () => ({ apiFetch: vi.fn() }))

const apiFetchMock = vi.mocked(apiFetch)

type PokemonSummary = { name: string }
type Snapshot = { path: string; data: PokemonSummary | null; loading: boolean }

function Probe({ path, snapshots }: { path: string; snapshots: Snapshot[] }) {
  const { data, loading } = useApi<PokemonSummary>(path)
  snapshots.push({ path, data, loading })
  return null
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useApi', () => {
  it('permanece inativo quando não há endpoint', () => {
    const { result } = renderHook(() => useApi<PokemonSummary>(null))

    expect(result.current).toMatchObject({ data: null, error: null, loading: false })
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it('expõe os dados quando a requisição termina', async () => {
    apiFetchMock.mockResolvedValue({ name: 'pikachu' })

    const { result } = renderHook(() => useApi<PokemonSummary>('pokemon/pikachu'))

    expect(result.current.loading).toBe(true)
    await waitFor(() =>
      expect(result.current).toMatchObject({
        data: { name: 'pikachu' },
        error: null,
        loading: false,
      }),
    )
  })

  it('valida e transforma uma resposta antes de publicá-la', async () => {
    apiFetchMock.mockResolvedValue({ name: 'PIKACHU' })
    const parse = (value: unknown): PokemonSummary => ({
      name: String((value as PokemonSummary).name).toLowerCase(),
    })

    const { result } = renderHook(() => useApi<PokemonSummary>('pokemon/pikachu', parse))

    await waitFor(() => expect(result.current.data).toEqual({ name: 'pikachu' }))
  })

  it('expõe como falha uma resposta rejeitada pelo parser', async () => {
    apiFetchMock.mockResolvedValue({ invalid: true })
    const parse = (): PokemonSummary => {
      throw new Error('invalid response')
    }

    const { result } = renderHook(() => useApi<PokemonSummary>('pokemon/pikachu', parse))

    await waitFor(() => expect(result.current).toMatchObject({ data: null, loading: false }))
    expect(result.current.error).toMatchObject({ message: 'invalid response' })
  })

  it('expõe falhas e consegue repetir a requisição', async () => {
    apiFetchMock
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ name: 'raichu' })
    const { result } = renderHook(() => useApi<PokemonSummary>('pokemon/raichu'))

    await waitFor(() =>
      expect(result.current.error).toMatchObject({ message: 'network unavailable' }),
    )

    act(() => result.current.retry())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual({ name: 'raichu' }))
    expect(result.current.error).toBeNull()
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
  })

  it('cancela a requisição ao desmontar sem publicar erro', () => {
    let signal: AbortSignal | undefined
    apiFetchMock.mockImplementation((_path, requestSignal) => {
      signal = requestSignal
      return new Promise(() => undefined)
    })

    const { unmount } = renderHook(() => useApi<PokemonSummary>('pokemon/mew'))
    expect(signal?.aborted).toBe(false)

    unmount()

    expect(signal?.aborted).toBe(true)
  })

  it('does not expose data from the previous path during navigation', async () => {
    let resolveFirst: ((value: PokemonSummary) => void) | undefined
    apiFetchMock.mockImplementation((path) => {
      if (path === 'pokemon/bulbasaur') {
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      }
      return new Promise(() => undefined)
    })
    const snapshots: Snapshot[] = []
    const view = render(<Probe path="pokemon/bulbasaur" snapshots={snapshots} />)

    await act(async () => resolveFirst?.({ name: 'bulbasaur' }))
    await waitFor(() => expect(snapshots.at(-1)?.data?.name).toBe('bulbasaur'))

    snapshots.length = 0
    view.rerender(<Probe path="pokemon/ivysaur" snapshots={snapshots} />)

    expect(snapshots[0]).toEqual({ path: 'pokemon/ivysaur', data: null, loading: true })
  })
})
