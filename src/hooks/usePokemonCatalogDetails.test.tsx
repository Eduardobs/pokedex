import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPokemonRarityDetails,
  fetchPokemonRegionDetails,
  fetchPokemonSortDetails,
} from '../lib/pokemon-catalog'
import { usePokemonCatalogDetails } from './usePokemonCatalogDetails'

vi.mock('../lib/pokemon-catalog', () => ({
  fetchPokemonRarityDetails: vi.fn(),
  fetchPokemonRegionDetails: vi.fn(),
  fetchPokemonSortDetails: vi.fn(),
}))

const fetchRarity = vi.mocked(fetchPokemonRarityDetails)
const fetchRegions = vi.mocked(fetchPokemonRegionDetails)
const fetchSorting = vi.mocked(fetchPokemonSortDetails)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('usePokemonCatalogDetails', () => {
  it('loads only the metadata required by active filters', async () => {
    fetchRegions.mockResolvedValue({ pikachu: 'kanto' })

    const { result } = renderHook(() =>
      usePokemonCatalogDetails({ hasRarityFilter: false, region: 'kanto', sort: 'number' }),
    )

    expect(result.current.regions.loading).toBe(true)
    await waitFor(() => expect(result.current.regions.data).toEqual({ pikachu: 'kanto' }))
    expect(fetchRegions).toHaveBeenCalledOnce()
    expect(fetchRarity).not.toHaveBeenCalled()
    expect(fetchSorting).not.toHaveBeenCalled()
  })

  it('retries a failed request and exposes the recovered data', async () => {
    fetchRarity
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ mew: { isLegendary: false, isMythical: true } })

    const { result } = renderHook(() =>
      usePokemonCatalogDetails({ hasRarityFilter: true, region: 'all', sort: 'number' }),
    )

    await waitFor(() => expect(result.current.rarity.error).toBe(true))
    act(() => result.current.rarity.retry())
    await waitFor(() =>
      expect(result.current.rarity.data).toEqual({
        mew: { isLegendary: false, isMythical: true },
      }),
    )
    expect(fetchRarity).toHaveBeenCalledTimes(2)
  })

  it('aborts active requests when the consumer unmounts', () => {
    let signal: AbortSignal | undefined
    fetchSorting.mockImplementation((requestSignal) => {
      signal = requestSignal
      return new Promise(() => undefined)
    })

    const { unmount } = renderHook(() =>
      usePokemonCatalogDetails({ hasRarityFilter: false, region: 'all', sort: 'attack' }),
    )
    expect(signal?.aborted).toBe(false)

    unmount()

    expect(signal?.aborted).toBe(true)
  })
})
