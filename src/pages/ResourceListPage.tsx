import { ChevronLeft, ChevronRight, Database, Search, Swords, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { GenderBadge } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { allResources, getResourceLabel } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { formatNumber, prettyName } from '../lib/api'
import type { ApiList, NamedResource } from '../types'

const LIMIT = 40
export function ResourceListPage() {
  const { resource = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const { data, loading, error } = useApi<ApiList<NamedResource | { url: string }>>(valid ? `${resource}?limit=${LIMIT}&offset=${offset}` : null)
  if (!valid) return <ErrorState title="Coleção desconhecida" message="Este recurso não faz parte da PokéAPI v2." />
  if (loading) return <Loading label={`Carregando ${getResourceLabel(resource).toLowerCase()}...`} />
  if (error || !data) return <ErrorState message="Não conseguimos carregar esta coleção." />
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
    <section className="page content-width resource-page">
      <div className="breadcrumbs"><Link to="/explorar">Explorar</Link><span>/</span><span>{getResourceLabel(resource)}</span></div>
      <div className="page-title"><div><span className="eyebrow"><Database size={14} /> COLEÇÃO DA API</span><h1>{getResourceLabel(resource)}</h1><p>{formatNumber(data.count)} registros disponíveis neste recurso.</p></div><label className="search-field compact"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar nesta página..." /></label></div>
      <div className="data-list">{filtered.map((item, index) => <Link to={`/explorar/${resource}/${item.name}`} key={item.name}><span className="data-index">{String(offset + index + 1).padStart(3, '0')}</span>{resourceName(item.name)}<span className="data-slug">{item.name}</span><ChevronRight /></Link>)}</div>
      {!filtered.length && <div className="empty"><Search /><h2>Nenhum resultado nesta página</h2></div>}
      <nav className="pagination"><button disabled={!data.previous} onClick={() => setOffset(Math.max(0, offset - LIMIT))}><ChevronLeft /> Anterior</button><span>{offset + 1}–{Math.min(offset + LIMIT, data.count)} de <b>{data.count}</b></span><button disabled={!data.next} onClick={() => setOffset(offset + LIMIT)}>Próxima <ChevronRight /></button></nav>
    </section>
  )
}
