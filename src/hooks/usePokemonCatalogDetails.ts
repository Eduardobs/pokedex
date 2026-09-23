import { useCallback, useEffect, useState } from 'react'
import {
  fetchPokemonRarityDetails,
  fetchPokemonRegionDetails,
  fetchPokemonSortDetails,
  type PokemonRarityDetails,
  type PokemonRegion,
} from '../lib/pokemon-catalog'
import {
  pokemonSortNeedsDetails,
  type PokemonSortDetails,
  type PokemonSortKey,
} from '../lib/pokemon-sort'

type CatalogDetailsState<T> = {
  data: T | null
  loading: boolean
  error: boolean
  retry: () => void
}

function useCatalogDetails<T>(
  enabled: boolean,
  fetchDetails: (signal: AbortSignal) => Promise<T>,
): CatalogDetailsState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError(false)
      return
    }
    if (data) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)
    fetchDetails(controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) setData(details)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [data, enabled, fetchDetails, retryToken])

  const retry = useCallback(() => {
    setData(null)
    setRetryToken((value) => value + 1)
  }, [])

  return { data, loading, error, retry }
}

type PokemonCatalogDetailsOptions = {
  hasRarityFilter: boolean
  region: PokemonRegion | 'all'
  sort: PokemonSortKey
}

export function usePokemonCatalogDetails({
  hasRarityFilter,
  region,
  sort,
}: PokemonCatalogDetailsOptions) {
  const rarity = useCatalogDetails<Record<string, PokemonRarityDetails>>(
    hasRarityFilter,
    fetchPokemonRarityDetails,
  )
  const regions = useCatalogDetails<Record<string, PokemonRegion>>(
    region !== 'all',
    fetchPokemonRegionDetails,
  )
  const sorting = useCatalogDetails<Record<string, PokemonSortDetails>>(
    pokemonSortNeedsDetails(sort),
    fetchPokemonSortDetails,
  )

  return { rarity, regions, sorting }
}
