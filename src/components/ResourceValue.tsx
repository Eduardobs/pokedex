import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE, prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

const excluded = new Set(['sprites', 'game_indices', 'version_group_details', 'past_values', 'past_types'])

function routeFromUrl(url: string) {
  if (!url.startsWith(API_BASE)) return null
  const [endpoint, name] = url.slice(API_BASE.length + 1).split('/').filter(Boolean)
  return endpoint && name ? `/explorar/${endpoint}/${name}` : null
}

export function ResourceValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const { t } = useLanguage()
  if (value === null || value === undefined) return <span className="muted">—</span>
  if (typeof value === 'boolean') return <span className={`boolean ${value}`}>{value ? t('common.yes') : t('common.no')}</span>
  if (typeof value === 'string' || typeof value === 'number') return <span>{typeof value === 'string' ? prettyName(value) : value}</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span className="muted">{t('resource.none')}</span>
    if (depth > 1 || value.length > 20) return <span>{t('resource.records', { count: value.length })}</span>
    return <div className="value-list">{value.slice(0, 20).map((item, index) => <ResourceValue key={index} value={item} depth={depth + 1} />)}</div>
  }
  const object = value as Record<string, unknown>
  if (typeof object.name === 'string' && typeof object.url === 'string') {
    const route = routeFromUrl(object.url)
    return route ? <Link className="resource-chip" to={route}>{prettyName(object.name)} <ExternalLink size={12} /></Link> : <span>{prettyName(object.name)}</span>
  }
  if (depth > 2) return <span className="muted">{t('resource.related')}</span>
  return (
    <div className="nested-value">
      {Object.entries(object).filter(([key]) => !excluded.has(key)).slice(0, 16).map(([key, child]) => (
        <div className="nested-row" key={key}><small>{prettyName(key)}</small><ResourceValue value={child} depth={depth + 1} /></div>
      ))}
    </div>
  )
}
