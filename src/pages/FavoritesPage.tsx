import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FavoritePokemonCard } from '../components/FavoritePokemonCard'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'

export function FavoritesPage() {
  const { favorites } = useFavoritesContext()
  const { t } = useLanguage()
  return (
    <section className="page content-width">
      <div className="page-title"><div><span className="eyebrow">{t('favorites.eyebrow')}</span><h1>{t('favorites.title')}</h1><p>{t('favorites.description')}</p></div></div>
      {favorites.length ? <div className="pokemon-grid">{favorites.map((name) => <FavoritePokemonCard key={name} name={name} />)}</div> : <div className="empty favorites-empty"><Heart /><h2>{t('favorites.empty')}</h2><p>{t('favorites.emptyDesc')}</p><Link to="/pokemon" className="button primary">{t('favorites.explore')}</Link></div>}
    </section>
  )
}
