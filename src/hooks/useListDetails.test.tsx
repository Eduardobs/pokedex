import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAbilityListDetails } from './useAbilityListDetails'
import { useMoveListDetails } from './useMoveListDetails'

const { fetchAbilityListDetailsMock, fetchMoveListDetailsMock } = vi.hoisted(() => ({
  fetchAbilityListDetailsMock: vi.fn(),
  fetchMoveListDetailsMock: vi.fn(),
}))

vi.mock('../lib/ability-catalog', () => ({ fetchAbilityListDetails: fetchAbilityListDetailsMock }))
vi.mock('../lib/move-catalog', () => ({ fetchMoveListDetails: fetchMoveListDetailsMock }))

const ability = { name: 'lightning-rod', url: 'https://pokeapi.co/api/v2/ability/31/' }
const move = { name: 'thunderbolt', url: 'https://pokeapi.co/api/v2/move/85/' }

afterEach(() => {
  cleanup()
  fetchAbilityListDetailsMock.mockReset()
  fetchMoveListDetailsMock.mockReset()
})

describe('list detail hooks', () => {
  it('loads ability details for valid resource IDs and reloads them for a language change', async () => {
    fetchAbilityListDetailsMock
      .mockResolvedValueOnce({ 'lightning-rod': { id: 31, name: 'lightning-rod', effectEntries: [] } })
      .mockResolvedValueOnce({ 'lightning-rod': { id: 31, name: 'lightning-rod', effectEntries: [] } })
    const { result, rerender } = renderHook(
      ({ language }: { language: 'pt-br' | 'en' | 'es' }) =>
        useAbilityListDetails([ability, { url: 'not-an-id' }], language),
      { initialProps: { language: 'pt-br' as 'pt-br' | 'en' | 'es' } },
    )

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data?.['lightning-rod']?.id).toBe(31))
    expect(fetchAbilityListDetailsMock).toHaveBeenCalledWith([31], 'pt-br', expect.any(AbortSignal))

    rerender({ language: 'en' })
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchAbilityListDetailsMock).toHaveBeenLastCalledWith([31], 'en', expect.any(AbortSignal))
  })

  it('exposes an ability failure and retries it without changing resources', async () => {
    fetchAbilityListDetailsMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ 'lightning-rod': { id: 31, name: 'lightning-rod', effectEntries: [] } })
    const { result } = renderHook(() => useAbilityListDetails([ability], 'en'))

    await waitFor(() => expect(result.current.error).toHaveProperty('message', 'offline'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.data?.['lightning-rod']?.id).toBe(31))
    expect(fetchAbilityListDetailsMock).toHaveBeenCalledTimes(2)
  })

  it('keeps move loading inactive when no valid IDs exist', () => {
    const { result } = renderHook(() =>
      useMoveListDetails([{ url: 'https://pokeapi.co/api/v2/move/not-a-number/' }], 'es'),
    )

    expect(result.current).toMatchObject({ data: null, error: null, loading: false })
    expect(fetchMoveListDetailsMock).not.toHaveBeenCalled()
  })

  it('aborts an active move request when its consumer unmounts', () => {
    let requestSignal: AbortSignal | undefined
    fetchMoveListDetailsMock.mockImplementation((_ids, _language, signal: AbortSignal) => {
      requestSignal = signal
      return new Promise(() => undefined)
    })
    const { unmount } = renderHook(() => useMoveListDetails([move], 'pt-br'))

    expect(requestSignal?.aborted).toBe(false)
    unmount()
    expect(requestSignal?.aborted).toBe(true)
  })
})
