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
import { usePokemonCardDetails } from '../hooks/usePokemonCardDetails'
import { usePokemonTypeFilter } from '../hooks/usePokemonTypeFilter'
import { formatNumber, pokemonListItems, prettyName } from '../lib/api'
import {
  filterPokemonCatalogMetadata,
  pokemonSearchSuggestions,
  pokemonSortMetricLabel,
} from '../lib/pokemon-directory'
import { filterPokemonList, getPokemonSortValue, sortPokemonList } from '../lib/pokemon-sort'
import { POKEMON_CATALOG_LIMIT } from '../config/app'
import type { ApiList, PokemonListItem } from '../types'

const LIMIT = 24
export function PokedexPage() {
  const { language, t } = useLanguage()
  const {
    query,
    deferredQuery,
    types,
    selectType,
    region,
    sort,
    direction,
    legendary,
    mythical,
    baby,
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
  const list = useApi<ApiList>(types.length ? null : `pokemon?limit=${POKEMON_CATALOG_LIMIT}&offset=0`)
  const typeFilter = usePokemonTypeFilter(types)
  const { loading, error, retry } = types.length ? typeFilter : list
  const resources = types.length ? typeFilter.data : list.data?.results
  const catalog = useMemo<PokemonListItem[]>(() => pokemonListItems(resources ?? []), [resources])
  const scopedCatalog = useMemo(
    () =>
      filterPokemonCatalogMetadata(catalog, {
        region,
        regionDetails,
        legendary,
        mythical,
        baby,
        rarityDetails,
      }),
    [catalog, legendary, mythical, baby, rarityDetails, region, regionDetails],
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
  const cardDetails = usePokemonCardDetails(
    visiblePokemon.map((pokemon) => pokemon.name),
    'pokemon',
  )
  const total = catalog.length
  const hasMore = visibleCount < sortedPokemon.length

  const loadMore = useCallback(() => {
    if (loading || sortingDetails || cardDetails.loading || !hasMore) return
    setVisibleCount((current) => Math.min(current + LIMIT, sortedPokemon.length))
  }, [cardDetails.loading, hasMore, loading, setVisibleCount, sortedPokemon.length, sortingDetails])

  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && !sortingDetails && !cardDetails.loading,
    onLoadMore: loadMore,
    observationKey: visibleCount,
  })

  const changeQuery = (value: string) => updateSearchParam('q', value)
  const changeSort = (value: typeof sort) => updateSearchParam('sort', value, 'number')
  const changeDirection = (value: typeof direction) => updateSearchParam('order', value, 'asc')
  const changeRegion = (value: string) => updateSearchParam('region', value, 'all')
  const changeRarityFilter = (filter: 'legendary' | 'mythical' | 'baby', checked: boolean) =>
    updateSearchParam(filter, checked ? 'true' : '')

  const selectedSortMetric = pokemonSortMetricLabel(sort, t)
  const hasResultFilter = Boolean(query || types.length > 0 || region !== 'all' || hasRarityFilter)
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
        types={types}
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
        baby={baby}
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
            return (
              <PokemonCard
                key={pokemon.name}
                {...pokemon}
                details={cardDetails.data[pokemon.name]}
                loadError={Boolean(cardDetails.error && !cardDetails.data[pokemon.name])}
                onRetry={cardDetails.retry}
                sortMetric={sortMetric}
                shiny={shiny}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState icon={<Search />} title={t('pokedex.empty')} description={t('pokedex.tryAnother')}>
          <button className="button secondary" onClick={clearSearchParams}>
            {t('ui.resetResults')}
          </button>
        </EmptyState>
      )}
      {hasMore && (
        <div ref={loadMoreRef} className="infinite-loader" role="status" aria-live="polite">
          <span className="pokeball-spinner" />
          <button onClick={loadMore} disabled={loading || sortingDetails || cardDetails.loading}>
            {loading ? t('pokedex.loadingMore') : sortingDetails ? t('pokedex.sort.loading') : t('pokedex.loadMore')}
          </button>
        </div>
      )}
      {!hasMore && visiblePokemon.length > 0 && <p className="end-of-list">{t('pokedex.end')}</p>}
    </section>
  )
}
