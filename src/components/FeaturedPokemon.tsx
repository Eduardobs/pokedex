import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useFeaturedPokemon } from '../hooks/useFeaturedPokemon'
import { pokemonArtwork, pokemonHomeSprite, prettyName } from '../lib/api'
import { FallbackImage } from './FallbackImage'

export function FeaturedPokemon() {
  const { t } = useLanguage()
  const { id, data, loading, error, retry } = useFeaturedPokemon()
  const number = `#${String(id).padStart(4, '0')}`
  const name = data ? prettyName(data.name) : number
  return (
    <>
      <span className="hero-specimen-number" aria-hidden="true">
        {String(id).padStart(3, '0')}
      </span>
      <div className="hero-orbit" aria-hidden="true" />
      <Link
        to={`/pokemon/${data?.name ?? id}`}
        className="hero-featured-pokemon"
        aria-label={t('home.openFeatured', { name })}
      >
        <FallbackImage
          key={id}
          sources={[{ src: pokemonArtwork(id) }, { src: pokemonHomeSprite(id) }]}
          alt={name}
          width="475"
          height="475"
          fetchPriority="high"
          decoding="async"
        />
        <span className="hero-specimen-caption">
          <span>{number}</span>
          <span className="hero-specimen-name" aria-live="polite">
            {loading ? t('common.loadingShort') : name}
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </span>
      </Link>
      {error && (
        <div className="hero-featured-error">
          <p role="status">{t('home.featuredError')}</p>
          <button type="button" onClick={retry}>
            {t('common.retry')}
          </button>
        </div>
      )}
    </>
  )
}
