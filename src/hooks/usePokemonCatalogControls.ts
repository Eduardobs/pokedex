import { useCallback, useDeferredValue, useState } from 'react'
import type { PokemonRegion } from '../lib/pokemon-catalog'
import {
  isPokemonRegion,
  parsePokemonTypes,
  POKEMON_SORT_KEYS,
  togglePokemonType,
  type PokemonType,
} from '../lib/pokemon-directory'
import type { PokemonSortDirection, PokemonSortKey } from '../lib/pokemon-sort'
import { useSearchParamUpdater } from './useSearchParamUpdater'

export function usePokemonCatalogControls(pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [shiny, setShiny] = useState(false)
  const resetPagination = useCallback(() => setVisibleCount(pageSize), [pageSize])
  const { searchParams, updateSearchParam, clearSearchParams } = useSearchParamUpdater(resetPagination)

  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query)
  const types = parsePokemonTypes(searchParams.get('type'))
  const selectType = (type: PokemonType | 'all') =>
    updateSearchParam('type', type === 'all' ? '' : togglePokemonType(types, type).join(','))
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
    types,
    selectType,
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
