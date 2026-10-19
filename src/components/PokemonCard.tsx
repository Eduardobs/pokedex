import { Globe2, Heart, Maximize2, Shield } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { pokemonArtwork, prettyName } from '../lib/api'
import type { PokemonCardDetails } from '../lib/pokemon-card-catalog'
import { formLabels, type FormCategory } from '../lib/pokemon-forms'
import type { NamedResource, Pokemon } from '../types'
import { FallbackImage } from './FallbackImage'
import { MegaEvolutionIcon } from './MegaEvolutionIcon'
import { TypeBadge } from './TypeBadge'

type SortMetric = { label: string; value: number }

type PokemonProps = {
  id: number
  name: string
  pokemon?: Pokemon
  sortMetric?: SortMetric
  shiny?: boolean
  details?: PokemonCardDetails
  loadError?: boolean
  onRetry?: () => void
  resource?: never
  category?: never
}

type PokemonFormProps = {
  resource: NamedResource
  category: FormCategory
  sortMetric?: SortMetric
  shiny?: boolean
  details?: PokemonCardDetails
  loadError?: boolean
  onRetry?: () => void
  id?: never
  name?: never
  pokemon?: never
}

type Props = PokemonProps | PokemonFormProps

type PokemonCardViewProps = {
  cardRef: RefObject<HTMLElement | null>
  id: number
  name: string
  displayName: string
  artwork: ReactNode
  types: Pokemon['types']
  sortMetric?: SortMetric
  action?: ReactNode
  category?: FormCategory
  categoryLabel?: ReactNode
  variation?: string
  linkState?: { fromCatalog: 'forms' }
  typeFallback?: ReactNode
  footer?: ReactNode
}

const categoryConfig = {
  regional: { labelKey: 'form.regional', icon: Globe2 },
  mega: { labelKey: 'form.mega', icon: MegaEvolutionIcon },
  gmax: { labelKey: 'forms.gmax', icon: Maximize2 },
} as const

function PokemonCardView({
  cardRef,
  id,
  name,
  displayName,
  artwork,
  types,
  sortMetric,
  action,
  category,
  categoryLabel,
  variation,
  linkState,
  typeFallback,
  footer,
}: PokemonCardViewProps) {
  return (
    <article ref={cardRef} className={`pokemon-card${category ? ` pokemon-card-${category}` : ''}`}>
      <div className="card-top">
        <span className="pokemon-number">#{String(id).padStart(4, '0')}</span>
        {sortMetric && (
          <span className="sort-metric" title={sortMetric.label}>
            <b>{sortMetric.value}</b> {sortMetric.label}
          </span>
        )}
        {action}
      </div>
      <div className="pokemon-image-wrap">
        <Link to={`/pokemon/${name}`} state={linkState} className="pokemon-image-link">
          <span className="card-orb" />
          {artwork}
        </Link>
      </div>
      <Link to={`/pokemon/${name}`} state={linkState} className="pokemon-card-link">
        {category && <span className="pokemon-card-category">{categoryLabel}</span>}
        <h3>{displayName}</h3>
        {variation && <p className="pokemon-card-variation">{variation}</p>}
        <div className="type-row">
          {types.length ? types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) : typeFallback}
        </div>
      </Link>
      {footer}
    </article>
  )
}

function PokemonSummaryCard({
  id,
  name,
  pokemon,
  details,
  loadError,
  onRetry,
  sortMetric,
  shiny = false,
}: PokemonProps) {
  const { isFavorite, toggle } = useFavoritesContext()
  const { t } = useLanguage()
  const cardRef = { current: null }
  const detail = pokemon ?? details
  const favorite = isFavorite(name)
  const displayName = prettyName(name)
  const normalArtwork =
    pokemon?.sprites.other?.['official-artwork']?.front_default ?? pokemon?.sprites.front_default ?? pokemonArtwork(id)
  const shinyArtwork =
    pokemon?.sprites.other?.['official-artwork']?.front_shiny ??
    pokemon?.sprites.front_shiny ??
    pokemonArtwork(id, true)
  const showingShiny = shiny
  const artwork = showingShiny ? shinyArtwork : normalArtwork

  return (
    <PokemonCardView
      cardRef={cardRef}
      id={id}
      name={name}
      displayName={displayName}
      sortMetric={sortMetric}
      types={detail?.types ?? []}
      artwork={
        <img
          src={artwork}
          alt={`${displayName} — ${t(showingShiny ? 'detail.shiny' : 'detail.normal')}`}
          width="165"
          height="165"
          loading="lazy"
          decoding="async"
        />
      }
      action={
        <button
          className={`favorite-button ${favorite ? 'selected' : ''}`}
          onClick={() => toggle(name)}
          aria-label={t(favorite ? 'favorite.remove' : 'favorite.add', { name })}
        >
          <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      }
      typeFallback={
        loadError ? (
          <span className="inline-card-error">{t('error.message')}</span>
        ) : (
          <span className="card-type-skeleton skeleton" aria-label={t('common.loadingShort')} />
        )
      }
      footer={
        loadError && !pokemon ? (
          <button type="button" className="card-retry" onClick={onRetry}>
            {t('common.retry')}
          </button>
        ) : undefined
      }
    />
  )
}

function DirectoryFormArtwork({
  pokemonId,
  shiny,
  normalAlt,
  shinyAlt,
}: {
  pokemonId: number
  shiny: boolean
  normalAlt: string
  shinyAlt: string
}) {
  const sources = [
    ...(shiny
      ? [
          { src: pokemonArtwork(pokemonId, true), alt: shinyAlt },
          {
            src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
            className: 'sprite-art',
            alt: shinyAlt,
          },
        ]
      : []),
    { src: pokemonArtwork(pokemonId), alt: normalAlt },
    {
      src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
      className: 'sprite-art',
      alt: normalAlt,
    },
  ]

  return <FallbackImage sources={sources} alt={normalAlt} width="165" height="165" loading="lazy" decoding="async" />
}

function PokemonFormCard({
  resource,
  category,
  details,
  loadError,
  onRetry,
  shiny = false,
  sortMetric,
}: PokemonFormProps) {
  const { t } = useLanguage()
  const cardRef = { current: null }

  if (loadError)
    return (
      <article ref={cardRef} className="pokemon-card pokemon-card-error" role="alert">
        <Shield aria-hidden="true" />
        <h2>{prettyName(resource.name)}</h2>
        <p>{t('forms.cardUnavailable')}</p>
        <button type="button" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </article>
    )
  if (!details)
    return (
      <article
        ref={cardRef}
        className="pokemon-card pokemon-card-skeleton skeleton"
        aria-label={`${t('common.loadingShort')} ${resource.name}`}
      />
    )

  const pokemonId = details.id
  const labels = formLabels(details.name, category, t)
  const config = categoryConfig[category]
  const Icon = config.icon
  const baseAlt = `${labels.pokemon} — ${labels.variation}`

  return (
    <PokemonCardView
      cardRef={cardRef}
      id={pokemonId}
      name={details.name}
      displayName={labels.pokemon}
      types={details.types}
      sortMetric={sortMetric}
      category={category}
      categoryLabel={
        <>
          <Icon size={13} />
          {t(config.labelKey)}
        </>
      }
      variation={labels.variation}
      linkState={{ fromCatalog: 'forms' }}
      artwork={
        <DirectoryFormArtwork
          key={`${details.name}:${shiny}`}
          pokemonId={pokemonId}
          shiny={shiny}
          normalAlt={`${baseAlt} — ${t('detail.normal')}`}
          shinyAlt={`${baseAlt} — ${t('detail.shiny')}`}
        />
      }
      action={
        details.isBattleOnly ? (
          <small className="pokemon-card-battle" title={t('form.battleOnly')}>
            <Shield size={11} />
            {t('form.battle')}
          </small>
        ) : undefined
      }
    />
  )
}

export function PokemonCard(props: Props) {
  return props.resource ? <PokemonFormCard {...props} /> : <PokemonSummaryCard {...props} />
}
