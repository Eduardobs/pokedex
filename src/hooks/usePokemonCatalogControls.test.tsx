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
  it('accepts supported catalog parameters and safely falls back from invalid values', () => {
    const { result } = renderHook(() => usePokemonCatalogControls(24), {
      wrapper: wrapper(
        '/pokemon?q=pika&type=invalid&region=kanto&sort=attack&order=desc&legendary=true',
      ),
    })

    expect(result.current).toMatchObject({
      query: 'pika',
      type: 'all',
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
    const { result } = renderHook(
      () => ({ controls: usePokemonCatalogControls(24), location: useLocation() }),
      { wrapper: wrapper('/formas?category=mega&type=fire') },
    )

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
