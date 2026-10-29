import { FormConditions } from '../components/FormConditions'
import { ExperiencePlanner } from '../components/ExperiencePlanner'
import { ItemPrices } from '../components/ItemPrices'
import { MoveSupplementalDetails } from '../components/MoveSupplementalDetails'
import { VersionDescriptions } from '../components/VersionDescriptions'
import { ArrowLeft, Braces, ExternalLink, Zap } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { ItemImage } from '../components/ItemImage'
import { ResourceFields } from '../components/ResourceFields'
import { DamageClassBadge, DamageClassIcon, GenderBadge, normalizedDamageClass } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { berrySprite, localizedName, localizedTextResult, prettyName } from '../lib/api'
import { groupResourceEntries } from '../lib/resource-presentation'
import { formatNumber } from '../lib/api'

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
  const fields = groupResourceEntries(resource, data)
  const pokemonGender =
    resource === 'gender' && (data.name === 'female' || data.name === 'male') ? data.name : undefined
  const sections = [
    { key: 'summary', title: t('resource.summary'), entries: fields.summary },
    { key: 'details', title: t('resource.detailsAndRules'), entries: fields.details },
    { key: 'collections', title: t('resource.relationships'), entries: fields.collections },
  ] as const
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
        <Link to="/explore">{t('explore.breadcrumb')}</Link>
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
        <Link to={`/explore/${resource}`}>{getResourceLabel(resource, language)}</Link>
        <span>/</span>
        <span>{prettyName(String(title))}</span>
      </div>
      <header className="resource-detail-header">
        <Link
          to={`/explore/${resource}`}
          className="icon-button"
          aria-label={t('resource.back')}
          title={t('resource.back')}
        >
          <ArrowLeft />
        </Link>
        {resource === 'item' ? (
          <ItemImage
            name={String(data.name)}
            fallbackIcon={ResourceIcon}
            fallbackClassName="resource-detail-mark"
            alt=""
            width="72"
            height="72"
            loading="lazy"
            decoding="async"
          />
        ) : berryName ? (
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
        <div>
          <span className="eyebrow">
            {getResourceLabel(resource, language)} · #{String(data.id ?? '—').padStart(3, '0')}
          </span>
          <h1>{prettyName(String(title))}</h1>
          {description && <p lang={descriptionResult.language}>{description}</p>}
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
      <VersionDescriptions key={resourcePath} entries={data.flavor_text_entries} />
      {resource === 'move' && typeof data.name === 'string' && <MoveSupplementalDetails moveName={data.name} />}
      {resource === 'item' && <ItemPrices key={resourcePath} value={data.prices} />}
      {resource === 'pokemon-form' && <FormConditions conditions={data.trigger_conditions} />}
      {resource === 'growth-rate' && <ExperiencePlanner key={resourcePath} data={data} />}
      {resource === 'move' && (
        <Link className="button secondary" to={`/compare-moves?left=${encodeURIComponent(String(data.name))}`}>
          {t('tools.compare')}
        </Link>
      )}
      <nav className="resource-section-nav" aria-label={t('resource.sections')}>
        {sections
          .filter(({ entries }) => entries.length > 0)
          .map(({ key, title, entries }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                const heading = document.getElementById(`resource-${key}-title`)
                heading?.scrollIntoView({ block: 'start', behavior: 'auto' })
                heading?.focus({ preventScroll: true })
              }}
            >
              {title}
              <span aria-hidden="true">{formatNumber(entries.length, language)}</span>
            </button>
          ))}
      </nav>
      {sections
        .filter(({ entries }) => entries.length > 0)
        .map(({ key, title, entries }) => (
          <section
            className={`resource-section resource-${key}`}
            key={`${resourcePath}:${key}`}
            aria-labelledby={`resource-${key}-title`}
          >
            <h2 id={`resource-${key}-title`} tabIndex={-1}>
              {title}
            </h2>
            <ResourceFields entries={entries} pokemonGender={pokemonGender} />
          </section>
        ))}
      {fields.technical.length > 0 && (
        <details className="technical-details">
          <summary>
            <span>
              <Braces size={18} aria-hidden="true" />
              {t('resource.technicalData')}
            </span>
            <small>{t('resource.showTechnical')}</small>
          </summary>
          <ResourceFields key={resourcePath} entries={fields.technical} pokemonGender={pokemonGender} />
        </details>
      )}
    </section>
  )
}
