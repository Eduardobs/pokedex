import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Braces, Dna, ExternalLink, Gamepad2, Gem, MapPin, Tags, Zap } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { ResourceValue } from '../components/ResourceValue'
import { DamageClassBadge, GenderBadge } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { itemSprite, localizedName, localizedText, prettyName } from '../lib/api'

const hidden = new Set(['id', 'name', 'names', 'flavor_text_entries', 'effect_entries', 'sprites'])

function fieldIcon(key: string): LucideIcon {
  if (/(type|category|class|attribute|pocket)/.test(key)) return Tags
  if (/(effect|damage|power|chance|trigger)/.test(key)) return Zap
  if (/(game|version|generation|pokedex)/.test(key)) return Gamepad2
  if (/(location|region|area|habitat)/.test(key)) return MapPin
  if (/(pokemon|species|form|egg)/.test(key)) return Dna
  if (/(item|berry|machine)/.test(key)) return Gem
  return Braces
}

export function ResourceDetailPage() {
  const { apiLanguage, language, t } = useLanguage()
  const { resource = '', name = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const meta = getResourceMeta(resource, language)
  const ResourceIcon = meta?.icon ?? Braces
  const GroupIcon = meta?.groupIcon
  const resourcePath = valid ? `${encodeURIComponent(resource)}/${encodeURIComponent(name)}` : null
  const { data, loading, error } = useApi<Record<string, unknown>>(resourcePath)
  if (loading) return <Loading />
  if (error || !data) return <ErrorState title={t('resource.notFound')} message={t('resource.notFoundDesc')} />
  if ((resource === 'pokemon' || resource === 'pokemon-species') && typeof data.name === 'string') {
    return <Navigate to={`/pokemon/${encodeURIComponent(data.name)}`} replace />
  }
  const title = localizedName(data.names, apiLanguage) || (typeof data.name === 'string' ? data.name : `${getResourceLabel(resource, language)} #${data.id ?? name}`)
  const description = localizedText(data.flavor_text_entries, undefined, apiLanguage) || localizedText(data.effect_entries, undefined, apiLanguage)
  const entries = Object.entries(data).filter(([key]) => !hidden.has(key))
  const moveType = resource === 'move' && data.type && typeof data.type === 'object' ? (data.type as { name?: string }).name : undefined
  const moveClass = resource === 'move' && data.damage_class && typeof data.damage_class === 'object' ? (data.damage_class as { name?: string }).name : undefined
  return (
    <section className="page content-width detail-resource-page" style={{ '--resource-color': meta?.groupColor ?? '#64748b' } as React.CSSProperties}>
      <div className="breadcrumbs"><Link to="/explorar">{t('explore.breadcrumb')}</Link><span>/</span>{meta?.groupTitle && GroupIcon && <><span className="breadcrumb-group"><GroupIcon size={13} />{meta.groupTitle}</span><span>/</span></>}<Link to={`/explorar/${resource}`}>{getResourceLabel(resource, language)}</Link><span>/</span><span>{prettyName(String(title))}</span></div>
      <header className="resource-detail-header">
        <Link to={`/explorar/${resource}`} className="icon-button"><ArrowLeft /></Link>
        <span className="resource-detail-mark"><ResourceIcon /></span>
        {resource === 'item' && <img src={itemSprite(String(data.name))} alt="" />}
        <div><span className="eyebrow">{getResourceLabel(resource, language)} · #{String(data.id ?? '—').padStart(3, '0')}</span><h1>{prettyName(String(title))}</h1>{description && <p>{description}</p>}<div className="resource-semantic-badges">{resource === 'type' && <TypeBadge type={String(data.name)} />}{moveType && <TypeBadge type={moveType} />}{moveClass && <DamageClassBadge value={moveClass} />}{resource === 'gender' && <GenderBadge value={String(data.name)} />}{resource === 'ability' && <span className="resource-kind-badge"><Zap size={14} />{t('resource.passiveAbility')}</span>}</div></div>
        <a className="button secondary api-link" href={`https://pokeapi.co/api/v2/${encodeURIComponent(resource)}/${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer">JSON <ExternalLink size={16} /></a>
      </header>
      <div className="resource-detail-grid">{entries.map(([key, value]) => {
        const FieldIcon = fieldIcon(key)
        return <article className="detail-field" key={key}><h2><span className="detail-field-icon"><FieldIcon size={15} /></span>{prettyName(key)}</h2><ResourceValue value={value} /></article>
      })}</div>
    </section>
  )
}
