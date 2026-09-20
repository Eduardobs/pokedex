import { ChevronLeft, ChevronRight, Database, Search, Swords, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { GenderBadge } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { allResources, getResourceLabel, getResourceMeta } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { formatNumber, prettyName } from '../lib/api'
import type { ApiList, NamedResource } from '../types'

const LIMIT = 40
export function ResourceListPage() {
  const { language, t } = useLanguage()
  const { resource = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const meta = getResourceMeta(resource, language)
  const ResourceIcon = meta?.icon ?? Database
  const GroupIcon = meta?.groupIcon
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const { data, loading, error } = useApi<ApiList<NamedResource | { url: string }>>(valid ? `${resource}?limit=${LIMIT}&offset=${offset}` : null)
  if (!valid) return <ErrorState title={t('resource.unknown')} message={t('resource.unknownDesc')} />
  if (loading) return <Loading label={t('resource.loading', { name: getResourceLabel(resource, language).toLowerCase() })} />
  if (error || !data) return <ErrorState message={t('resource.loadError')} />
  const items = data.results.map((item) => {
    const id = item.url.split('/').filter(Boolean).at(-1) ?? ''
    return { ...item, name: 'name' in item && item.name ? item.name : id }
  })
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
  const resourceName = (name: string) => {
    if (resource === 'type') return <TypeBadge type={name} />
    if (resource === 'gender') return <GenderBadge value={name} />
    if (resource === 'move') return <span className="named-resource move"><Swords size={15} />{prettyName(name)}</span>
    if (resource === 'ability') return <span className="named-resource ability"><Zap size={15} />{prettyName(name)}</span>
    return <b>{prettyName(name)}</b>
  }
  return (
    <section className="page content-width resource-page" style={{ '--resource-color': meta?.groupColor ?? '#64748b' } as React.CSSProperties}>
      <div className="breadcrumbs"><Link to="/explorar">{t('explore.breadcrumb')}</Link><span>/</span>{meta?.groupTitle && GroupIcon && <><span className="breadcrumb-group"><GroupIcon size={13} />{meta.groupTitle}</span><span>/</span></>}<span>{getResourceLabel(resource, language)}</span></div>
      <div className="page-title resource-list-hero"><div className="resource-title-lockup"><span className="resource-page-icon"><ResourceIcon /></span><div><span className="eyebrow"><Database size={14} /> {t('resource.apiCollection')}</span><h1>{getResourceLabel(resource, language)}</h1><p>{t('resource.available', { count: formatNumber(data.count, language) })}</p></div></div><label className="search-field compact"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('resource.filter')} /></label></div>
      <div className="data-list">{filtered.map((item, index) => <Link to={`/explorar/${resource}/${item.name}`} key={item.name}><span className="data-index">{String(offset + index + 1).padStart(3, '0')}</span><span className="data-resource-icon"><ResourceIcon size={17} /></span>{resourceName(item.name)}<span className="data-slug">{item.name}</span><ChevronRight /></Link>)}</div>
      {!filtered.length && <div className="empty"><Search /><h2>{t('resource.emptyPage')}</h2></div>}
      <nav className="pagination"><button disabled={!data.previous} onClick={() => setOffset(Math.max(0, offset - LIMIT))}><ChevronLeft /> {t('resource.previous')}</button><span>{t('resource.range', { start: offset + 1, end: Math.min(offset + LIMIT, data.count), total: data.count })}</span><button disabled={!data.next} onClick={() => setOffset(offset + LIMIT)}>{t('resource.next')} <ChevronRight /></button></nav>
    </section>
  )
}
