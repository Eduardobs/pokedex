import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useIntersectionVisibility } from '../hooks/useIntersectionVisibility'
import { pokemonArtwork, prettyName } from '../lib/api'
import type { Pokemon } from '../types'
import { TypeBadge } from './TypeBadge'

type SortMetric = { label: string; value: number }

type Props = {
  id: number
  name: string
  pokemon?: Pokemon
  sortMetric?: SortMetric
  shiny?: boolean
}

export function PokemonCard({ id, name, pokemon, sortMetric, shiny = false }: Props) {
  const { isFavorite, toggle } = useFavoritesContext()
  const { t } = useLanguage()
  const { targetRef: cardRef, visible } = useIntersectionVisibility<HTMLElement>(Boolean(pokemon))
  const {
    data: loadedPokemon,
    error,
    retry,
  } = useApi<Pokemon>(!pokemon && visible ? `pokemon/${name}` : null)
  const detail = pokemon ?? loadedPokemon
  const favorite = isFavorite(name)
  const displayName = prettyName(name)
  const normalArtwork =
    detail?.sprites.other?.['official-artwork']?.front_default ??
    detail?.sprites.front_default ??
    pokemonArtwork(id)
  const shinyArtwork =
    detail?.sprites.other?.['official-artwork']?.front_shiny ?? detail?.sprites.front_shiny
  const showingShiny = shiny && Boolean(shinyArtwork)
  const artwork = showingShiny ? (shinyArtwork ?? normalArtwork) : normalArtwork

  return (
    <article ref={cardRef} className="pokemon-card">
      <div className="card-top">
        <span className="pokemon-number">#{String(id).padStart(4, '0')}</span>
        {sortMetric && (
          <span className="sort-metric" title={sortMetric.label}>
            <b>{sortMetric.value}</b> {sortMetric.label}
          </span>
        )}
        <button
          className={`favorite-button ${favorite ? 'selected' : ''}`}
          onClick={() => toggle(name)}
          aria-label={t(favorite ? 'favorite.remove' : 'favorite.add', { name })}
        >
          <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="pokemon-image-wrap">
        <Link to={`/pokemon/${name}`} className="pokemon-image-link">
          <span className="card-orb" />
          <img
            src={artwork}
            alt={`${displayName} — ${t(showingShiny ? 'detail.shiny' : 'detail.normal')}`}
            width="165"
            height="165"
            loading="lazy"
            decoding="async"
          />
        </Link>
      </div>
      <Link to={`/pokemon/${name}`} className="pokemon-card-link">
        <h3>{displayName}</h3>
        <div className="type-row">
          {detail?.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) ?? (
            <span className={error ? 'inline-card-error' : 'muted'}>
              {error ? t('error.message') : t('common.details')}
            </span>
          )}
        </div>
      </Link>
      {error && !pokemon && (
        <button type="button" className="card-retry" onClick={retry}>
          {t('common.retry')}
        </button>
      )}
    </article>
  )
}
