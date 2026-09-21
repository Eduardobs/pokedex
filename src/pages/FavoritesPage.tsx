import { ArrowUpDown, Heart, Search } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FavoritePokemonCard } from '../components/FavoritePokemonCard'
import { SearchField } from '../components/SearchField'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { normalizeSearchText, prettyName } from '../lib/api'

export function FavoritesPage() {
  const { favorites } = useFavoritesContext()
  const { language, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') === 'name' ? 'name' : 'recent'
  const visibleFavorites = useMemo(() => {
    const filtered = favorites.filter((name) => normalizeSearchText(name).includes(normalizeSearchText(query)))
    if (sort === 'name') return [...filtered].sort((left, right) => new Intl.Collator(language).compare(left, right))
    return [...filtered].reverse()
  }, [favorites, language, query, sort])
  const update = (key: string, value: string, defaultValue = '') => setSearchParams((current) => { const next = new URLSearchParams(current); if (!value || value === defaultValue) next.delete(key); else next.set(key, value); return next }, { replace: true })
  return (
    <section className="page content-width">
      <div className="page-title"><div><span className="eyebrow">{t('favorites.eyebrow')}</span><h1>{t('favorites.title')}</h1><p>{t('favorites.description')}</p></div>{favorites.length > 0 && <div className="result-count"><b>{favorites.length}</b><span>{favorites.length === 1 ? t('favorites.countOne') : t('favorites.count', { count: favorites.length })}</span></div>}</div>
      {favorites.length ? <><div className="favorites-toolbar"><SearchField value={query} onChange={(value) => update('q', value)} clearLabel={t('common.clear')} aria-label={t('favorites.search')} placeholder={t('favorites.search')} /><label className="sort-field"><ArrowUpDown size={18} /><span>{t('favorites.sort')}</span><select aria-label={t('favorites.sort')} value={sort} onChange={(event) => update('sort', event.target.value, 'recent')}><option value="recent">{t('favorites.sortRecent')}</option><option value="name">{t('favorites.sortName')}</option></select></label></div>{visibleFavorites.length ? <div className="pokemon-grid">{visibleFavorites.map((name) => <FavoritePokemonCard key={name} name={name} />)}</div> : <div className="empty"><Search /><h2>{t('pokedex.empty')}</h2><p>{prettyName(query)}</p></div>}</> : <div className="empty favorites-empty"><Heart /><h2>{t('favorites.empty')}</h2><p>{t('favorites.emptyDesc')}</p><Link to="/pokemon" className="button primary">{t('favorites.explore')}</Link></div>}
    </section>
  )
}
