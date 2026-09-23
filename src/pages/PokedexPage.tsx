import { Search } from 'lucide-react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CardSkeleton } from '../components/Loading'
import { PokemonCatalogFilters } from '../components/PokemonCatalogFilters'
import { PokemonCard } from '../components/PokemonCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { usePokemonCatalogDetails } from '../hooks/usePokemonCatalogDetails'
import { formatNumber, normalizeSearchText, pokemonListItems, prettyName } from '../lib/api'
import {
  isPokemonRegion,
  POKEMON_SORT_KEYS,
  POKEMON_TYPES,
  pokemonSortMetricLabel,
} from '../lib/pokemon-directory'
import {
  filterPokemonList,
  getPokemonSortValue,
  sortPokemonList,
  type PokemonSortDirection,
  type PokemonSortKey,
} from '../lib/pokemon-sort'
import { POKEMON_CATALOG_LIMIT } from '../config/app'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const LIMIT = 24
export function PokedexPage() {
  const { language, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query)
  const requestedType = searchParams.get('type') ?? 'all'
  const type = POKEMON_TYPES.includes(requestedType as (typeof POKEMON_TYPES)[number])
    ? requestedType
    : 'all'
  const requestedRegion = searchParams.get('region') ?? 'all'
  const region = isPokemonRegion(requestedRegion) ? requestedRegion : 'all'
  const requestedSort = searchParams.get('sort') as PokemonSortKey | null
  const sort = requestedSort && POKEMON_SORT_KEYS.includes(requestedSort) ? requestedSort : 'number'
  const direction: PokemonSortDirection = searchParams.get('order') === 'desc' ? 'desc' : 'asc'
  const legendary = searchParams.get('legendary') === 'true'
  const mythical = searchParams.get('mythical') === 'true'
  const hasRarityFilter = legendary || mythical
  const [visibleCount, setVisibleCount] = useState(LIMIT)
  const [shiny, setShiny] = useState(false)
  const { rarity, regions, sorting } = usePokemonCatalogDetails({
    hasRarityFilter,
    region,
    sort,
  })
  const rarityDetails = rarity.data
  const regionDetails = regions.data
  const pokemonDetails = useMemo(() => sorting.data ?? {}, [sorting.data])
  const sortingDetails = sorting.loading
  const sortError = sorting.error
  const rarityError = rarity.error
  const regionError = regions.error
  const endpoint =
    type === 'all' ? `pokemon?limit=${POKEMON_CATALOG_LIMIT}&offset=0` : `type/${type}`
  const { data, loading, error, retry } = useApi<
    ApiList | { pokemon: { pokemon: NamedResource }[] }
  >(endpoint)

  const catalog = useMemo<PokemonListItem[]>(() => {
    if (!data) return []
    return pokemonListItems(
      'results' in data ? data.results : data.pokemon.map((entry) => entry.pokemon),
    )
  }, [data])
  const regionCatalog = useMemo(() => {
    if (region === 'all') return catalog
    if (!regionDetails) return []
    return catalog.filter((pokemon) => regionDetails[pokemon.name] === region)
  }, [catalog, region, regionDetails])
  const rarityCatalog = useMemo(() => {
    if (!hasRarityFilter) return regionCatalog
    if (!rarityDetails) return []
    return regionCatalog.filter((pokemon) => {
      const rarity = rarityDetails[pokemon.name]
      return Boolean((legendary && rarity?.isLegendary) || (mythical && rarity?.isMythical))
    })
  }, [hasRarityFilter, legendary, mythical, rarityDetails, regionCatalog])
  const filteredPokemon = useMemo(
    () => filterPokemonList(rarityCatalog, deferredQuery),
    [deferredQuery, rarityCatalog],
  )
  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredQuery)
    if (!normalizedQuery || !/[a-z]/.test(normalizedQuery)) return []

    return rarityCatalog
      .filter((pokemon) => normalizeSearchText(pokemon.name).includes(normalizedQuery))
      .sort((left, right) => {
        const leftStartsWith = normalizeSearchText(left.name).startsWith(normalizedQuery)
        const rightStartsWith = normalizeSearchText(right.name).startsWith(normalizedQuery)
        if (leftStartsWith !== rightStartsWith) return leftStartsWith ? -1 : 1
        return left.id - right.id
      })
      .slice(0, 7)
  }, [deferredQuery, rarityCatalog])
  const sortedPokemon = useMemo(
    () => sortPokemonList(filteredPokemon, sort, direction, pokemonDetails, language),
    [direction, filteredPokemon, language, pokemonDetails, sort],
  )
  const visiblePokemon = useMemo(
    () => sortedPokemon.slice(0, visibleCount),
    [sortedPokemon, visibleCount],
  )
  const total = catalog.length
  const hasMore = visibleCount < sortedPokemon.length

  const loadMore = useCallback(() => {
    if (loading || sortingDetails || !hasMore) return
    setVisibleCount((current) => Math.min(current + LIMIT, sortedPokemon.length))
  }, [hasMore, loading, sortedPokemon.length, sortingDetails])

  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && !sortingDetails,
    onLoadMore: loadMore,
    observationKey: visibleCount,
  })

  const selectType = (nextType: string) => {
    if (nextType === type) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (nextType === 'all') next.delete('type')
        else next.set('type', nextType)
        return next
      },
      { replace: true },
    )
    setVisibleCount(LIMIT)
  }

  const changeQuery = (nextQuery: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (nextQuery) next.set('q', nextQuery)
        else next.delete('q')
        return next
      },
      { replace: true },
    )
    setVisibleCount(LIMIT)
  }

  const changeSort = (nextSort: PokemonSortKey) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (nextSort === 'number') next.delete('sort')
        else next.set('sort', nextSort)
        return next
      },
      { replace: true },
    )
    setVisibleCount(LIMIT)
  }

  const changeDirection = (nextDirection: PokemonSortDirection) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (nextDirection === 'asc') next.delete('order')
        else next.set('order', nextDirection)
        return next
      },
      { replace: true },
    )
    setVisibleCount(LIMIT)
  }

  const changeRegion = (nextRegion: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (nextRegion === 'all') next.delete('region')
        else next.set('region', nextRegion)
        return next
      },
      { replace: true },
    )
    setVisibleCount(LIMIT)
  }

  const changeRarityFilter = (filter: 'legendary' | 'mythical', checked: boolean) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (checked) next.set(filter, 'true')
        else next.delete(filter)
        return next
      },
      { replace: true },
    )
    setVisibleCount(LIMIT)
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
    setVisibleCount(LIMIT)
  }

  const selectedSortMetric = pokemonSortMetricLabel(sort, t)
  const hasResultFilter = Boolean(query || type !== 'all' || region !== 'all' || hasRarityFilter)
  const hasActiveFilters = hasResultFilter || sort !== 'number' || direction !== 'asc'
  const isRarityPending = hasRarityFilter && !rarityDetails && rarity.loading
  const isRegionPending = region !== 'all' && !regionDetails && regions.loading
  const isFilterPending = isRarityPending || isRegionPending

  return (
    <section className="page content-width">
      <div className="page-title">
        <div>
          <span className="eyebrow">{t('pokedex.eyebrow')}</span>
          <h1>{t('pokedex.title')}</h1>
          <p>{t('pokedex.description')}</p>
        </div>
        <div className="result-count" aria-live="polite">
          <b>
            {isFilterPending
              ? '…'
              : formatNumber(hasResultFilter ? filteredPokemon.length : total, language)}
          </b>
          <span>{hasResultFilter ? t('pokedex.results') : t('pokedex.registered')}</span>
        </div>
      </div>
      <PokemonCatalogFilters
        idPrefix="pokemon"
        query={query}
        searchLabel={t('pokedex.filter')}
        suggestions={suggestions.map((pokemon) => ({
          id: pokemon.id,
          name: pokemon.name,
          label: prettyName(pokemon.name),
        }))}
        onQueryChange={changeQuery}
        type={type}
        typeHelp={t('pokedex.type.help')}
        onTypeChange={selectType}
        region={region}
        onRegionChange={changeRegion}
        regionPending={isRegionPending}
        sort={sort}
        onSortChange={changeSort}
        direction={direction}
        onDirectionChange={changeDirection}
        sorting={sortingDetails}
        sortError={sortError}
        legendary={legendary}
        mythical={mythical}
        onRarityChange={changeRarityFilter}
        rarityPending={isRarityPending}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        shiny={shiny}
        onShinyChange={setShiny}
      />
      {(loading && !catalog.length) || isFilterPending ? (
        <CardSkeleton count={12} />
      ) : regionError && region !== 'all' && !regionDetails ? (
        <div className="inline-error">
          <p>{t('pokedex.region.error')}</p>
          <button className="button secondary" type="button" onClick={regions.retry}>
            {t('common.retry')}
          </button>
        </div>
      ) : rarityError && hasRarityFilter && !rarityDetails ? (
        <div className="inline-error">
          <p>{t('pokedex.rarity.error')}</p>
          <button className="button secondary" type="button" onClick={rarity.retry}>
            {t('common.retry')}
          </button>
        </div>
      ) : error && !catalog.length ? (
        <div className="inline-error">
          <p>{t('pokedex.loadError')}</p>
          <button className="button secondary" type="button" onClick={retry}>
            {t('common.retry')}
          </button>
        </div>
      ) : visiblePokemon.length ? (
        <div className="pokemon-grid">
          {visiblePokemon.map((pokemon) => {
            const value = getPokemonSortValue(pokemonDetails[pokemon.name], sort)
            const sortMetric =
              value === undefined ? undefined : { label: selectedSortMetric, value }
            return (
              <PokemonCard key={pokemon.name} {...pokemon} sortMetric={sortMetric} shiny={shiny} />
            )
          })}
        </div>
      ) : (
        <div className="empty">
          <Search />
          <h2>{t('pokedex.empty')}</h2>
          <p>{t('pokedex.tryAnother')}</p>
        </div>
      )}
      {hasMore && (
        <div ref={loadMoreRef} className="infinite-loader" role="status" aria-live="polite">
          <span className="pokeball-spinner" />
          <button onClick={loadMore} disabled={loading || sortingDetails}>
            {loading
              ? t('pokedex.loadingMore')
              : sortingDetails
                ? t('pokedex.sort.loading')
                : t('pokedex.loadMore')}
          </button>
        </div>
      )}
      {!hasMore && visiblePokemon.length > 0 && <p className="end-of-list">{t('pokedex.end')}</p>}
    </section>
  )
}
