import { Search } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { EmptyState, InlineRetryError } from '../components/FeedbackState'
import { CardSkeleton } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { PokemonCatalogFilters } from '../components/PokemonCatalogFilters'
import { PokemonCard } from '../components/PokemonCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { usePokemonCatalogControls } from '../hooks/usePokemonCatalogControls'
import { usePokemonCatalogDetails } from '../hooks/usePokemonCatalogDetails'
import { formatNumber, pokemonListItems, prettyName } from '../lib/api'
import {
  filterPokemonCatalogMetadata,
  pokemonSearchSuggestions,
  pokemonSortMetricLabel,
} from '../lib/pokemon-directory'
import { filterPokemonList, getPokemonSortValue, sortPokemonList } from '../lib/pokemon-sort'
import { POKEMON_CATALOG_LIMIT } from '../config/app'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const LIMIT = 24
export function PokedexPage() {
  const { language, t } = useLanguage()
  const {
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
  } = usePokemonCatalogControls(LIMIT)
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
  const endpoint = type === 'all' ? `pokemon?limit=${POKEMON_CATALOG_LIMIT}&offset=0` : `type/${type}`
  const { data, loading, error, retry } = useApi<ApiList | { pokemon: { pokemon: NamedResource }[] }>(endpoint)

  const catalog = useMemo<PokemonListItem[]>(() => {
    if (!data) return []
    return pokemonListItems('results' in data ? data.results : data.pokemon.map((entry) => entry.pokemon))
  }, [data])
  const scopedCatalog = useMemo(
    () =>
      filterPokemonCatalogMetadata(catalog, {
        region,
        regionDetails,
        legendary,
        mythical,
        rarityDetails,
      }),
    [catalog, legendary, mythical, rarityDetails, region, regionDetails],
  )
  const filteredPokemon = useMemo(() => filterPokemonList(scopedCatalog, deferredQuery), [deferredQuery, scopedCatalog])
  const suggestions = useMemo(
    () => pokemonSearchSuggestions(scopedCatalog, deferredQuery),
    [deferredQuery, scopedCatalog],
  )
  const sortedPokemon = useMemo(
    () => sortPokemonList(filteredPokemon, sort, direction, pokemonDetails, language),
    [direction, filteredPokemon, language, pokemonDetails, sort],
  )
  const visiblePokemon = useMemo(() => sortedPokemon.slice(0, visibleCount), [sortedPokemon, visibleCount])
  const total = catalog.length
  const hasMore = visibleCount < sortedPokemon.length

  const loadMore = useCallback(() => {
    if (loading || sortingDetails || !hasMore) return
    setVisibleCount((current) => Math.min(current + LIMIT, sortedPokemon.length))
  }, [hasMore, loading, setVisibleCount, sortedPokemon.length, sortingDetails])

  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && !sortingDetails,
    onLoadMore: loadMore,
    observationKey: visibleCount,
  })

  const selectType = (value: string) => updateSearchParam('type', value, 'all')
  const changeQuery = (value: string) => updateSearchParam('q', value)
  const changeSort = (value: typeof sort) => updateSearchParam('sort', value, 'number')
  const changeDirection = (value: typeof direction) => updateSearchParam('order', value, 'asc')
  const changeRegion = (value: string) => updateSearchParam('region', value, 'all')
  const changeRarityFilter = (filter: 'legendary' | 'mythical', checked: boolean) =>
    updateSearchParam(filter, checked ? 'true' : '')

  const selectedSortMetric = pokemonSortMetricLabel(sort, t)
  const hasResultFilter = Boolean(query || type !== 'all' || region !== 'all' || hasRarityFilter)
  const hasActiveFilters = hasResultFilter || sort !== 'number' || direction !== 'asc'
  const isRarityPending = hasRarityFilter && !rarityDetails && rarity.loading
  const isRegionPending = region !== 'all' && !regionDetails && regions.loading
  const isFilterPending = isRarityPending || isRegionPending

  return (
    <section className="page content-width">
      <PageHeader
        eyebrow={t('pokedex.eyebrow')}
        title={t('pokedex.title')}
        description={t('pokedex.description')}
        aside={
          <div className="result-count" aria-live="polite">
            <b>{isFilterPending ? '…' : formatNumber(hasResultFilter ? filteredPokemon.length : total, language)}</b>
            <span>{hasResultFilter ? t('pokedex.results') : t('pokedex.registered')}</span>
          </div>
        }
      />
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
        onClearFilters={clearSearchParams}
        shiny={shiny}
        onShinyChange={setShiny}
      />
      {(loading && !catalog.length) || isFilterPending ? (
        <CardSkeleton count={12} />
      ) : regionError && region !== 'all' && !regionDetails ? (
        <InlineRetryError message={t('pokedex.region.error')} retryLabel={t('common.retry')} onRetry={regions.retry} />
      ) : rarityError && hasRarityFilter && !rarityDetails ? (
        <InlineRetryError message={t('pokedex.rarity.error')} retryLabel={t('common.retry')} onRetry={rarity.retry} />
      ) : error && !catalog.length ? (
        <InlineRetryError message={t('pokedex.loadError')} retryLabel={t('common.retry')} onRetry={retry} />
      ) : visiblePokemon.length ? (
        <div className="pokemon-grid">
          {visiblePokemon.map((pokemon) => {
            const value = getPokemonSortValue(pokemonDetails[pokemon.name], sort)
            const sortMetric = value === undefined ? undefined : { label: selectedSortMetric, value }
            return <PokemonCard key={pokemon.name} {...pokemon} sortMetric={sortMetric} shiny={shiny} />
          })}
        </div>
      ) : (
        <EmptyState icon={<Search />} title={t('pokedex.empty')} description={t('pokedex.tryAnother')} />
      )}
      {hasMore && (
        <div ref={loadMoreRef} className="infinite-loader" role="status" aria-live="polite">
          <span className="pokeball-spinner" />
          <button onClick={loadMore} disabled={loading || sortingDetails}>
            {loading ? t('pokedex.loadingMore') : sortingDetails ? t('pokedex.sort.loading') : t('pokedex.loadMore')}
          </button>
        </div>
      )}
      {!hasMore && visiblePokemon.length > 0 && <p className="end-of-list">{t('pokedex.end')}</p>}
    </section>
  )
}
