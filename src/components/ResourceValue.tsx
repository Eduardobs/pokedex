import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, prettyName, resolveApiUrl } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

const excluded = new Set(['sprites', 'game_indices', 'version_group_details', 'past_values', 'past_types'])
const PAGE_SIZE = 6

function routeFromUrl(url: string) {
  try {
    const trustedUrl = resolveApiUrl(url)
    const [endpoint, name] = new URL(trustedUrl).pathname.slice(`${new URL(API_BASE).pathname}/`.length).split('/').filter(Boolean)
    return endpoint && name ? `/explorar/${encodeURIComponent(endpoint)}/${encodeURIComponent(name)}` : null
  } catch {
    return null
  }
}

function referenceMeta(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const { name, url } = value as Record<string, unknown>
  if (typeof name !== 'string' || typeof url !== 'string') return null
  try {
    const trustedUrl = resolveApiUrl(url)
    const [endpoint, identifier] = new URL(trustedUrl).pathname.slice(`${new URL(API_BASE).pathname}/`.length).split('/').filter(Boolean)
    if (!endpoint || !identifier) return null
    return { endpoint: prettyName(endpoint), identifier: /^\d+$/.test(identifier) ? `#${identifier.padStart(3, '0')}` : prettyName(identifier) }
  } catch {
    return null
  }
}

function PaginatedResourceValues({ values, depth }: { values: unknown[]; depth: number }) {
  const { t } = useLanguage()
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(values.length / PAGE_SIZE)
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, values.length)

  return (
    <div className="resource-value-pages">
      <div className="resource-value-list">
        {values.slice(start, end).map((item, index) => {
          const reference = referenceMeta(item)
          return (
            <div className="resource-value-item" key={start + index}>
              <span className="resource-value-index">{String(start + index + 1).padStart(2, '0')}</span>
              <div>
                <ResourceValue value={item} depth={depth + 1} />
                {reference && <small className="resource-value-meta">{reference.endpoint} · {reference.identifier}</small>}
              </div>
            </div>
          )
        })}
      </div>
      <nav className="resource-value-pagination" aria-label={t('resource.range', { start: start + 1, end, total: values.length })}>
        <button type="button" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} aria-label={t('resource.previous')}><ChevronLeft /></button>
        <span>{t('resource.range', { start: start + 1, end, total: values.length })}</span>
        <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} aria-label={t('resource.next')}><ChevronRight /></button>
      </nav>
    </div>
  )
}

export function ResourceValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const { t } = useLanguage()
  if (value === null || value === undefined) return <span className="muted">—</span>
  if (typeof value === 'boolean') return <span className={`boolean ${value}`}>{value ? t('common.yes') : t('common.no')}</span>
  if (typeof value === 'string' || typeof value === 'number') return <span>{typeof value === 'string' ? prettyName(value) : value}</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span className="muted">{t('resource.none')}</span>
    if (depth > 1 || value.length > 20) return <PaginatedResourceValues values={value} depth={depth} />
    return <div className="value-list">{value.slice(0, 20).map((item, index) => <ResourceValue key={index} value={item} depth={depth + 1} />)}</div>
  }
  const object = value as Record<string, unknown>
  if (typeof object.name === 'string' && typeof object.url === 'string') {
    const route = routeFromUrl(object.url)
    return route ? <Link className="resource-chip" to={route}>{prettyName(object.name)} <ExternalLink size={12} /></Link> : <span>{prettyName(object.name)}</span>
  }
  if (depth > 3) return <span className="muted">{t('resource.related')}</span>
  return (
    <div className="nested-value">
      {Object.entries(object).filter(([key]) => !excluded.has(key)).slice(0, 16).map(([key, child]) => (
        <div className="nested-row" key={key}><small>{prettyName(key)}</small><ResourceValue value={child} depth={depth + 1} /></div>
      ))}
    </div>
  )
}
