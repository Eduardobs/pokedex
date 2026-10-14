import { Heart, Search } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, InlineRetryError } from '../components/FeedbackState'
import { FavoritePokemonCard } from '../components/FavoritePokemonCard'
import { CardSkeleton } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { PokemonCatalogFilters } from '../components/PokemonCatalogFilters'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { usePokemonCatalogControls } from '../hooks/usePokemonCatalogControls'
import { usePokemonCatalogDetails } from '../hooks/usePokemonCatalogDetails'
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

export function FavoritesPage() {
  const { favorites } = useFavoritesContext()
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
    shiny,
    setShiny,
    updateSearchParam,
    clearSearchParams,
  } = usePokemonCatalogControls(favorites.length)
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
  const favoriteNames = useMemo(() => new Set(favorites), [favorites])
  const catalog = useMemo<PokemonListItem[]>(
    () => pokemonListItems(resources ?? []).filter(({ name }) => favoriteNames.has(name)),
    [favoriteNames, resources],
  )
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
  const visibleFavorites = useMemo(
    () => sortPokemonList(filteredPokemon, sort, direction, pokemonDetails, language),
    [direction, filteredPokemon, language, pokemonDetails, sort],
  )
  const selectedSortMetric = pokemonSortMetricLabel(sort, t)
  const hasResultFilter = Boolean(query || types.length > 0 || region !== 'all' || hasRarityFilter)
  const hasActiveFilters = hasResultFilter || sort !== 'number' || direction !== 'asc'
  const isRarityPending = hasRarityFilter && !rarityDetails && rarity.loading
  const isRegionPending = region !== 'all' && !regionDetails && regions.loading
  const isFilterPending = isRarityPending || isRegionPending
  const changeQuery = (value: string) => updateSearchParam('q', value)
  const changeSort = (value: typeof sort) => updateSearchParam('sort', value, 'number')
  const changeDirection = (value: typeof direction) => updateSearchParam('order', value, 'asc')
  const changeRegion = (value: string) => updateSearchParam('region', value, 'all')
  const changeRarityFilter = (filter: 'legendary' | 'mythical' | 'baby', checked: boolean) =>
    updateSearchParam(filter, checked ? 'true' : '')

  return (
    <section className="page content-width">
      <PageHeader
        eyebrow={t('favorites.eyebrow')}
        title={t('favorites.title')}
        description={t('favorites.description')}
        aside={
          favorites.length > 0 ? (
            <div className="result-count" aria-live="polite">
              <b>
                {isFilterPending
                  ? '…'
                  : formatNumber(hasResultFilter ? filteredPokemon.length : favorites.length, language)}
              </b>
              <span>{hasResultFilter ? t('pokedex.results') : t('favorites.count', { count: favorites.length })}</span>
            </div>
          ) : undefined
        }
      />
      {favorites.length ? (
        <>
          <PokemonCatalogFilters
            idPrefix="favorites"
            query={query}
            searchLabel={t('favorites.search')}
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
            <CardSkeleton count={Math.min(favorites.length, 12)} />
          ) : regionError && region !== 'all' && !regionDetails ? (
            <InlineRetryError
              message={t('pokedex.region.error')}
              retryLabel={t('common.retry')}
              onRetry={regions.retry}
            />
          ) : rarityError && hasRarityFilter && !rarityDetails ? (
            <InlineRetryError
              message={t('pokedex.rarity.error')}
              retryLabel={t('common.retry')}
              onRetry={rarity.retry}
            />
          ) : error && !catalog.length ? (
            <InlineRetryError message={t('pokedex.loadError')} retryLabel={t('common.retry')} onRetry={retry} />
          ) : visibleFavorites.length ? (
            <div className="pokemon-grid">
              {visibleFavorites.map((pokemon) => {
                const value = getPokemonSortValue(pokemonDetails[pokemon.name], sort)
                const sortMetric = value === undefined ? undefined : { label: selectedSortMetric, value }
                return (
                  <FavoritePokemonCard key={pokemon.name} name={pokemon.name} shiny={shiny} sortMetric={sortMetric} />
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
        </>
      ) : (
        <EmptyState
          className="favorites-empty"
          icon={<Heart />}
          title={t('favorites.empty')}
          description={t('favorites.emptyDesc')}
        >
          <Link to="/pokemon" className="button primary">
            {t('favorites.explore')}
          </Link>
        </EmptyState>
      )}
    </section>
  )
}
