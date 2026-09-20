import { Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CardSkeleton } from '../components/Loading'
import { PokemonCard } from '../components/PokemonCard'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { formatNumber, pokemonListItems } from '../lib/api'
import type { ApiList, NamedResource, PokemonListItem } from '../types'

const LIMIT = 24
const types = ['all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

export function PokedexPage() {
  const { language, t } = useLanguage()
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [loadedPokemon, setLoadedPokemon] = useState<PokemonListItem[]>([])
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
  const list = useMemo(
    () => visiblePokemon.filter((item) => !query || item.name.includes(query.toLowerCase()) || String(item.id) === query),
    [query, visiblePokemon],
  )
  const total = type === 'all'
    ? data && 'results' in data ? data.count : loadedPokemon.length
    : typePokemon.length
  const hasMore = type === 'all' ? loadedPokemon.length < total : visibleCount < typePokemon.length

  const loadMore = useCallback(() => {
    if (loading || !hasMore || query) return
    if (type === 'all') setOffset((current) => current + LIMIT)
    else setVisibleCount((current) => Math.min(current + LIMIT, typePokemon.length))
  }, [hasMore, loading, query, type, typePokemon.length])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || loading || !hasMore || query || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      loadMore()
    }, { rootMargin: '300px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, query])

  const selectType = (nextType: string) => {
    if (nextType === type) return
    setType(nextType)
    setOffset(0)
    setVisibleCount(LIMIT)
    setLoadedPokemon([])
  }

  return (
    <section className="page content-width">
      <div className="page-title"><div><span className="eyebrow">{t('pokedex.eyebrow')}</span><h1>{t('pokedex.title')}</h1><p>{t('pokedex.description')}</p></div><div className="result-count"><b>{formatNumber(total || 1302, language)}</b><span>{t('pokedex.registered')}</span></div></div>
      <div className="filter-panel">
        <label className="search-field"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value.toLowerCase())} placeholder={t('pokedex.filter')} /></label>
        <div className="type-filter"><SlidersHorizontal size={18} /><div>{types.map((item) => <button key={item} className={type === item ? 'active' : ''} onClick={() => selectType(item)}>{item === 'all' ? t('pokedex.all') : <TypeBadge type={item} />}</button>)}</div></div>
      </div>
      {loading && !visiblePokemon.length ? <CardSkeleton count={12} /> : error && !visiblePokemon.length ? <p className="inline-error">{t('pokedex.loadError')}</p> : list.length ? (
        <div className="pokemon-grid">{list.map((pokemon) => <PokemonCard key={pokemon.name} {...pokemon} />)}</div>
      ) : <div className="empty"><Search /><h2>{t('pokedex.empty')}</h2><p>{t('pokedex.tryAnother')}</p></div>}
      {!query && hasMore && <div ref={loadMoreRef} className="infinite-loader" role="status" aria-live="polite"><span className="pokeball-spinner" /><button onClick={loadMore} disabled={loading}>{loading ? t('pokedex.loadingMore') : t('pokedex.loadMore')}</button></div>}
      {!query && !hasMore && visiblePokemon.length > 0 && <p className="end-of-list">{t('pokedex.end')}</p>}
    </section>
  )
}
