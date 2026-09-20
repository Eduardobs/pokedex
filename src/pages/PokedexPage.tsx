import { ArrowUpDown, LoaderCircle, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CardSkeleton } from '../components/Loading'
import { PokemonCard } from '../components/PokemonCard'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { formatNumber, pokemonListItems } from '../lib/api'
import { fetchPokemonSortDetails } from '../lib/pokemon-catalog'
import { filterPokemonList, getPokemonSortValue, pokemonSortNeedsDetails, sortPokemonList, type PokemonSortDetails, type PokemonSortKey } from '../lib/pokemon-sort'
import { POKEMON_CATALOG_LIMIT } from '../config/app'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const LIMIT = 24
const types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

export function PokedexPage() {
  const { language, t } = useLanguage()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState<PokemonSortKey>('number')
  const [pokemonDetails, setPokemonDetails] = useState<Record<string, PokemonSortDetails>>({})
  const [sortingDetails, setSortingDetails] = useState(false)
  const [sortError, setSortError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(LIMIT)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const endpoint = type === 'all' ? `pokemon?limit=${POKEMON_CATALOG_LIMIT}&offset=0` : `type/${type}`
  const { data, loading, error } = useApi<ApiList | { pokemon: { pokemon: NamedResource }[] }>(endpoint)

  const catalog = useMemo<PokemonListItem[]>(() => {
    if (!data) return []
    return pokemonListItems('results' in data ? data.results : data.pokemon.map((entry) => entry.pokemon))
  }, [data])
  const filteredPokemon = useMemo(() => filterPokemonList(catalog, query), [catalog, query])
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

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || loading || sortingDetails || !hasMore || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      loadMore()
    }, { rootMargin: '300px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, sortingDetails, visibleCount])

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
    setType(nextType)
    setVisibleCount(LIMIT)
  }

  const changeQuery = (nextQuery: string) => {
    setQuery(nextQuery.toLowerCase())
    setVisibleCount(LIMIT)
  }

  const changeSort = (nextSort: PokemonSortKey) => {
    setSort(nextSort)
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

  return (
    <section className="page content-width">
      <div className="page-title"><div><span className="eyebrow">{t('pokedex.eyebrow')}</span><h1>{t('pokedex.title')}</h1><p>{t('pokedex.description')}</p></div><div className="result-count"><b>{formatNumber(total || 1302, language)}</b><span>{t('pokedex.registered')}</span></div></div>
      <div className="filter-panel">
        <div className="filter-primary">
          <label className="search-field"><Search size={20} /><input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder={t('pokedex.filter')} /></label>
          <label className="sort-field">
            {sortingDetails ? <LoaderCircle className="sort-spinner" size={18} /> : <ArrowUpDown size={18} />}
            <span>{t('pokedex.sort.label')}</span>
            <select value={sort} onChange={(event) => changeSort(event.target.value as PokemonSortKey)} aria-label={t('pokedex.sort.label')}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="type-filter"><SlidersHorizontal size={18} /><div>{types.map((item) => <button key={item} className={type === item ? 'active' : ''} onClick={() => selectType(item)}>{item === 'all' ? t('pokedex.all') : <TypeBadge type={item} />}</button>)}</div></div>
        {sortingDetails && <p className="sort-status" role="status">{t('pokedex.sort.loading')}</p>}
        {sortError && <p className="sort-status inline-sort-error" role="alert">{t('pokedex.sort.error')}</p>}
      </div>
      {loading && !catalog.length ? <CardSkeleton count={12} /> : error && !catalog.length ? <p className="inline-error">{t('pokedex.loadError')}</p> : visiblePokemon.length ? (
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
