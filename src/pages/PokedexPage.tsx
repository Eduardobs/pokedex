import { ArrowUpDown, LoaderCircle, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CardSkeleton } from '../components/Loading'
import { PokemonCard } from '../components/PokemonCard'
import { SearchField } from '../components/SearchField'
import { TypeBadge, typeLabel } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { formatNumber, normalizeSearchText, pokemonListItems, prettyName } from '../lib/api'
import { fetchPokemonRarityDetails, fetchPokemonSortDetails, type PokemonRarityDetails } from '../lib/pokemon-catalog'
import { filterPokemonList, getPokemonSortValue, pokemonSortNeedsDetails, sortPokemonList, type PokemonSortDetails, type PokemonSortKey } from '../lib/pokemon-sort'
import { POKEMON_CATALOG_LIMIT } from '../config/app'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const LIMIT = 24
const types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

export function PokedexPage() {
  const { language, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query)
  const requestedType = searchParams.get('type') ?? 'all'
  const type = types.includes(requestedType) ? requestedType : 'all'
  const requestedSort = searchParams.get('sort') as PokemonSortKey | null
  const sortKeys: PokemonSortKey[] = ['number', 'name', 'total', 'hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
  const sort = requestedSort && sortKeys.includes(requestedSort) ? requestedSort : 'number'
  const legendary = searchParams.get('legendary') === 'true'
  const mythical = searchParams.get('mythical') === 'true'
  const hasRarityFilter = legendary || mythical
  const [pokemonDetails, setPokemonDetails] = useState<Record<string, PokemonSortDetails>>({})
  const [rarityDetails, setRarityDetails] = useState<Record<string, PokemonRarityDetails> | null>(null)
  const [rarityLoading, setRarityLoading] = useState(false)
  const [rarityError, setRarityError] = useState(false)
  const [rarityRetry, setRarityRetry] = useState(0)
  const [sortingDetails, setSortingDetails] = useState(false)
  const [sortError, setSortError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(LIMIT)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const endpoint = type === 'all' ? `pokemon?limit=${POKEMON_CATALOG_LIMIT}&offset=0` : `type/${type}`
  const { data, loading, error, retry } = useApi<ApiList | { pokemon: { pokemon: NamedResource }[] }>(endpoint)

  const catalog = useMemo<PokemonListItem[]>(() => {
    if (!data) return []
    return pokemonListItems('results' in data ? data.results : data.pokemon.map((entry) => entry.pokemon))
  }, [data])
  const rarityCatalog = useMemo(() => {
    if (!hasRarityFilter) return catalog
    if (!rarityDetails) return []
    return catalog.filter((pokemon) => {
      const rarity = rarityDetails[pokemon.name]
      return Boolean((legendary && rarity?.isLegendary) || (mythical && rarity?.isMythical))
    })
  }, [catalog, hasRarityFilter, legendary, mythical, rarityDetails])
  const filteredPokemon = useMemo(() => filterPokemonList(rarityCatalog, deferredQuery), [deferredQuery, rarityCatalog])
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
  const sortedPokemon = useMemo(() => sortPokemonList(
    filteredPokemon,
    sort,
    pokemonDetails,
    language,
  ), [filteredPokemon, language, pokemonDetails, sort])
  const visiblePokemon = useMemo(() => sortedPokemon.slice(0, visibleCount), [sortedPokemon, visibleCount])
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
      .finally(() => { if (!controller.signal.aborted) setRarityLoading(false) })
    return () => controller.abort()
  }, [hasRarityFilter, rarityDetails, rarityRetry])

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
        if (controller.signal.aborted) return
        setPokemonDetails(details)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof Error && reason.name === 'AbortError')) setSortError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setSortingDetails(false) })
    return () => controller.abort()
  }, [pokemonDetails, sort])

  const selectType = (nextType: string) => {
    if (nextType === type) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextType === 'all') next.delete('type'); else next.set('type', nextType)
      return next
    }, { replace: true })
    setVisibleCount(LIMIT)
  }

  const changeQuery = (nextQuery: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextQuery) next.set('q', nextQuery); else next.delete('q')
      return next
    }, { replace: true })
    setVisibleCount(LIMIT)
  }

  const selectSuggestion = (name: string) => {
    changeQuery(name)
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

  const changeSort = (nextSort: PokemonSortKey) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextSort === 'number') next.delete('sort'); else next.set('sort', nextSort)
      return next
    }, { replace: true })
    setVisibleCount(LIMIT)
  }

  const changeRarityFilter = (filter: 'legendary' | 'mythical', checked: boolean) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (checked) next.set(filter, 'true'); else next.delete(filter)
      return next
    }, { replace: true })
    setVisibleCount(LIMIT)
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
    setVisibleCount(LIMIT)
  }

  const sortOptions: { value: PokemonSortKey; label: string; metric?: string }[] = [
    { value: 'number', label: t('pokedex.sort.number') },
    { value: 'name', label: t('pokedex.sort.name') },
    { value: 'total', label: t('pokedex.sort.total'), metric: t('detail.total') },
    { value: 'hp', label: t('pokedex.sort.hp'), metric: 'HP' },
    { value: 'attack', label: t('pokedex.sort.attack'), metric: t('stats.attack') },
    { value: 'defense', label: t('pokedex.sort.defense'), metric: t('stats.defense') },
    { value: 'special-attack', label: t('pokedex.sort.specialAttack'), metric: t('stats.specialAttack') },
    { value: 'special-defense', label: t('pokedex.sort.specialDefense'), metric: t('stats.specialDefense') },
    { value: 'speed', label: t('pokedex.sort.speed'), metric: t('stats.speed') },
  ]
  const selectedSortMetric = sortOptions.find((option) => option.value === sort)?.metric ?? ''
  const hasResultFilter = Boolean(query || type !== 'all' || hasRarityFilter)
  const hasActiveFilters = hasResultFilter || sort !== 'number'
  const isRarityPending = hasRarityFilter && !rarityDetails && rarityLoading

  return (
    <section className="page content-width">
      <div className="page-title"><div><span className="eyebrow">{t('pokedex.eyebrow')}</span><h1>{t('pokedex.title')}</h1><p>{t('pokedex.description')}</p></div><div className="result-count" aria-live="polite"><b>{isRarityPending ? '…' : formatNumber(hasResultFilter ? filteredPokemon.length : total, language)}</b><span>{hasResultFilter ? t('pokedex.results') : t('pokedex.registered')}</span></div></div>
      <div className="filter-panel">
        <div className="filter-primary">
          <div className="pokemon-search">
            <SearchField
              value={query}
              onChange={(value) => { changeQuery(value); setSuggestionsOpen(true); setActiveSuggestion(-1) }}
              onClear={() => { changeQuery(''); setSuggestionsOpen(false) }}
              clearLabel={t('common.clear')}
              iconSize={20}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && suggestions.length > 0}
              aria-controls="pokemon-suggestions"
              aria-activedescendant={activeSuggestion >= 0 ? `pokemon-suggestion-${activeSuggestion}` : undefined}
              aria-label={t('pokedex.filter')}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => setSuggestionsOpen(false)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('pokedex.filter')}
              autoComplete="off"
            />
            {suggestionsOpen && suggestions.length > 0 && <ul id="pokemon-suggestions" className="pokemon-suggestions" role="listbox">{suggestions.map((pokemon, index) => <li id={`pokemon-suggestion-${index}`} key={pokemon.name} role="option" aria-selected={index === activeSuggestion} className={index === activeSuggestion ? 'active' : ''} onMouseDown={(event) => { event.preventDefault(); selectSuggestion(pokemon.name) }}><span>{prettyName(pokemon.name)}</span><small>#{String(pokemon.id).padStart(4, '0')}</small></li>)}</ul>}
          </div>
          <label className="sort-field">
            {sortingDetails ? <LoaderCircle className="sort-spinner" size={18} /> : <ArrowUpDown size={18} />}
            <span>{t('pokedex.sort.label')}</span>
            <select value={sort} onChange={(event) => changeSort(event.target.value as PokemonSortKey)} aria-label={t('pokedex.sort.label')}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="type-filter" role="group" aria-label={t('pokedex.scrollTypes')}><SlidersHorizontal size={18} /><div>{types.map((item) => {
          const label = item === 'all' ? t('pokedex.all') : typeLabel(item, language)
          return <button type="button" key={item} aria-label={label} title={label} aria-pressed={type === item} className={type === item ? 'active' : ''} onClick={() => selectType(item)}>{item === 'all' ? label : <TypeBadge type={item} iconOnly />}</button>
        })}</div></div>
        <div className="rarity-filter" role="group" aria-label={t('pokedex.rarity.label')}>
          <span>{t('pokedex.rarity.label')}</span>
          <label><input type="checkbox" checked={legendary} onChange={(event) => changeRarityFilter('legendary', event.target.checked)} />{t('pokedex.rarity.legendary')}</label>
          <label><input type="checkbox" checked={mythical} onChange={(event) => changeRarityFilter('mythical', event.target.checked)} />{t('pokedex.rarity.mythical')}</label>
        </div>
        <div className="filter-footer"><span>{t('pokedex.scrollTypes')}</span>{hasActiveFilters && <button type="button" onClick={clearFilters}>{t('pokedex.clearFilters')}</button>}</div>
        {sortingDetails && <p className="sort-status" role="status">{t('pokedex.sort.loading')}</p>}
        {sortError && <p className="sort-status inline-sort-error" role="alert">{t('pokedex.sort.error')}</p>}
        {isRarityPending && <p className="sort-status" role="status">{t('pokedex.rarity.loading')}</p>}
      </div>
      {loading && !catalog.length || isRarityPending ? <CardSkeleton count={12} /> : rarityError && hasRarityFilter && !rarityDetails ? <div className="inline-error"><p>{t('pokedex.rarity.error')}</p><button className="button secondary" type="button" onClick={() => setRarityRetry((value) => value + 1)}>{t('common.retry')}</button></div> : error && !catalog.length ? <div className="inline-error"><p>{t('pokedex.loadError')}</p><button className="button secondary" type="button" onClick={retry}>{t('common.retry')}</button></div> : visiblePokemon.length ? (
        <div className="pokemon-grid">{visiblePokemon.map((pokemon) => {
          const value = getPokemonSortValue(pokemonDetails[pokemon.name], sort)
          const sortMetric = value === undefined ? undefined : { label: selectedSortMetric, value }
          return <PokemonCard key={pokemon.name} {...pokemon} sortMetric={sortMetric} />
        })}</div>
      ) : <div className="empty"><Search /><h2>{t('pokedex.empty')}</h2><p>{t('pokedex.tryAnother')}</p></div>}
      {hasMore && <div ref={loadMoreRef} className="infinite-loader" role="status" aria-live="polite"><span className="pokeball-spinner" /><button onClick={loadMore} disabled={loading || sortingDetails}>{loading ? t('pokedex.loadingMore') : sortingDetails ? t('pokedex.sort.loading') : t('pokedex.loadMore')}</button></div>}
      {!hasMore && visiblePokemon.length > 0 && <p className="end-of-list">{t('pokedex.end')}</p>}
    </section>
  )
}
