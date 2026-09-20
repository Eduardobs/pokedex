import { ArrowUpDown, LoaderCircle, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CardSkeleton } from '../components/Loading'
import { PokemonCard } from '../components/PokemonCard'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { apiFetch, formatNumber, pokemonListItems } from '../lib/api'
import { getPokemonSortValue, pokemonSortNeedsDetails, sortPokemonList, type PokemonSortKey } from '../lib/pokemon-sort'
import type { ApiList, NamedResource, Pokemon, PokemonListItem } from '../types'

const LIMIT = 24
const types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

export function PokedexPage() {
  const { language, t } = useLanguage()
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState<PokemonSortKey>('number')
  const [loadedPokemon, setLoadedPokemon] = useState<PokemonListItem[]>([])
  const [pokemonDetails, setPokemonDetails] = useState<Record<string, Pokemon>>({})
  const pokemonDetailsRef = useRef<Record<string, Pokemon>>({})
  const [sortingDetails, setSortingDetails] = useState(false)
  const [visibleCount, setVisibleCount] = useState(LIMIT)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const endpoint = type === 'all' ? `pokemon?limit=${LIMIT}&offset=${offset}` : `type/${type}`
  const { data, loading, error } = useApi<ApiList | { pokemon: { pokemon: NamedResource }[] }>(endpoint)

  useEffect(() => {
    if (!data || type !== 'all' || !('results' in data)) return
    const nextPage = pokemonListItems(data.results)
    setLoadedPokemon((current) => {
      if (offset === 0) return nextPage
      const knownNames = new Set(current.map((pokemon) => pokemon.name))
      return [...current, ...nextPage.filter((pokemon) => !knownNames.has(pokemon.name))]
    })
  }, [data, offset, type])

  const typePokemon = useMemo(() => {
    if (!data || 'results' in data) return []
    return pokemonListItems(data.pokemon.map((entry) => entry.pokemon))
  }, [data])

  const visiblePokemon = useMemo(
    () => type === 'all' ? loadedPokemon : typePokemon.slice(0, visibleCount),
    [loadedPokemon, type, typePokemon, visibleCount],
  )
  const list = useMemo(() => sortPokemonList(
    visiblePokemon.filter((item) => !query || item.name.includes(query.toLowerCase()) || String(item.id) === query),
    sort,
    pokemonDetails,
    language,
  ), [language, pokemonDetails, query, sort, visiblePokemon])
  const total = type === 'all'
    ? data && 'results' in data ? data.count : loadedPokemon.length
    : typePokemon.length
  const hasMore = type === 'all' ? loadedPokemon.length < total : visibleCount < typePokemon.length

  const loadMore = useCallback(() => {
    if (loading || sortingDetails || !hasMore || query) return
    if (type === 'all') setOffset((current) => current + LIMIT)
    else setVisibleCount((current) => Math.min(current + LIMIT, typePokemon.length))
  }, [hasMore, loading, query, sortingDetails, type, typePokemon.length])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || loading || sortingDetails || !hasMore || query || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      loadMore()
    }, { rootMargin: '300px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, query, sortingDetails])

  useEffect(() => {
    if (!pokemonSortNeedsDetails(sort)) {
      setSortingDetails(false)
      return
    }

    const missing = visiblePokemon.filter((pokemon) => !pokemonDetailsRef.current[pokemon.name])
    if (!missing.length) {
      setSortingDetails(false)
      return
    }

    const controller = new AbortController()
    setSortingDetails(true)
    Promise.allSettled(missing.map((pokemon) => apiFetch<Pokemon>(`pokemon/${pokemon.name}`, controller.signal)))
      .then((results) => {
        if (controller.signal.aborted) return
        setPokemonDetails((current) => {
          const next = { ...current }
          results.forEach((result) => {
            if (result.status === 'fulfilled') next[result.value.name] = result.value
          })
          pokemonDetailsRef.current = next
          return next
        })
      })
      .finally(() => { if (!controller.signal.aborted) setSortingDetails(false) })
    return () => controller.abort()
  }, [sort, visiblePokemon])

  const selectType = (nextType: string) => {
    if (nextType === type) return
    setType(nextType)
    setOffset(0)
    setVisibleCount(LIMIT)
    setLoadedPokemon([])
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
          <label className="search-field"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value.toLowerCase())} placeholder={t('pokedex.filter')} /></label>
          <label className="sort-field">
            {sortingDetails ? <LoaderCircle className="sort-spinner" size={18} /> : <ArrowUpDown size={18} />}
            <span>{t('pokedex.sort.label')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as PokemonSortKey)} aria-label={t('pokedex.sort.label')}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="type-filter"><SlidersHorizontal size={18} /><div>{types.map((item) => <button key={item} className={type === item ? 'active' : ''} onClick={() => selectType(item)}>{item === 'all' ? t('pokedex.all') : <TypeBadge type={item} />}</button>)}</div></div>
        {sortingDetails && <p className="sort-status" role="status">{t('pokedex.sort.loading')}</p>}
      </div>
      {loading && !visiblePokemon.length ? <CardSkeleton count={12} /> : error && !visiblePokemon.length ? <p className="inline-error">{t('pokedex.loadError')}</p> : list.length ? (
        <div className="pokemon-grid">{list.map((pokemon) => {
          const value = getPokemonSortValue(pokemonDetails[pokemon.name], sort)
          const sortMetric = value === undefined ? undefined : { label: selectedSortMetric, value }
          return <PokemonCard key={pokemon.name} {...pokemon} pokemon={pokemonDetails[pokemon.name]} sortMetric={sortMetric} />
        })}</div>
      ) : <div className="empty"><Search /><h2>{t('pokedex.empty')}</h2><p>{t('pokedex.tryAnother')}</p></div>}
      {!query && hasMore && <div ref={loadMoreRef} className="infinite-loader" role="status" aria-live="polite"><span className="pokeball-spinner" /><button onClick={loadMore} disabled={loading || sortingDetails}>{loading ? t('pokedex.loadingMore') : sortingDetails ? t('pokedex.sort.loading') : t('pokedex.loadMore')}</button></div>}
      {!query && !hasMore && visiblePokemon.length > 0 && <p className="end-of-list">{t('pokedex.end')}</p>}
    </section>
  )
}
