import { ChevronLeft, ChevronRight, Database, Search, Swords, Zap } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { GenderBadge } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { formatNumber, normalizeSearchText, prettyName } from '../lib/api'
import type { ApiList, NamedResource } from '../types'

const LIMIT = 40
export function ResourceListPage() {
  const { language, t } = useLanguage()
  const { resource = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const meta = getResourceMeta(resource, language)
  const ResourceIcon = meta?.icon ?? Database
  const GroupIcon = meta?.groupIcon
  const [searchParams, setSearchParams] = useSearchParams()
  const parsedOffset = Number(searchParams.get('offset') ?? 0)
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? Math.floor(parsedOffset / LIMIT) * LIMIT : 0
  const query = searchParams.get('q') ?? ''
  const firstRender = useRef(true)
  const { data, loading, error, retry } = useApi<ApiList<NamedResource | { url: string }>>(valid ? `${resource}?limit=${LIMIT}&offset=${offset}` : null)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    document.querySelector('.resource-list-hero')?.scrollIntoView({ block: 'start' })
  }, [offset])
  const updateParams = (nextOffset: number, nextQuery = query) => {
    const next = new URLSearchParams()
    if (nextOffset > 0) next.set('offset', String(nextOffset))
    if (nextQuery) next.set('q', nextQuery)
    setSearchParams(next, { replace: true })
  }
  if (!valid) return <ErrorState title={t('resource.unknown')} message={t('resource.unknownDesc')} />
  if (loading) return <section className="page content-width resource-page" aria-busy="true" style={{ '--resource-color': meta?.groupColor ?? '#64748b' } as React.CSSProperties}><div className="breadcrumbs"><Link to="/explorar">{t('explore.breadcrumb')}</Link><span>/</span><span>{getResourceLabel(resource, language)}</span></div><div className="page-title resource-list-hero"><div className="resource-title-lockup"><span className="resource-page-icon"><ResourceIcon /></span><div><span className="eyebrow"><Database size={14} /> {t('resource.apiCollection')}</span><h1>{getResourceLabel(resource, language)}</h1><p>{t('resource.loading', { name: getResourceLabel(resource, language).toLowerCase() })}</p></div></div></div><div className="data-list resource-list-skeleton" aria-label={t('common.loadingShort')}>{Array.from({ length: 8 }, (_, index) => <div className="data-row-skeleton skeleton" key={index} />)}</div></section>
  if (error || !data) return <ErrorState message={t('resource.loadError')} retry={retry} />
  const items = data.results.map((item) => {
    const id = item.url.split('/').filter(Boolean).at(-1) ?? ''
    return { ...item, name: 'name' in item && item.name ? item.name : id }
  })
  const filtered = items.filter((item) => normalizeSearchText(item.name).includes(normalizeSearchText(query)))
  const itemRoute = (name: string) => resource === 'pokemon' || resource === 'pokemon-species'
    ? `/pokemon/${encodeURIComponent(name)}`
    : `/explorar/${resource}/${encodeURIComponent(name)}`
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
      <div className="page-title resource-list-hero"><div className="resource-title-lockup"><span className="resource-page-icon"><ResourceIcon /></span><div><span className="eyebrow"><Database size={14} /> {t('resource.apiCollection')}</span><h1>{getResourceLabel(resource, language)}</h1><p>{t('resource.available', { count: formatNumber(data.count, language) })}</p></div></div><div className="resource-page-search"><div className="search-field compact"><Search size={19} /><input aria-label={t('resource.filter')} value={query} onChange={(event) => updateParams(offset, event.target.value)} placeholder={t('resource.filter')} />{query && <button className="search-clear" type="button" onClick={() => updateParams(offset, '')} aria-label={t('common.clear')}>×</button>}</div><small>{t('resource.filterScope')}</small></div></div>
      {data.count > LIMIT && pagination('top')}
      <div className="data-list">{filtered.map((item) => { const itemId = item.url.split('/').filter(Boolean).at(-1) ?? ''; return <Link to={itemRoute(item.name)} key={item.name}><span className="data-index">{/^\d+$/.test(itemId) ? `#${itemId.padStart(3, '0')}` : '—'}</span><span className="data-resource-icon"><ResourceIcon size={17} /></span>{resourceName(item.name)}<span className="data-slug">{item.name}</span><ChevronRight /></Link> })}</div>
      {!filtered.length && <div className="empty"><Search /><h2>{t('resource.emptyPage')}</h2></div>}
      {data.count > LIMIT && pagination('bottom')}
    </section>
  )
}
