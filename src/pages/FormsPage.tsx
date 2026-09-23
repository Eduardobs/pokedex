import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Globe2,
  Layers3,
  LoaderCircle,
  MapPin,
  Maximize2,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { CardSkeleton } from '../components/Loading'
import { MegaEvolutionIcon } from '../components/MegaEvolutionIcon'
import { PokemonCard } from '../components/PokemonCard'
import { SearchField } from '../components/SearchField'
import { SelectMenu } from '../components/SelectMenu'
import { typeLabel } from '../components/TypeBadge'
import { TypeIcon } from '../components/TypeIcon'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { formatNumber, idFromUrl, normalizeSearchText } from '../lib/api'
import {
  fetchPokemonRarityDetails,
  fetchPokemonRegionDetails,
  fetchPokemonSortDetails,
  POKEMON_REGIONS,
  type PokemonRarityDetails,
  type PokemonRegion,
} from '../lib/pokemon-catalog'
import { formCategory, formLabels, type FormCategory } from '../lib/pokemon-forms'
import {
  getPokemonSortValue,
  pokemonSortNeedsDetails,
  sortPokemonList,
  type PokemonSortDetails,
  type PokemonSortDirection,
  type PokemonSortKey,
} from '../lib/pokemon-sort'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const PAGE_SIZE = 32
const types = [
  'all',
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]
const sortKeys: PokemonSortKey[] = [
  'number',
  'name',
  'total',
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

type SelectedCategory = 'all' | FormCategory
type PokemonTypeResponse = { pokemon: { pokemon: NamedResource }[] }

const isPokemonRegion = (value: string): value is PokemonRegion =>
  POKEMON_REGIONS.some((region) => region.name === value)

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
  const type = types.includes(requestedType) ? requestedType : 'all'
  const requestedRegion = searchParams.get('region') ?? 'all'
  const region = isPokemonRegion(requestedRegion) ? requestedRegion : 'all'
  const requestedSort = searchParams.get('sort') as PokemonSortKey | null
  const sort = requestedSort && sortKeys.includes(requestedSort) ? requestedSort : 'number'
  const direction: PokemonSortDirection = searchParams.get('order') === 'desc' ? 'desc' : 'asc'
  const legendary = searchParams.get('legendary') === 'true'
  const mythical = searchParams.get('mythical') === 'true'
  const hasRarityFilter = legendary || mythical
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [additionalFiltersOpen, setAdditionalFiltersOpen] = useState(false)
  const [shiny, setShiny] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [pokemonDetails, setPokemonDetails] = useState<Record<string, PokemonSortDetails>>({})
  const [sortingDetails, setSortingDetails] = useState(false)
  const [sortError, setSortError] = useState(false)
  const [rarityDetails, setRarityDetails] = useState<Record<string, PokemonRarityDetails> | null>(
    null,
  )
  const [rarityLoading, setRarityLoading] = useState(false)
  const [rarityError, setRarityError] = useState(false)
  const [rarityRetry, setRarityRetry] = useState(0)
  const [regionDetails, setRegionDetails] = useState<Record<string, PokemonRegion> | null>(null)
  const [regionLoading, setRegionLoading] = useState(false)
  const [regionError, setRegionError] = useState(false)
  const [regionRetry, setRegionRetry] = useState(0)
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

  useEffect(() => {
    if (!hasRarityFilter) {
      setRarityLoading(false)
      setRarityError(false)
      return
    }
    if (rarityDetails) {
      setRarityLoading(false)
      return
    }
    const controller = new AbortController()
    setRarityLoading(true)
    setRarityError(false)
    fetchPokemonRarityDetails(controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) setRarityDetails(details)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) setRarityError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setRarityLoading(false)
      })
    return () => controller.abort()
  }, [hasRarityFilter, rarityDetails, rarityRetry])

  useEffect(() => {
    if (region === 'all') {
      setRegionLoading(false)
      setRegionError(false)
      return
    }
    if (regionDetails) {
      setRegionLoading(false)
      return
    }
    const controller = new AbortController()
    setRegionLoading(true)
    setRegionError(false)
    fetchPokemonRegionDetails(controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) setRegionDetails(details)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) setRegionError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegionLoading(false)
      })
    return () => controller.abort()
  }, [region, regionDetails, regionRetry])

  useEffect(() => {
    if (!pokemonSortNeedsDetails(sort)) {
      setSortingDetails(false)
      setSortError(false)
      return
    }
    if (Object.keys(pokemonDetails).length) {
      setSortingDetails(false)
      return
    }
    const controller = new AbortController()
    setSortingDetails(true)
    setSortError(false)
    fetchPokemonSortDetails(controller.signal)
      .then((details) => {
        if (!controller.signal.aborted) setPokemonDetails(details)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) setSortError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setSortingDetails(false)
      })
    return () => controller.abort()
  }, [pokemonDetails, sort])

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
  const selectSuggestion = (name: string) => {
    updateQuery(name)
    setSuggestionsOpen(false)
    setActiveSuggestion(-1)
  }
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false)
      setActiveSuggestion(-1)
      return
    }
    if (!suggestions.length || !suggestionsOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestion((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions[activeSuggestion].name)
    }
  }
  const clearFilters = () => {
    setSearchParams({}, { replace: true })
    setVisibleCount(PAGE_SIZE)
    setSuggestionsOpen(false)
  }

  const sortOptions: { value: PokemonSortKey; label: string; metric?: string }[] = [
    { value: 'number', label: t('pokedex.sort.number') },
    { value: 'name', label: t('pokedex.sort.name') },
    { value: 'total', label: t('pokedex.sort.total'), metric: t('detail.total') },
    { value: 'hp', label: t('pokedex.sort.hp'), metric: t('pokedex.sort.hp') },
    { value: 'attack', label: t('pokedex.sort.attack'), metric: t('stats.attack') },
    { value: 'defense', label: t('pokedex.sort.defense'), metric: t('stats.defense') },
    {
      value: 'special-attack',
      label: t('pokedex.sort.specialAttack'),
      metric: t('stats.specialAttack'),
    },
    {
      value: 'special-defense',
      label: t('pokedex.sort.specialDefense'),
      metric: t('stats.specialDefense'),
    },
    { value: 'speed', label: t('pokedex.sort.speed'), metric: t('stats.speed') },
  ]
  const directionOptions: { value: PokemonSortDirection; label: string }[] = [
    { value: 'asc', label: t('pokedex.sort.ascending') },
    { value: 'desc', label: t('pokedex.sort.descending') },
  ]
  const regionOptions = [
    { value: 'all', label: t('pokedex.region.all') },
    { value: 'kanto', label: t('pokedex.region.kanto') },
    { value: 'johto', label: t('pokedex.region.johto') },
    { value: 'hoenn', label: t('pokedex.region.hoenn') },
    { value: 'sinnoh', label: t('pokedex.region.sinnoh') },
    { value: 'unova', label: t('pokedex.region.unova') },
    { value: 'kalos', label: t('pokedex.region.kalos') },
    { value: 'alola', label: t('pokedex.region.alola') },
    { value: 'galar', label: t('pokedex.region.galar') },
    { value: 'hisui', label: t('pokedex.region.hisui') },
    { value: 'paldea', label: t('pokedex.region.paldea') },
  ]
  const selectedSortMetric = sortOptions.find((option) => option.value === sort)?.metric ?? ''
  const hasResultFilter = Boolean(
    query || category !== 'all' || type !== 'all' || region !== 'all' || hasRarityFilter,
  )
  const hasActiveFilters = hasResultFilter || sort !== 'number' || direction !== 'asc'
  const additionalFilterCount = Number(type !== 'all') + Number(legendary) + Number(mythical)
  const isRarityPending = hasRarityFilter && !rarityDetails && rarityLoading
  const isRegionPending = region !== 'all' && !regionDetails && regionLoading
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
      <div className="filter-panel forms-directory-toolbar">
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
        <div className="filter-primary">
          <div className="pokemon-search">
            <SearchField
              value={query}
              onChange={(value) => {
                updateQuery(value)
                setSuggestionsOpen(true)
                setActiveSuggestion(-1)
              }}
              onClear={() => {
                updateQuery('')
                setSuggestionsOpen(false)
              }}
              clearLabel={t('common.clear')}
              iconSize={20}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="form-suggestions"
              aria-activedescendant={
                activeSuggestion >= 0 ? `form-suggestion-${activeSuggestion}` : undefined
              }
              aria-label={t('forms.search')}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => setSuggestionsOpen(false)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('forms.search')}
              autoComplete="off"
            />
            {suggestionsOpen && suggestions.length > 0 && (
              <ul id="form-suggestions" className="pokemon-suggestions" role="listbox">
                {suggestions.map((resource, index) => {
                  const resourceCategory = formCategory(resource.name)!
                  const labels = formLabels(resource.name, resourceCategory, t)
                  return (
                    <li
                      id={`form-suggestion-${index}`}
                      key={resource.name}
                      role="option"
                      aria-selected={index === activeSuggestion}
                      className={index === activeSuggestion ? 'active' : ''}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        selectSuggestion(resource.name)
                      }}
                    >
                      <span>
                        {labels.pokemon} · {labels.variation}
                      </span>
                      <small>#{String(resource.id).padStart(4, '0')}</small>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <SelectMenu
            className="region-field"
            icon={
              isRegionPending ? (
                <LoaderCircle className="sort-spinner" size={18} />
              ) : (
                <MapPin size={18} />
              )
            }
            label={t('pokedex.region.label')}
            options={regionOptions}
            value={region}
            onChange={changeRegion}
          />
          <div className="sort-controls">
            <SelectMenu
              icon={
                sortingDetails ? (
                  <LoaderCircle className="sort-spinner" size={18} />
                ) : (
                  <ArrowUpDown size={18} />
                )
              }
              label={t('pokedex.sort.label')}
              options={sortOptions}
              value={sort}
              onChange={changeSort}
            />
            <SelectMenu
              className="order-field"
              icon={direction === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
              label={t('pokedex.sort.direction')}
              options={directionOptions}
              value={direction}
              onChange={changeDirection}
            />
          </div>
        </div>
        <div className="filter-actions">
          <button
            className="filter-toggle"
            type="button"
            aria-expanded={additionalFiltersOpen}
            aria-controls="additional-form-filters"
            onClick={() => setAdditionalFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>
              {additionalFiltersOpen ? t('pokedex.hideFilters') : t('pokedex.showFilters')}
            </span>
            {additionalFilterCount > 0 && (
              <span
                className="active-filter-count"
                aria-label={
                  additionalFilterCount === 1
                    ? t('pokedex.activeFilterOne')
                    : t('pokedex.activeFilterCount', { count: additionalFilterCount })
                }
              >
                {additionalFilterCount}
              </span>
            )}
            <ChevronDown
              className={additionalFiltersOpen ? 'open' : ''}
              size={17}
              aria-hidden="true"
            />
          </button>
          <div className="filter-end-actions">
            {hasActiveFilters && (
              <button className="clear-filters" type="button" onClick={clearFilters}>
                {t('pokedex.clearFilters')}
              </button>
            )}
            <button
              className={`list-shiny-toggle${shiny ? ' active' : ''}`}
              type="button"
              aria-label={t(shiny ? 'pokedex.showNormal' : 'pokedex.showShiny')}
              aria-pressed={shiny}
              onClick={() => setShiny((value) => !value)}
            >
              <Sparkles size={17} aria-hidden="true" />
              <span>{t(shiny ? 'detail.normal' : 'detail.shiny')}</span>
            </button>
          </div>
        </div>
        <div
          id="additional-form-filters"
          className="additional-filters"
          hidden={!additionalFiltersOpen}
        >
          <fieldset className="type-filter" aria-describedby="form-type-filter-help">
            <legend>{t('pokedex.type.label')}</legend>
            <p id="form-type-filter-help">{t('forms.typeHelp')}</p>
            <div className="type-filter-grid">
              {types.map((item) => {
                const label = item === 'all' ? t('pokedex.all') : typeLabel(item, language)
                return (
                  <label
                    className={`type-filter-option${item === 'all' ? ' type-all' : ` type-${item}`}`}
                    key={item}
                  >
                    <input
                      type="radio"
                      name="form-type"
                      value={item}
                      checked={type === item}
                      onChange={() => selectType(item)}
                    />
                    <span className="type-filter-icon" aria-hidden="true">
                      {item === 'all' ? <Layers3 /> : <TypeIcon type={item} />}
                    </span>
                    <span>{label}</span>
                    <Check className="type-filter-check" aria-hidden="true" />
                  </label>
                )
              })}
            </div>
          </fieldset>
          <div className="rarity-filter" role="group" aria-label={t('pokedex.rarity.label')}>
            <span>{t('pokedex.rarity.label')}</span>
            <label>
              <input
                type="checkbox"
                checked={legendary}
                onChange={(event) => changeRarityFilter('legendary', event.target.checked)}
              />
              {t('pokedex.rarity.legendary')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={mythical}
                onChange={(event) => changeRarityFilter('mythical', event.target.checked)}
              />
              {t('pokedex.rarity.mythical')}
            </label>
          </div>
        </div>
        {sortingDetails && (
          <p className="sort-status" role="status">
            {t('pokedex.sort.loading')}
          </p>
        )}
        {sortError && (
          <p className="sort-status inline-sort-error" role="alert">
            {t('pokedex.sort.error')}
          </p>
        )}
        {isRarityPending && (
          <p className="sort-status" role="status">
            {t('pokedex.rarity.loading')}
          </p>
        )}
        {isRegionPending && (
          <p className="sort-status" role="status">
            {t('pokedex.region.loading')}
          </p>
        )}
        {isTypePending && (
          <p className="sort-status" role="status">
            {t('forms.typeLoading')}
          </p>
        )}
      </div>
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
          <button
            className="button secondary"
            type="button"
            onClick={() => setRegionRetry((value) => value + 1)}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : rarityError && hasRarityFilter && !rarityDetails ? (
        <div className="inline-error">
          <p>{t('pokedex.rarity.error')}</p>
          <button
            className="button secondary"
            type="button"
            onClick={() => setRarityRetry((value) => value + 1)}
          >
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
