import { Heart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { pokemonArtwork, prettyName } from '../lib/api'
import type { Pokemon } from '../types'
import { TypeBadge } from './TypeBadge'

type SortMetric = { label: string; value: number }

type Props = { id: number; name: string; pokemon?: Pokemon; sortMetric?: SortMetric }

export function PokemonCard({ id, name, pokemon, sortMetric }: Props) {
  const { isFavorite, toggle } = useFavoritesContext()
  const { t } = useLanguage()
  const cardRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(Boolean(pokemon))
  const { data: loadedPokemon } = useApi<Pokemon>(!pokemon && visible ? `pokemon/${name}` : null)
  const detail = pokemon ?? loadedPokemon
  const favorite = isFavorite(name)

  useEffect(() => {
    const target = cardRef.current
    if (!target || visible) return
    if (!('IntersectionObserver' in window)) { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [visible])

  return (
    <article ref={cardRef} className="pokemon-card">
      <div className="card-top">
        <span className="pokemon-number">#{String(id).padStart(4, '0')}</span>
        {sortMetric && <span className="sort-metric" title={sortMetric.label}><b>{sortMetric.value}</b> {sortMetric.label}</span>}
        <button className={`favorite-button ${favorite ? 'selected' : ''}`} onClick={() => toggle(name)} aria-label={t(favorite ? 'favorite.remove' : 'favorite.add', { name })}><Heart size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
      </div>
      <Link to={`/pokemon/${name}`} className="pokemon-card-link">
        <div className="pokemon-image-wrap">
          <span className="card-orb" />
          <img src={detail?.sprites.other?.['official-artwork']?.front_default ?? pokemonArtwork(id)} alt={prettyName(name)} width="165" height="165" loading="lazy" decoding="async" />
        </div>
        <h3>{prettyName(name)}</h3>
        <div className="type-row">
          {detail?.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) ?? <span className="muted">{t('common.details')}</span>}
        </div>
      </Link>
    </article>
  )
}
