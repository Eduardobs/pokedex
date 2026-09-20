import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { pokemonArtwork, prettyName } from '../lib/api'
import type { Pokemon } from '../types'
import { TypeBadge } from './TypeBadge'

type Props = { id: number; name: string; pokemon?: Pokemon }

export function PokemonCard({ id, name, pokemon }: Props) {
  const { isFavorite, toggle } = useFavoritesContext()
  const { t } = useLanguage()
  return (
    <article className="pokemon-card">
      <div className="card-top">
        <span className="pokemon-number">#{String(id).padStart(4, '0')}</span>
        <button className={`favorite-button ${isFavorite(name) ? 'selected' : ''}`} onClick={() => toggle(name)} aria-label={t(isFavorite(name) ? 'favorite.remove' : 'favorite.add', { name })}><Heart size={19} fill={isFavorite(name) ? 'currentColor' : 'none'} /></button>
      </div>
      <Link to={`/pokemon/${name}`} className="pokemon-card-link">
        <div className="pokemon-image-wrap">
          <span className="card-orb" />
          <img src={pokemon?.sprites.other?.['official-artwork']?.front_default ?? pokemonArtwork(id)} alt={prettyName(name)} loading="lazy" />
        </div>
        <h3>{prettyName(name)}</h3>
        <div className="type-row">
          {pokemon?.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) ?? <span className="muted">{t('common.details')}</span>}
        </div>
      </Link>
    </article>
  )
}
