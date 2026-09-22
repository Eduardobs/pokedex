import { Globe2, Maximize2, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useIntersectionVisibility } from '../hooks/useIntersectionVisibility'
import { idFromUrl, pokemonArtwork, prettyName } from '../lib/api'
import type { NamedResource, PokemonForm } from '../types'
import { TypeBadge } from './TypeBadge'
import { Translate, useLanguage } from '../contexts/LanguageContext'
import { MegaEvolutionIcon } from './MegaEvolutionIcon'

export type FormCategory = 'regional' | 'mega' | 'gmax'

export function formCategory(name: string): FormCategory | null {
  if (name.includes('-gmax')) return 'gmax'
  if (name.match(/-mega(?:-|$)/)) return 'mega'
  if (['-alola', '-galar', '-hisui', '-paldea'].some((region) => name.includes(region))) return 'regional'
  return null
}

const categoryConfig = {
  regional: { labelKey: 'form.regional', icon: Globe2 },
  mega: { labelKey: 'form.mega', icon: MegaEvolutionIcon },
  gmax: { labelKey: 'forms.gmax', icon: Maximize2 },
}

export function formLabels(name: string, category: FormCategory, t?: Translate) {
  if (category === 'gmax') {
    const baseName = name.replace(/-gmax$/, '')
    return { baseName, pokemon: prettyName(baseName), variation: t?.('forms.gmax') ?? 'Gigantamax' }
  }

  if (category === 'mega') {
    const [base, suffix = ''] = name.split('-mega')
    return { baseName: base, pokemon: prettyName(base), variation: `${t?.('form.mega') ?? 'Mega Forma'}${suffix ? ` ${prettyName(suffix.replace(/^-/, ''))}` : ''}` }
  }

  const regionalMatch = name.match(/-(alola|galar|hisui|paldea)(?:-(.+))?$/)
  if (regionalMatch?.index !== undefined) {
    const regionNames: Record<string, string> = { alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea' }
    const detail = regionalMatch[2] ? ` · ${prettyName(regionalMatch[2])}` : ''
    const baseName = name.slice(0, regionalMatch.index)
    const regionLabel = t ? t('pokemonForms.regionForm', { region: regionNames[regionalMatch[1]] }) : `Forma de ${regionNames[regionalMatch[1]]}`
    return { baseName, pokemon: prettyName(baseName), variation: `${regionLabel}${detail}` }
  }

  return { baseName: name, pokemon: prettyName(name), variation: prettyName(name) }
}

export function PokemonFormDirectoryCard({ resource, category }: { resource: NamedResource; category: FormCategory }) {
  const { t } = useLanguage()
  const { targetRef: cardRef, visible } = useIntersectionVisibility<HTMLDivElement>(false, '300px')
  const { data, loading, error, retry } = useApi<PokemonForm>(visible ? resource.url : null)

  const config = categoryConfig[category]
  const Icon = config.icon
  if (error) return <article ref={cardRef} className="directory-form-card directory-form-card-error" role="alert"><Shield aria-hidden="true" /><h2>{prettyName(resource.name)}</h2><p>{t('forms.cardUnavailable')}</p><button type="button" onClick={retry}>{t('common.retry')}</button></article>
  if (!data || loading) return <div ref={cardRef} className="directory-form-card skeleton" aria-label={`${t('common.loadingShort')} ${resource.name}`} />

  const pokemonId = idFromUrl(data.pokemon.url)
  const artwork = pokemonArtwork(pokemonId)
  const labels = formLabels(data.pokemon.name, category, t)
  return (
    <div ref={cardRef} className={`directory-form-card directory-${category}`}>
      <Link to={`/pokemon/${data.pokemon.name}`}>
        <div className="directory-form-art"><span /><img src={artwork ?? data.sprites.front_default ?? ''} alt={`${labels.pokemon} — ${labels.variation}`} width="165" height="165" loading="lazy" decoding="async" />{data.is_battle_only && <small title={t('form.battleOnly')}><Shield size={11} />{t('form.battle')}</small>}</div>
        <div className="directory-form-info">
          <span className="directory-category"><Icon size={13} />{t(config.labelKey as 'form.regional')}</span>
          <h2>{labels.pokemon}</h2>
          <p>{labels.variation}</p>
          <div className="type-row">{data.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />)}</div>
        </div>
      </Link>
    </div>
  )
}
