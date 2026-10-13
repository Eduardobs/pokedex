import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { usePokemonCatalogControls } from './usePokemonCatalogControls'

afterEach(cleanup)

function wrapper(initialEntry: string) {
  return function Router({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
}

describe('usePokemonCatalogControls', () => {
  it.each(['', '&type=water', '&type=water,ice'])('clears only types with All from %s', (types) => {
    const { result } = renderHook(() => usePokemonCatalogControls(24), {
      wrapper: wrapper(`/forms?category=mega&q=charizard&order=desc${types}`),
    })
    act(() => result.current.setVisibleCount(72))
    act(() => result.current.selectType('all'))
    expect(result.current.types).toEqual([])
    expect(result.current.searchParams.toString()).toBe('category=mega&q=charizard&order=desc')
    expect(result.current.visibleCount).toBe(24)
  })

  it.each([
    ['', []],
    ['?type=water', ['water']],
    ['?type=water,ice', ['water', 'ice']],
    ['?type=water,invalid,water,ice,psychic', ['ice', 'psychic']],
    ['?type=all', []],
  ])('restores valid ordered selections from %s', (query, types) => {
    const { result } = renderHook(() => usePokemonCatalogControls(24), {
      wrapper: wrapper(`/pokemon${query}`),
    })
    expect(result.current.types).toEqual(types)
  })

  it('persists ordered type selections, resets pagination and preserves other filters', () => {
    const { result } = renderHook(() => usePokemonCatalogControls(24), {
      wrapper: wrapper('/forms?category=mega'),
    })
    act(() => result.current.selectType('water'))
    act(() => result.current.selectType('ice'))
    expect(result.current.searchParams.get('type')).toBe('water,ice')
    act(() => result.current.setVisibleCount(72))
    act(() => result.current.selectType('psychic'))
    expect(result.current.types).toEqual(['ice', 'psychic'])
    expect(result.current.searchParams.get('type')).toBe('ice,psychic')
    expect(result.current.searchParams.get('category')).toBe('mega')
    expect(result.current.visibleCount).toBe(24)
    act(() => result.current.selectType('psychic'))
    expect(result.current.types).toEqual(['ice'])
    act(() => result.current.selectType('ice'))
    expect(result.current.searchParams.has('type')).toBe(false)
  })

  it.each(['true', 'false', 'invalid', ''])('restores the baby filter from the URL value %s', (value) => {
    const { result } = renderHook(() => usePokemonCatalogControls(24), {
      wrapper: wrapper(`/pokemon?baby=${value}`),
    })
    expect(result.current.baby).toBe(value === 'true')
    expect(result.current.hasRarityFilter).toBe(value === 'true')
  })

  it('accepts supported catalog parameters and safely falls back from invalid values', () => {
    const { result } = renderHook(() => usePokemonCatalogControls(24), {
      wrapper: wrapper('/pokemon?q=pika&type=invalid&region=kanto&sort=attack&order=desc&legendary=true'),
    })

    expect(result.current).toMatchObject({
      query: 'pika',
      types: [],
      region: 'kanto',
      sort: 'attack',
      direction: 'desc',
      legendary: true,
      mythical: false,
      hasRarityFilter: true,
      visibleCount: 24,
    })
  })

  it('preserves page-specific parameters, removes defaults and resets pagination', () => {
    const { result } = renderHook(() => ({ controls: usePokemonCatalogControls(24), location: useLocation() }), {
      wrapper: wrapper('/forms?category=mega&type=fire'),
    })

    act(() => result.current.controls.setVisibleCount(72))
    act(() => result.current.controls.updateSearchParam('sort', 'attack', 'number'))

    expect(result.current.controls.visibleCount).toBe(24)
    expect(new URLSearchParams(result.current.location.search)).toEqual(
      new URLSearchParams('category=mega&type=fire&sort=attack'),
    )

    act(() => result.current.controls.updateSearchParam('type', 'all', 'all'))
    expect(new URLSearchParams(result.current.location.search).has('type')).toBe(false)
    expect(new URLSearchParams(result.current.location.search).get('category')).toBe('mega')

    act(() => result.current.controls.clearSearchParams())
    expect(result.current.location.search).toBe('')
  })
})
