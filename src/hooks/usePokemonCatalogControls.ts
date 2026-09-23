import { useCallback, useDeferredValue, useState } from 'react'
import type { PokemonRegion } from '../lib/pokemon-catalog'
import { isPokemonRegion, POKEMON_SORT_KEYS, POKEMON_TYPES } from '../lib/pokemon-directory'
import type { PokemonSortDirection, PokemonSortKey } from '../lib/pokemon-sort'
import { useSearchParamUpdater } from './useSearchParamUpdater'

export function usePokemonCatalogControls(pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [shiny, setShiny] = useState(false)
  const resetPagination = useCallback(() => setVisibleCount(pageSize), [pageSize])
  const { searchParams, updateSearchParam, clearSearchParams } = useSearchParamUpdater(resetPagination)

  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query)
  const requestedType = searchParams.get('type') ?? 'all'
  const type = POKEMON_TYPES.includes(requestedType as (typeof POKEMON_TYPES)[number]) ? requestedType : 'all'
  const requestedRegion = searchParams.get('region') ?? 'all'
  const region: PokemonRegion | 'all' = isPokemonRegion(requestedRegion) ? requestedRegion : 'all'
  const requestedSort = searchParams.get('sort') as PokemonSortKey | null
  const sort = requestedSort && POKEMON_SORT_KEYS.includes(requestedSort) ? requestedSort : 'number'
  const direction: PokemonSortDirection = searchParams.get('order') === 'desc' ? 'desc' : 'asc'
  const legendary = searchParams.get('legendary') === 'true'
  const mythical = searchParams.get('mythical') === 'true'
  const hasRarityFilter = legendary || mythical

  return {
    searchParams,
    query,
    deferredQuery,
    type,
    region,
    sort,
    direction,
    legendary,
    mythical,
    hasRarityFilter,
    visibleCount,
    setVisibleCount,
    shiny,
    setShiny,
    updateSearchParam,
    clearSearchParams,
  }
}
