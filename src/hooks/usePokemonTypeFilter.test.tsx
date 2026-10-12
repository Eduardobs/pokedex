import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../lib/api'
import type { PokemonType } from '../lib/pokemon-directory'
import { usePokemonTypeFilter } from './usePokemonTypeFilter'

vi.mock('../lib/api', () => ({ apiFetch: vi.fn() }))
const fetchMock = vi.mocked(apiFetch)
const response = (...names: string[]) => ({
  pokemon: names.map((name) => ({ pokemon: { name, url: `pokemon/${name}` } })),
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('usePokemonTypeFilter', () => {
  it('does not fetch types when no filter is selected', () => {
    const { result } = renderHook(() => usePokemonTypeFilter([]))
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('waits for both type responses before showing their intersection', async () => {
    let resolveIce: (value: unknown) => void = () => undefined
    fetchMock.mockImplementation((path) =>
      path === 'type/water'
        ? Promise.resolve(response('squirtle', 'lapras'))
        : new Promise((resolve) => {
            resolveIce = resolve
          }),
    )
    const { result } = renderHook(() => usePokemonTypeFilter(['water', 'ice']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => undefined)
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)
    await act(async () => resolveIce(response('lapras', 'jynx')))
    expect(result.current.data?.map(({ name }) => name)).toEqual(['lapras'])
    expect(result.current.loading).toBe(false)
  })

  it('returns an empty list when the selected types have no Pokémon in common', async () => {
    fetchMock.mockImplementation((path) => Promise.resolve(response(path === 'type/water' ? 'squirtle' : 'jynx')))
    const { result } = renderHook(() => usePokemonTypeFilter(['water', 'ice']))
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  it.each(['type/water', 'type/ice'])('retries only the failed request for %s', async (failedPath) => {
    let failed = false
    fetchMock.mockImplementation((path) => {
      if (path === failedPath && !failed) {
        failed = true
        return Promise.reject(new Error('network unavailable'))
      }
      return Promise.resolve(response('lapras'))
    })
    const { result } = renderHook(() => usePokemonTypeFilter(['water', 'ice']))
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(result.current.data).toBeNull()
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.data?.map(({ name }) => name)).toEqual(['lapras']))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(failedPath)
  })

  it('cancels obsolete selections and ignores responses that arrive after the change', async () => {
    let resolveIce: (value: unknown) => void = () => undefined
    let iceSignal: AbortSignal | undefined
    fetchMock.mockImplementation((path, signal) => {
      if (path === 'type/ice') {
        iceSignal = signal
        return new Promise((resolve) => {
          resolveIce = resolve
        })
      }
      return Promise.resolve(response(path === 'type/water' ? 'lapras' : 'jynx'))
    })
    const { result, rerender } = renderHook(({ types }) => usePokemonTypeFilter(types), {
      initialProps: { types: ['water', 'ice'] as PokemonType[] },
    })
    await act(async () => undefined)
    rerender({ types: ['psychic'] })
    expect(iceSignal?.aborted).toBe(true)
    await waitFor(() => expect(result.current.data?.map(({ name }) => name)).toEqual(['jynx']))
    await act(async () => resolveIce(response('lapras')))
    expect(result.current.data?.map(({ name }) => name)).toEqual(['jynx'])
    rerender({ types: [] })
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
