import { ChevronLeft, ChevronRight, Database, Search, Swords, Zap } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { SearchField } from '../components/SearchField'
import { GenderBadge } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { berrySprite, formatNumber, itemSprite, normalizeSearchText, pokemonArtwork, prettyName } from '../lib/api'
import { defaultPokemonNameForSpecies } from '../lib/pokemon-species'
import type { ApiList, NamedResource } from '../types'

const LIMIT = 40
const MAX_OFFSET = 100_000
const MAX_QUERY_LENGTH = 64
export function ResourceListPage() {
  const { language, t } = useLanguage()
  const { resource = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const meta = getResourceMeta(resource, language)
  const ResourceIcon = meta?.icon ?? Database
  const GroupIcon = meta?.groupIcon
  const [searchParams, setSearchParams] = useSearchParams()
  const rawOffset = searchParams.get('offset') ?? ''
  const parsedOffset = Number(rawOffset || 0)
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 && parsedOffset <= MAX_OFFSET ? Math.floor(parsedOffset / LIMIT) * LIMIT : 0
  const rawQuery = searchParams.get('q') ?? ''
  const query = rawQuery.slice(0, MAX_QUERY_LENGTH)
  const firstRender = useRef(true)
  const { data, loading, error, retry } = useApi<ApiList<NamedResource | { url: string }>>(valid ? `${resource}?limit=${LIMIT}&offset=${offset}` : null)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    document.querySelector('.resource-list-hero')?.scrollIntoView?.({ block: 'start' })
  }, [offset])
  useEffect(() => {
    const normalizedOffset = offset > 0 ? String(offset) : ''
    if (rawOffset === normalizedOffset && rawQuery === query) return
    const next = new URLSearchParams(searchParams)
    if (normalizedOffset) next.set('offset', normalizedOffset); else next.delete('offset')
    if (query) next.set('q', query); else next.delete('q')
    setSearchParams(next, { replace: true })
  }, [offset, query, rawOffset, rawQuery, searchParams, setSearchParams])
  useEffect(() => {
    if (!data || offset === 0 || offset < data.count) return
    const lastOffset = data.count > 0 ? Math.floor((data.count - 1) / LIMIT) * LIMIT : 0
    const next = new URLSearchParams(searchParams)
    if (lastOffset > 0) next.set('offset', String(lastOffset)); else next.delete('offset')
    setSearchParams(next, { replace: true })
  }, [data, offset, searchParams, setSearchParams])
  const updateParams = (nextOffset: number, nextQuery = query) => {
    const next = new URLSearchParams()
    if (nextOffset > 0) next.set('offset', String(nextOffset))
    if (nextQuery) next.set('q', nextQuery)
    setSearchParams(next, { replace: true })
  }
  if (!valid) return <ErrorState title={t('resource.unknown')} message={t('resource.unknownDesc')} />
  if (loading) return <section className="page content-width resource-page" aria-busy="true" style={{ '--resource-color': meta?.groupColor ?? '#64748b' } as React.CSSProperties}><div className="breadcrumbs"><Link to="/explorar">{t('explore.breadcrumb')}</Link><span>/</span><span>{getResourceLabel(resource, language)}</span></div><div className="page-title resource-list-hero"><div className="resource-title-lockup"><span className="resource-page-icon"><ResourceIcon /></span><div><span className="eyebrow"><Database size={14} /> {t('resource.apiCollection')}</span><h1>{getResourceLabel(resource, language)}</h1><p>{t('resource.loading', { name: getResourceLabel(resource, language).toLowerCase() })}</p></div></div></div><div className="data-list resource-list-skeleton" aria-label={t('common.loadingShort')}>{Array.from({ length: 8 }, (_, index) => <div className="data-row-skeleton skeleton" key={index} />)}</div></section>
  if (error || !data) return <ErrorState message={t('resource.loadError')} retry={retry} />
  if (offset > 0 && offset >= data.count) return <Loading />
  const items = data.results.map((item) => {
    const id = item.url.split('/').filter(Boolean).at(-1) ?? ''
    return { ...item, name: 'name' in item && item.name ? item.name : id }
  })
  const filtered = items.filter((item) => normalizeSearchText(item.name).includes(normalizeSearchText(query)))
  const itemRoute = (name: string) => {
    if (resource === 'pokemon-species') return `/pokemon/${encodeURIComponent(defaultPokemonNameForSpecies(name))}`
    if (resource === 'pokemon') return `/pokemon/${encodeURIComponent(name)}`
    return `/explorar/${resource}/${encodeURIComponent(name)}`
  }
  const resourceName = (name: string) => {
    if (resource === 'type') return <TypeBadge type={name} />
    if (resource === 'gender') return <GenderBadge value={name} />
    if (resource === 'move') return <span className="named-resource move"><Swords size={15} />{prettyName(name)}</span>
    if (resource === 'ability') return <span className="named-resource ability"><Zap size={15} />{prettyName(name)}</span>
    return <b>{prettyName(name)}</b>
  }
  const pagination = (position: 'top' | 'bottom') => <nav className={`pagination pagination-${position}`} aria-label={`${t('resource.page', { page: Math.floor(offset / LIMIT) + 1 })} · ${t('resource.range', { start: offset + 1, end: Math.min(offset + LIMIT, data.count), total: data.count })}`}><button type="button" disabled={!data.previous} onClick={() => updateParams(Math.max(0, offset - LIMIT))}><ChevronLeft /> {t('resource.previous')}</button><span><b>{t('resource.page', { page: Math.floor(offset / LIMIT) + 1 })}</b><small>{t('resource.range', { start: offset + 1, end: Math.min(offset + LIMIT, data.count), total: data.count })}</small></span><button type="button" disabled={!data.next} onClick={() => updateParams(offset + LIMIT)}>{t('resource.next')} <ChevronRight /></button></nav>
  return (
    <section className="page content-width resource-page" style={{ '--resource-color': meta?.groupColor ?? '#64748b' } as React.CSSProperties}>
      <div className="breadcrumbs"><Link to="/explorar">{t('explore.breadcrumb')}</Link><span>/</span>{meta?.groupTitle && GroupIcon && <><span className="breadcrumb-group"><GroupIcon size={13} />{meta.groupTitle}</span><span>/</span></>}<span>{getResourceLabel(resource, language)}</span></div>
      <div className="page-title resource-list-hero"><div className="resource-title-lockup"><span className="resource-page-icon"><ResourceIcon /></span><div><span className="eyebrow"><Database size={14} /> {t('resource.apiCollection')}</span><h1>{getResourceLabel(resource, language)}</h1><p>{t('resource.available', { count: formatNumber(data.count, language) })}</p></div></div><div className="resource-page-search"><SearchField value={query} onChange={(value) => updateParams(offset, value)} clearLabel={t('common.clear')} compact aria-label={t('resource.filter')} placeholder={t('resource.filter')} /><small>{t('resource.filterScope')}</small></div></div>
      {data.count > LIMIT && pagination('top')}
      <div className="data-list">{filtered.map((item) => {
        const itemId = item.url.split('/').filter(Boolean).at(-1) ?? ''
        const numericId = /^\d+$/.test(itemId) ? Number(itemId) : 0
        const hasValidId = Number.isSafeInteger(numericId) && numericId > 0
        const sprite = resource === 'item'
          ? itemSprite(item.name)
          : resource === 'berry'
            ? berrySprite(item.name)
            : resource === 'pokemon' && hasValidId
              ? pokemonArtwork(numericId)
              : undefined
        return <Link to={itemRoute(item.name)} key={item.name}><span className="data-index">{hasValidId ? `#${itemId.padStart(3, '0')}` : '—'}</span><span className="data-resource-icon">{sprite ? <img className={resource === 'pokemon' ? 'pokemon-artwork' : undefined} src={sprite} alt="" width="30" height="30" loading="lazy" decoding="async" /> : <ResourceIcon size={17} />}</span>{resourceName(item.name)}<ChevronRight /></Link>
      })}</div>
      {!filtered.length && <div className="empty"><Search /><h2>{t('resource.emptyPage')}</h2></div>}
      {data.count > LIMIT && pagination('bottom')}
    </section>
  )
}
