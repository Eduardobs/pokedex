import { Globe2, Layers3, Maximize2, Search, Sparkles } from 'lucide-react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { CardSkeleton } from '../components/Loading'
import { MegaEvolutionIcon } from '../components/MegaEvolutionIcon'
import { PokemonCatalogFilters } from '../components/PokemonCatalogFilters'
import { PokemonCard } from '../components/PokemonCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { usePokemonCatalogDetails } from '../hooks/usePokemonCatalogDetails'
import { formatNumber, idFromUrl, normalizeSearchText } from '../lib/api'
import {
  isPokemonRegion,
  POKEMON_SORT_KEYS,
  POKEMON_TYPES,
  pokemonSortMetricLabel,
} from '../lib/pokemon-directory'
import { formCategory, formLabels, type FormCategory } from '../lib/pokemon-forms'
import {
  getPokemonSortValue,
  sortPokemonList,
  type PokemonSortDirection,
  type PokemonSortKey,
} from '../lib/pokemon-sort'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const PAGE_SIZE = 32
type SelectedCategory = 'all' | FormCategory
type PokemonTypeResponse = { pokemon: { pokemon: NamedResource }[] }

export function FormsPage() {
  const { language, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCategory = searchParams.get('category') as SelectedCategory | null
  const category: SelectedCategory =
    requestedCategory && ['regional', 'mega', 'gmax'].includes(requestedCategory)
      ? requestedCategory
      : 'all'
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
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
  const filterableForms = useMemo<PokemonListItem[]>(
    () =>
      selectedForms.flatMap((resource) => {
        const resourceCategory = formCategory(resource.name)
        if (!resourceCategory) return []
        if (type !== 'all' && !typeNames.has(resource.name)) return []
        if (region !== 'all' && regionDetails?.[resource.name] !== region) return []
        if (hasRarityFilter) {
          const rarity = rarityDetails?.[resource.name]
          if (!((legendary && rarity?.isLegendary) || (mythical && rarity?.isMythical))) return []
        }
        const baseName = formLabels(resource.name, resourceCategory).baseName
        return [{ ...resource, id: nationalDex.get(baseName) ?? Number.MAX_SAFE_INTEGER }]
      }),
    [
      hasRarityFilter,
      legendary,
      mythical,
      nationalDex,
      rarityDetails,
      region,
      regionDetails,
      selectedForms,
      type,
      typeNames,
    ],
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
  const suggestions = useMemo(() => {
    if (!normalizedQuery || !/[a-z]/.test(normalizedQuery)) return []
    return filterableForms
      .filter((resource) => {
        const resourceCategory = formCategory(resource.name)
        const labels = resourceCategory ? formLabels(resource.name, resourceCategory, t) : null
        return [resource.name, labels?.pokemon ?? '', labels?.variation ?? ''].some((value) =>
          normalizeSearchText(value).includes(normalizedQuery),
        )
      })
      .sort((left, right) => {
        const leftStartsWith = normalizeSearchText(left.name).startsWith(normalizedQuery)
        const rightStartsWith = normalizeSearchText(right.name).startsWith(normalizedQuery)
        if (leftStartsWith !== rightStartsWith) return leftStartsWith ? -1 : 1
        return left.id - right.id || left.name.localeCompare(right.name)
      })
      .slice(0, 7)
  }, [filterableForms, normalizedQuery, t])
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
  }, [filteredLength, hasMore, loading, sortingDetails, speciesLoading])
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && !speciesLoading && !sortingDetails,
    onLoadMore: loadMore,
    observationKey: visibleCount,
    rootMargin: '300px',
  })

  const updateParam = (name: string, value: string, defaultValue = '') => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (!value || value === defaultValue) next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
    setVisibleCount(PAGE_SIZE)
  }
  const selectCategory = (value: SelectedCategory) => updateParam('category', value, 'all')
  const updateQuery = (value: string) => updateParam('q', value)
  const selectType = (value: string) => updateParam('type', value, 'all')
  const changeRegion = (value: string) => updateParam('region', value, 'all')
  const changeSort = (value: PokemonSortKey) => updateParam('sort', value, 'number')
  const changeDirection = (value: PokemonSortDirection) => updateParam('order', value, 'asc')
  const changeRarityFilter = (filter: 'legendary' | 'mythical', checked: boolean) =>
    updateParam(filter, checked ? 'true' : '')
  const clearFilters = () => {
    setSearchParams({}, { replace: true })
    setVisibleCount(PAGE_SIZE)
  }

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
        <div className="page-title">
          <div>
            <span className="eyebrow">
              <Sparkles size={14} /> {t('forms.eyebrow')}
            </span>
            <h1>{t('forms.title')}</h1>
            <p>{t('forms.loading')}</p>
          </div>
        </div>
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
      <div className="page-title">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> {t('forms.eyebrow')}
          </span>
          <h1>{t('forms.title')}</h1>
          <p>{t('forms.description')}</p>
        </div>
        <div className="result-count" aria-live="polite">
          <b>
            {isFilterPending
              ? '…'
              : formatNumber(hasResultFilter ? sorted.length : specialForms.length, language)}
          </b>
          <span>{hasResultFilter ? t('forms.resultsLabel') : t('forms.specialCount')}</span>
        </div>
      </div>
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
        onClearFilters={clearFilters}
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
        <div className="inline-error">
          <p>{t('forms.typeError')}</p>
          <button className="button secondary" type="button" onClick={retryType}>
            {t('common.retry')}
          </button>
        </div>
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
        <div className="empty">
          <Search />
          <h2>{t('forms.empty')}</h2>
          <p>{t('forms.tryAnother')}</p>
        </div>
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
