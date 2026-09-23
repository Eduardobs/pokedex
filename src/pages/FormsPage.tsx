import { Globe2, Layers3, Maximize2, Search, Sparkles } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { ErrorState } from '../components/ErrorState'
import { EmptyState, InlineRetryError } from '../components/FeedbackState'
import { CardSkeleton } from '../components/Loading'
import { MegaEvolutionIcon } from '../components/MegaEvolutionIcon'
import { PageHeader } from '../components/PageHeader'
import { PokemonCatalogFilters } from '../components/PokemonCatalogFilters'
import { PokemonCard } from '../components/PokemonCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { usePokemonCatalogControls } from '../hooks/usePokemonCatalogControls'
import { usePokemonCatalogDetails } from '../hooks/usePokemonCatalogDetails'
import { formatNumber, idFromUrl, normalizeSearchText } from '../lib/api'
import {
  filterPokemonCatalogMetadata,
  pokemonSearchSuggestions,
  pokemonSortMetricLabel,
} from '../lib/pokemon-directory'
import { formCategory, formLabels, type FormCategory } from '../lib/pokemon-forms'
import { getPokemonSortValue, sortPokemonList } from '../lib/pokemon-sort'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const PAGE_SIZE = 32
type SelectedCategory = 'all' | FormCategory
type PokemonTypeResponse = { pokemon: { pokemon: NamedResource }[] }

export function FormsPage() {
  const { language, t } = useLanguage()
  const {
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
  } = usePokemonCatalogControls(PAGE_SIZE)
  const requestedCategory = searchParams.get('category') as SelectedCategory | null
  const category: SelectedCategory =
    requestedCategory && ['regional', 'mega', 'gmax'].includes(requestedCategory)
      ? requestedCategory
      : 'all'
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
  const { data, loading, error, retry } = useApi<ApiList>('pokemon-form?limit=2000&offset=0')
  const {
    data: speciesData,
    loading: speciesLoading,
    error: speciesError,
    retry: retrySpecies,
  } = useApi<ApiList>('pokemon-species?limit=2000&offset=0')
  const {
    data: typeData,
    loading: typeLoading,
    error: typeError,
    retry: retryType,
  } = useApi<PokemonTypeResponse>(type === 'all' ? null : `type/${type}`)

  const categories: {
    value: SelectedCategory
    label: string
    description: string
    icon: typeof Sparkles | typeof MegaEvolutionIcon
  }[] = [
    { value: 'all', label: t('forms.all'), description: t('forms.allDesc'), icon: Layers3 },
    {
      value: 'regional',
      label: t('forms.regional'),
      description: t('forms.regionalDesc'),
      icon: Globe2,
    },
    {
      value: 'mega',
      label: t('forms.mega'),
      description: t('forms.megaDesc'),
      icon: MegaEvolutionIcon,
    },
    { value: 'gmax', label: t('forms.gmax'), description: t('forms.gmaxDesc'), icon: Maximize2 },
  ]

  const nationalDex = useMemo(
    () =>
      new Map(speciesData?.results.map((species) => [species.name, idFromUrl(species.url)]) ?? []),
    [speciesData],
  )
  const grouped = useMemo(() => {
    const groups: Record<FormCategory, NamedResource[]> = { regional: [], mega: [], gmax: [] }
    data?.results.forEach((resource) => {
      const resourceCategory = formCategory(resource.name)
      if (resourceCategory) groups[resourceCategory].push(resource)
    })
    const byNationalDex = (left: NamedResource, right: NamedResource) => {
      const leftCategory = formCategory(left.name)
      const rightCategory = formCategory(right.name)
      const leftId = leftCategory
        ? (nationalDex.get(formLabels(left.name, leftCategory).baseName) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER
      const rightId = rightCategory
        ? (nationalDex.get(formLabels(right.name, rightCategory).baseName) ??
          Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER
      return leftId - rightId || left.name.localeCompare(right.name)
    }
    Object.values(groups).forEach((resources) => resources.sort(byNationalDex))
    return groups
  }, [data, nationalDex])

  const specialForms = useMemo(
    () =>
      [...grouped.regional, ...grouped.mega, ...grouped.gmax].sort((left, right) => {
        const leftCategory = formCategory(left.name)!
        const rightCategory = formCategory(right.name)!
        const leftId =
          nationalDex.get(formLabels(left.name, leftCategory).baseName) ?? Number.MAX_SAFE_INTEGER
        const rightId =
          nationalDex.get(formLabels(right.name, rightCategory).baseName) ?? Number.MAX_SAFE_INTEGER
        return leftId - rightId || left.name.localeCompare(right.name)
      }),
    [grouped, nationalDex],
  )
  const selectedForms = category === 'all' ? specialForms : grouped[category]
  const typeNames = useMemo(
    () => new Set(typeData?.pokemon.map((entry) => entry.pokemon.name) ?? []),
    [typeData],
  )
  const typedForms = useMemo<PokemonListItem[]>(
    () =>
      selectedForms.flatMap((resource) => {
        const resourceCategory = formCategory(resource.name)
        if (!resourceCategory) return []
        if (type !== 'all' && !typeNames.has(resource.name)) return []
        const baseName = formLabels(resource.name, resourceCategory).baseName
        return [{ ...resource, id: nationalDex.get(baseName) ?? Number.MAX_SAFE_INTEGER }]
      }),
    [nationalDex, selectedForms, type, typeNames],
  )
  const filterableForms = useMemo(
    () =>
      filterPokemonCatalogMetadata(typedForms, {
        region,
        regionDetails,
        legendary,
        mythical,
        rarityDetails,
      }),
    [legendary, mythical, rarityDetails, region, regionDetails, typedForms],
  )
  const normalizedQuery = normalizeSearchText(deferredQuery)
  const filtered = useMemo(
    () =>
      filterableForms.filter((resource) => {
        const resourceCategory = formCategory(resource.name)
        const labels = resourceCategory ? formLabels(resource.name, resourceCategory, t) : null
        return (
          !normalizedQuery ||
          String(resource.id) === normalizedQuery ||
          [resource.name, labels?.pokemon ?? '', labels?.variation ?? ''].some((value) =>
            normalizeSearchText(value).includes(normalizedQuery),
          )
        )
      }),
    [filterableForms, normalizedQuery, t],
  )
  const suggestions = useMemo(
    () =>
      pokemonSearchSuggestions(filterableForms, deferredQuery, (resource) => {
        const resourceCategory = formCategory(resource.name)
        const labels = resourceCategory ? formLabels(resource.name, resourceCategory, t) : null
        return [resource.name, labels?.pokemon ?? '', labels?.variation ?? '']
      }),
    [deferredQuery, filterableForms, t],
  )
  const sorted = useMemo(
    () => sortPokemonList(filtered, sort, direction, pokemonDetails, language),
    [direction, filtered, language, pokemonDetails, sort],
  )
  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount])
  const hasMore = visibleCount < sorted.length
  const filteredLength = sorted.length
  const loadMore = useCallback(() => {
    if (loading || speciesLoading || sortingDetails || !hasMore) return
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredLength))
  }, [filteredLength, hasMore, loading, setVisibleCount, sortingDetails, speciesLoading])
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && !speciesLoading && !sortingDetails,
    onLoadMore: loadMore,
    observationKey: visibleCount,
    rootMargin: '300px',
  })

  const selectCategory = (value: SelectedCategory) => updateSearchParam('category', value, 'all')
  const updateQuery = (value: string) => updateSearchParam('q', value)
  const selectType = (value: string) => updateSearchParam('type', value, 'all')
  const changeRegion = (value: string) => updateSearchParam('region', value, 'all')
  const changeSort = (value: typeof sort) => updateSearchParam('sort', value, 'number')
  const changeDirection = (value: typeof direction) => updateSearchParam('order', value, 'asc')
  const changeRarityFilter = (filter: 'legendary' | 'mythical', checked: boolean) =>
    updateSearchParam(filter, checked ? 'true' : '')

  const selectedSortMetric = pokemonSortMetricLabel(sort, t)
  const hasResultFilter = Boolean(
    query || category !== 'all' || type !== 'all' || region !== 'all' || hasRarityFilter,
  )
  const hasActiveFilters = hasResultFilter || sort !== 'number' || direction !== 'asc'
  const isRarityPending = hasRarityFilter && !rarityDetails && rarity.loading
  const isRegionPending = region !== 'all' && !regionDetails && regions.loading
  const isTypePending = type !== 'all' && !typeData && typeLoading
  const isFilterPending = isRarityPending || isRegionPending || isTypePending

  if (loading || speciesLoading)
    return (
      <section className="page content-width forms-directory-page">
        <PageHeader
          eyebrow={
            <>
              <Sparkles size={14} /> {t('forms.eyebrow')}
            </>
          }
          title={t('forms.title')}
          description={t('forms.loading')}
        />
        <CardSkeleton count={8} />
      </section>
    )
  if (error || speciesError || !data || !speciesData)
    return (
      <ErrorState
        title={t('forms.unavailable')}
        message={t('forms.unavailableDesc')}
        retry={() => {
          retry()
          retrySpecies()
        }}
      />
    )

  return (
    <section className="page content-width forms-directory-page">
      <PageHeader
        eyebrow={
          <>
            <Sparkles size={14} /> {t('forms.eyebrow')}
          </>
        }
        title={t('forms.title')}
        description={t('forms.description')}
        aside={
          <div className="result-count" aria-live="polite">
            <b>
              {isFilterPending
                ? '…'
                : formatNumber(hasResultFilter ? sorted.length : specialForms.length, language)}
            </b>
            <span>{hasResultFilter ? t('forms.resultsLabel') : t('forms.specialCount')}</span>
          </div>
        }
      />
      <PokemonCatalogFilters
        className="forms-directory-toolbar"
        idPrefix="form"
        query={query}
        searchLabel={t('forms.search')}
        suggestions={suggestions.map((resource) => {
          const resourceCategory = formCategory(resource.name)!
          const labels = formLabels(resource.name, resourceCategory, t)
          return {
            id: resource.id,
            name: resource.name,
            label: `${labels.pokemon} · ${labels.variation}`,
          }
        })}
        onQueryChange={updateQuery}
        type={type}
        typeHelp={t('forms.typeHelp')}
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
        extraStatus={
          isTypePending ? (
            <p className="sort-status" role="status">
              {t('forms.typeLoading')}
            </p>
          ) : null
        }
      >
        <div className="forms-category-tabs" role="group" aria-label={t('forms.categoryFilter')}>
          {categories.map((item) => {
            const Icon = item.icon
            const count = item.value === 'all' ? specialForms.length : grouped[item.value].length
            return (
              <button
                type="button"
                aria-pressed={category === item.value}
                className={category === item.value ? `active tab-${item.value}` : ''}
                onClick={() => selectCategory(item.value)}
                key={item.value}
              >
                <Icon />
                <span>
                  <b>{item.label}</b>
                  <small>{item.description}</small>
                </span>
                <i aria-label={String(count)}>{count}</i>
              </button>
            )
          })}
        </div>
      </PokemonCatalogFilters>
      <div className="directory-summary">
        <span>{categories.find((item) => item.value === category)?.label}</span>
        <p>
          {sorted.length === 1
            ? t('forms.resultOne')
            : t('forms.results', { count: sorted.length })}
        </p>
      </div>
      {isFilterPending ? (
        <CardSkeleton count={8} />
      ) : typeError && type !== 'all' && !typeData ? (
        <InlineRetryError
          message={t('forms.typeError')}
          retryLabel={t('common.retry')}
          onRetry={retryType}
        />
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
      ) : visible.length ? (
        <div className="forms-directory-grid">
          {visible.map((resource) => {
            const resourceCategory = formCategory(resource.name)
            const value = getPokemonSortValue(pokemonDetails[resource.name], sort)
            const sortMetric =
              value === undefined ? undefined : { label: selectedSortMetric, value }
            return resourceCategory ? (
              <PokemonCard
                resource={resource}
                category={resourceCategory}
                shiny={shiny}
                sortMetric={sortMetric}
                key={resource.name}
              />
            ) : null
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Search />}
          title={t('forms.empty')}
          description={t('forms.tryAnother')}
        />
      )}
      {hasMore && !isFilterPending && (
        <div className="infinite-loader" ref={sentinelRef} role="status" aria-live="polite">
          <span className="pokeball-spinner" />
          <button onClick={loadMore} disabled={sortingDetails}>
            {t('forms.loadMore')}
          </button>
        </div>
      )}
      {!hasMore && visible.length > PAGE_SIZE && <p className="end-of-list">{t('forms.end')}</p>}
    </section>
  )
}
