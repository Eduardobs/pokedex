import { ChevronRight } from 'lucide-react'
import { Pagination } from '../components/Pagination'
import { Database, Search, Swords, TriangleAlert, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { EmptyState, InlineRetryError } from '../components/FeedbackState'
import { SearchField } from '../components/SearchField'
import { ItemImage } from '../components/ItemImage'
import {
  DamageClassBadge,
  DamageClassIcon,
  DamageClassIconSet,
  GenderBadge,
  normalizedDamageClass,
} from '../components/SemanticBadges'
import { TypeBadge, typeLabel } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useAbilityListDetails } from '../hooks/useAbilityListDetails'
import { useApi } from '../hooks/useApi'
import { useMoveListDetails } from '../hooks/useMoveListDetails'
import { berrySprite, formatNumber, localizedName, localizedTextResult, pokemonArtwork, prettyName } from '../lib/api'
import { defaultPokemonNameForSpecies } from '../lib/pokemon-species'
import type { ApiList, NamedResource } from '../types'
import { matchesResource, parseResourceDirectory, RESOURCE_SEARCH_LIMIT } from '../lib/resource-search'

const LIMIT = 40
const MAX_OFFSET = 100_000
const MAX_QUERY_LENGTH = 64
export function ResourceListPage() {
  const { apiLanguage, language, t } = useLanguage()
  const { resource = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const meta = getResourceMeta(resource, language)
  const ResourceIcon = meta?.icon ?? Database
  const GroupIcon = meta?.groupIcon
  const [searchParams, setSearchParams] = useSearchParams()
  const rawOffset = searchParams.get('offset') ?? ''
  const parsedOffset = Number(rawOffset || 0)
  const offset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0 && parsedOffset <= MAX_OFFSET
      ? Math.floor(parsedOffset / LIMIT) * LIMIT
      : 0
  const rawQuery = searchParams.get('q') ?? ''
  const query = rawQuery.slice(0, MAX_QUERY_LENGTH)
  const firstRender = useRef(true)
  const searching = Boolean(query.trim())
  const {
    data: response,
    loading,
    error,
    retry,
  } = useApi<ApiList<NamedResource | { url: string }>>(
    valid ? `${resource}?limit=${searching ? RESOURCE_SEARCH_LIMIT : LIMIT}&offset=${searching ? 0 : offset}` : null,
    searching ? parseResourceDirectory : undefined,
  )
  const data = response ?? { results: [], count: 0, next: null, previous: null }
  const items = data.results.map((item) => {
    const id = item.url.split('/').filter(Boolean).at(-1) ?? ''
    return { ...item, id, name: 'name' in item && item.name ? item.name : id }
  })
  const matches = searching ? items.filter((item) => matchesResource(item.name, item.url, query)) : items
  const collectionKey = JSON.stringify([resource, query])
  const [knownCount, setKnownCount] = useState({ key: collectionKey, total: 0 })
  const responseCount = searching ? matches.length : data.count
  if (response && (knownCount.key !== collectionKey || knownCount.total !== responseCount)) {
    setKnownCount({ key: collectionKey, total: responseCount })
  }
  const resultCount = response ? responseCount : knownCount.key === collectionKey ? knownCount.total : 0
  const filtered = searching ? matches.slice(offset, offset + LIMIT) : matches
  const moveDetails = useMoveListDetails(resource === 'move' ? filtered : [], apiLanguage)
  const abilityDetails = useAbilityListDetails(resource === 'ability' ? filtered : [], apiLanguage)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!searching) document.querySelector('.resource-list-hero')?.scrollIntoView?.({ block: 'start' })
  }, [offset, searching])
  useEffect(() => {
    const normalizedOffset = offset > 0 ? String(offset) : ''
    if (rawOffset === normalizedOffset && rawQuery === query) return
    const next = new URLSearchParams(searchParams)
    if (normalizedOffset) next.set('offset', normalizedOffset)
    else next.delete('offset')
    if (query) next.set('q', query)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }, [offset, query, rawOffset, rawQuery, searchParams, setSearchParams])
  useEffect(() => {
    if (!response || offset === 0 || offset < resultCount) return
    const lastOffset = resultCount > 0 ? Math.floor((resultCount - 1) / LIMIT) * LIMIT : 0
    const next = new URLSearchParams(searchParams)
    if (lastOffset > 0) next.set('offset', String(lastOffset))
    else next.delete('offset')
    setSearchParams(next, { replace: true })
  }, [response, resultCount, offset, searchParams, setSearchParams])
  const updateParams = (nextOffset: number, nextQuery = query) => {
    const next = new URLSearchParams()
    if (nextOffset > 0) next.set('offset', String(nextOffset))
    if (nextQuery) next.set('q', nextQuery)
    setSearchParams(next, { replace: true })
  }
  if (!valid) return <ErrorState title={t('resource.unknown')} message={t('resource.unknownDesc')} />
  const moveDisplayName = (name: string) =>
    localizedName(moveDetails.data?.[name]?.names, apiLanguage) || prettyName(name)
  const itemRoute = (name: string) => {
    if (resource === 'pokemon-species') return `/pokemon/${encodeURIComponent(defaultPokemonNameForSpecies(name))}`
    if (resource === 'pokemon') return `/pokemon/${encodeURIComponent(name)}`
    return `/explore/${resource}/${encodeURIComponent(name)}`
  }
  const resourceName = (name: string) => {
    if (resource === 'type') return <TypeBadge type={name} />
    if (resource === 'gender') return <GenderBadge value={name} />
    if (resource === 'move-damage-class') return <DamageClassBadge value={name} />
    if (resource === 'move')
      return (
        <span className="named-resource move">
          <Swords size={15} />
          {prettyName(name)}
        </span>
      )
    if (resource === 'ability')
      return (
        <span className="named-resource ability">
          <Zap size={15} />
          {prettyName(name)}
        </span>
      )
    return <b>{prettyName(name)}</b>
  }
  const pagination = (position: 'top' | 'bottom') => (
    <Pagination
      className={`collection-pagination collection-pagination-${position}`}
      page={Math.floor(offset / LIMIT) + 1}
      pageSize={LIMIT}
      total={resultCount}
      disabled={loading}
      onPageChange={(page) => updateParams((page - 1) * LIMIT)}
    />
  )
  return (
    <section
      className="page content-width resource-page"
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
        <span>{getResourceLabel(resource, language)}</span>
      </div>
      <div className="page-title resource-list-hero">
        <div className="resource-title-lockup">
          <span className="resource-page-icon">
            {resource === 'move-damage-class' ? <DamageClassIconSet /> : <ResourceIcon />}
          </span>
          <div>
            <span className="eyebrow">
              <Database size={14} /> {t('resource.apiCollection')}
            </span>
            <h1>{getResourceLabel(resource, language)}</h1>
            <p>{t('resource.available', { count: formatNumber(data.count, language) })}</p>
          </div>
        </div>
        <div className="resource-page-search">
          <SearchField
            value={query}
            onChange={(value) => updateParams(0, value)}
            clearLabel={t('common.clear')}
            compact
            aria-label={t('ui.collectionSearch')}
            placeholder={t('ui.collectionSearch')}
          />
          <small>{t('ui.collectionSearchHint')}</small>
        </div>
      </div>
      {resultCount > LIMIT && pagination('top')}
      {loading && (
        <div className="resource-list-skeleton" role="status" aria-label={t('common.loadingShort')}>
          {Array.from({ length: 8 }, (_, index) => (
            <div className="data-row-skeleton skeleton" key={index} />
          ))}
        </div>
      )}
      {error && <InlineRetryError message={t('resource.loadError')} retryLabel={t('common.retry')} onRetry={retry} />}
      {resource === 'move' && moveDetails.error && (
        <InlineRetryError message={t('move.detailsError')} retryLabel={t('common.retry')} onRetry={moveDetails.retry} />
      )}
      {resource === 'ability' && abilityDetails.error && (
        <InlineRetryError
          message={t('ability.detailsError')}
          retryLabel={t('common.retry')}
          onRetry={abilityDetails.retry}
        />
      )}
      <div
        className={`data-list${resource === 'move' ? ' move-data-list' : ''}${resource === 'ability' ? ' ability-data-list' : ''}`}
        aria-busy={(resource === 'move' && moveDetails.loading) || (resource === 'ability' && abilityDetails.loading)}
      >
        {resource === 'move' && (
          <div className="move-list-heading" aria-hidden="true">
            <span>#</span>
            <span>{t('move.name')}</span>
            <span>{t('move.type')}</span>
            <span>{t('move.damageClass')}</span>
            <span>{t('move.power')}</span>
            <span>{t('move.accuracy')}</span>
            <span>{t('move.pp')}</span>
            <span />
          </div>
        )}
        {resource === 'ability' && (
          <div className="ability-list-heading" aria-hidden="true">
            <span>#</span>
            <span />
            <span>{t('ability.name')}</span>
            <span>{t('ability.description')}</span>
            <span />
          </div>
        )}
        {filtered.map((item) => {
          const numericId = /^\d+$/.test(item.id) ? Number(item.id) : 0
          const hasValidId = Number.isSafeInteger(numericId) && numericId > 0
          const sprite =
            resource === 'berry'
              ? berrySprite(item.name)
              : resource === 'pokemon' && hasValidId
                ? pokemonArtwork(numericId)
                : undefined
          const damageClass = resource === 'move-damage-class' ? normalizedDamageClass(item.name) : null
          if (resource === 'move') {
            const detail = moveDetails.data?.[item.name]
            const displayName = moveDisplayName(item.name)
            const accuracy = detail && detail.accuracy !== null ? `${formatNumber(detail.accuracy, language)}%` : '—'
            const accessibleLabel = detail
              ? t('move.openDetailsSummary', {
                  name: displayName,
                  type: typeLabel(detail.type, language),
                  damageClass: t(`damage.${detail.damageClass}`),
                  power: detail.power === null ? '—' : formatNumber(detail.power, language),
                  accuracy,
                  pp: detail.pp === null ? '—' : formatNumber(detail.pp, language),
                })
              : t('move.openDetails', { name: displayName })
            return (
              <Link className="move-list-row" to={itemRoute(item.name)} key={item.name} aria-label={accessibleLabel}>
                <span className="data-index">{hasValidId ? `#${item.id.padStart(3, '0')}` : '—'}</span>
                <span className="move-list-name">
                  <Swords size={17} aria-hidden="true" />
                  <b>{displayName}</b>
                </span>
                <span className="move-list-type">
                  {detail ? <TypeBadge type={detail.type} /> : <i className="move-list-field-skeleton skeleton" />}
                </span>
                <span className="move-list-damage">
                  {detail ? (
                    <DamageClassBadge value={detail.damageClass} compact />
                  ) : (
                    <i className="move-list-icon-skeleton skeleton" />
                  )}
                </span>
                <span className="move-list-stat">
                  <small>{t('move.power')}</small>
                  {detail ? (
                    <b>{detail.power === null ? '—' : formatNumber(detail.power, language)}</b>
                  ) : (
                    <i className="skeleton" />
                  )}
                </span>
                <span className="move-list-stat">
                  <small>{t('move.accuracy')}</small>
                  {detail ? <b>{accuracy}</b> : <i className="skeleton" />}
                </span>
                <span className="move-list-stat">
                  <small>{t('move.pp')}</small>
                  {detail ? (
                    <b>{detail.pp === null ? '—' : formatNumber(detail.pp, language)}</b>
                  ) : (
                    <i className="skeleton" />
                  )}
                </span>
                <ChevronRight aria-hidden="true" />
              </Link>
            )
          }
          if (resource === 'ability') {
            const detail = abilityDetails.data?.[item.name]
            const description = localizedTextResult(detail?.effectEntries, ['short_effect'], apiLanguage)
            const translationMissing = detail
              ? !detail.effectEntries.some((entry) => entry.language.name === apiLanguage)
              : false
            const warningText = description.text ? t('ability.translationMissing') : t('ability.descriptionUnavailable')
            const tooltipId = `ability-translation-${item.id}`
            return (
              <Link
                className="ability-list-row"
                to={itemRoute(item.name)}
                key={item.name}
                aria-describedby={translationMissing ? tooltipId : undefined}
              >
                <span className="data-index">{hasValidId ? `#${item.id.padStart(3, '0')}` : '—'}</span>
                <span className="data-resource-icon">
                  <Zap size={17} aria-hidden="true" />
                </span>
                <span className="named-resource ability">
                  <b>{prettyName(item.name)}</b>
                </span>
                <span className="ability-list-description">
                  {detail ? (
                    <>
                      <span lang={description.language}>{description.text || '—'}</span>
                      {translationMissing && (
                        <span className="translation-warning">
                          <TriangleAlert size={16} aria-hidden="true" />
                          <span className="translation-tooltip" id={tooltipId} role="tooltip">
                            {warningText}
                          </span>
                        </span>
                      )}
                    </>
                  ) : abilityDetails.loading ? (
                    <i className="ability-description-skeleton skeleton" />
                  ) : (
                    '—'
                  )}
                </span>
                <ChevronRight aria-hidden="true" />
              </Link>
            )
          }
          return (
            <Link to={itemRoute(item.name)} key={item.name}>
              <span className="data-index">{hasValidId ? `#${item.id.padStart(3, '0')}` : '—'}</span>
              <span
                className={`data-resource-icon${damageClass ? ` damage-class-resource-icon damage-${damageClass}` : ''}`}
              >
                {resource === 'item' ? (
                  <ItemImage
                    name={item.name}
                    fallbackIcon={ResourceIcon}
                    alt=""
                    width="30"
                    height="30"
                    loading="lazy"
                    decoding="async"
                  />
                ) : damageClass ? (
                  <DamageClassIcon value={damageClass} width="25" height="20" />
                ) : sprite ? (
                  <img
                    className={resource === 'pokemon' ? 'pokemon-artwork' : undefined}
                    src={sprite}
                    alt=""
                    width="30"
                    height="30"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <ResourceIcon size={17} />
                )}
              </span>
              {resourceName(item.name)}
              <ChevronRight />
            </Link>
          )
        })}
      </div>
      {!loading && !error && !filtered.length && (
        <EmptyState icon={<Search />} title={t('resource.emptyPage')}>
          <button className="button secondary" onClick={() => updateParams(0, '')}>
            {t('ui.clearSearch')}
          </button>
        </EmptyState>
      )}
      {resultCount > LIMIT && pagination('bottom')}
    </section>
  )
}
