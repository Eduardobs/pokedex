import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Braces, Dna, ExternalLink, Gamepad2, Gem, MapPin, Tags, Zap } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { ResourceValue, resourceFieldLabel } from '../components/ResourceValue'
import { DamageClassBadge, DamageClassIcon, GenderBadge, normalizedDamageClass } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { berrySprite, itemSprite, localizedName, localizedTextResult, prettyName } from '../lib/api'
import { isRelatedPokemonList } from '../lib/related-pokemon'

const hidden = new Set(['id', 'name', 'names', 'flavor_text_entries', 'effect_entries', 'sprites'])
const summaryFields: Record<string, string[]> = {
  move: ['type', 'damage_class', 'power', 'accuracy', 'pp', 'priority', 'target'],
  ability: ['generation', 'is_main_series'],
  item: ['cost', 'category', 'attributes', 'fling_power', 'fling_effect'],
  berry: ['size', 'growth_time', 'max_harvest', 'natural_gift_power', 'natural_gift_type'],
  type: ['generation', 'move_damage_class'],
  region: ['main_generation', 'locations', 'pokedexes'],
}

function relatedPokemonGender(resource: string, key: string, name: unknown) {
  if (resource !== 'gender' || key !== 'required_for_evolution') return undefined
  return name === 'female' || name === 'male' ? name : undefined
}

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
  const { data, loading, error, retry } = useApi<Record<string, unknown>>(resourcePath)
  if (!valid) return <ErrorState title={t('resource.unknown')} message={t('resource.unknownDesc')} />
  if (loading) return <Loading />
  if (error || !data)
    return <ErrorState title={t('resource.notFound')} message={t('resource.notFoundDesc')} retry={retry} />
  if ((resource === 'pokemon' || resource === 'pokemon-species') && typeof data.name === 'string') {
    return <Navigate to={`/pokemon/${encodeURIComponent(data.name)}`} replace />
  }
  const title =
    localizedName(data.names, apiLanguage) ||
    (typeof data.name === 'string' ? data.name : `${getResourceLabel(resource, language)} #${data.id ?? name}`)
  const localizedDescription = localizedTextResult(data.flavor_text_entries, undefined, apiLanguage)
  const effectDescription = localizedTextResult(data.effect_entries, undefined, apiLanguage)
  const descriptionResult = localizedDescription.text ? localizedDescription : effectDescription
  const description = descriptionResult.text
  const entries = Object.entries(data).filter(([key]) => !hidden.has(key))
  const preferredKeys = summaryFields[resource] ?? entries.slice(0, 4).map(([key]) => key)
  const summaryEntries = entries.filter(([key]) => preferredKeys.includes(key))
  const technicalEntries = entries.filter(([key]) => !preferredKeys.includes(key))
  const moveType =
    resource === 'move' && data.type && typeof data.type === 'object'
      ? (data.type as { name?: string }).name
      : undefined
  const moveClass =
    resource === 'move' && data.damage_class && typeof data.damage_class === 'object'
      ? (data.damage_class as { name?: string }).name
      : undefined
  const damageClass =
    resource === 'move-damage-class' && typeof data.name === 'string' ? normalizedDamageClass(data.name) : undefined
  const berryName = resource === 'berry' && typeof data.name === 'string' ? data.name : null
  return (
    <section
      className="page content-width detail-resource-page"
      style={{ '--resource-color': meta?.groupColor ?? '#64748b' } as React.CSSProperties}
    >
      <div className="breadcrumbs">
        <Link to="/explorar">{t('explore.breadcrumb')}</Link>
        <span>/</span>
        {meta?.groupTitle && GroupIcon && (
          <>
            <span className="breadcrumb-group">
              <GroupIcon size={13} />
              {meta.groupTitle}
            </span>
            <span>/</span>
          </>
        )}
        <Link to={`/explorar/${resource}`}>{getResourceLabel(resource, language)}</Link>
        <span>/</span>
        <span>{prettyName(String(title))}</span>
      </div>
      <header className="resource-detail-header">
        <Link
          to={`/explorar/${resource}`}
          className="icon-button"
          aria-label={t('resource.back')}
          title={t('resource.back')}
        >
          <ArrowLeft />
        </Link>
        {berryName ? (
          <img src={berrySprite(berryName)} alt="" width="72" height="72" loading="lazy" decoding="async" />
        ) : damageClass ? (
          <span className={`resource-detail-mark damage-class-detail-icon damage-${damageClass}`}>
            <DamageClassIcon value={damageClass} width="42" height="34" />
          </span>
        ) : (
          <span className="resource-detail-mark">
            <ResourceIcon />
          </span>
        )}
        {resource === 'item' && <img src={itemSprite(String(data.name))} alt="" loading="lazy" decoding="async" />}
        <div>
          <span className="eyebrow">
            {getResourceLabel(resource, language)} · #{String(data.id ?? '—').padStart(3, '0')}
          </span>
          <h1>{prettyName(String(title))}</h1>
          {description && <p>{description}</p>}
          {descriptionResult.fallback && language !== 'en' && (
            <small className="language-fallback">{t('detail.fallbackLanguage')}</small>
          )}
          <div className="resource-semantic-badges">
            {resource === 'type' && <TypeBadge type={String(data.name)} />}
            {moveType && <TypeBadge type={moveType} />}
            {moveClass && <DamageClassBadge value={moveClass} />}
            {damageClass && <DamageClassBadge value={damageClass} />}
            {resource === 'gender' && <GenderBadge value={String(data.name)} />}
            {resource === 'ability' && (
              <span className="resource-kind-badge">
                <Zap size={14} />
                {t('resource.passiveAbility')}
              </span>
            )}
          </div>
        </div>
        <a
          className="button secondary api-link technical-link"
          href={`https://pokeapi.co/api/v2/${encodeURIComponent(resource)}/${encodeURIComponent(name)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          JSON <ExternalLink size={16} />
        </a>
      </header>
      <section className="resource-summary" aria-labelledby="resource-summary-title">
        <h2 id="resource-summary-title">{t('resource.summary')}</h2>
        <div className="resource-detail-grid">
          {summaryEntries.map(([key, value]) => {
            const FieldIcon = fieldIcon(key)
            return (
              <article
                className={`detail-field${isRelatedPokemonList(value) ? ' related-pokemon-field' : ''}`}
                key={key}
              >
                <h3>
                  <span className="detail-field-icon">
                    <FieldIcon size={15} />
                  </span>
                  {resourceFieldLabel(key, language)}
                </h3>
                <ResourceValue value={value} pokemonGender={relatedPokemonGender(resource, key, data.name)} />
              </article>
            )
          })}
        </div>
      </section>
      {technicalEntries.length > 0 && (
        <details className="technical-details">
          <summary>
            <span>
              <Braces size={18} />
              {t('resource.technicalData')}
            </span>
            <small>{t('resource.showTechnical')}</small>
          </summary>
          <div className="resource-detail-grid">
            {technicalEntries.map(([key, value]) => {
              const FieldIcon = fieldIcon(key)
              return (
                <article
                  className={`detail-field${isRelatedPokemonList(value) ? ' related-pokemon-field' : ''}`}
                  key={key}
                >
                  <h3>
                    <span className="detail-field-icon">
                      <FieldIcon size={15} />
                    </span>
                    {resourceFieldLabel(key, language)}
                  </h3>
                  <ResourceValue value={value} pokemonGender={relatedPokemonGender(resource, key, data.name)} />
                </article>
              )
            })}
          </div>
        </details>
      )}
    </section>
  )
}
