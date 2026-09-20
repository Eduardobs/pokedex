import { ArrowLeft, ExternalLink, Zap } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { ResourceValue } from '../components/ResourceValue'
import { DamageClassBadge, GenderBadge } from '../components/SemanticBadges'
import { TypeBadge } from '../components/TypeBadge'
import { allResources, getResourceLabel } from '../data/resources'
import { useApi } from '../hooks/useApi'
import { itemSprite, localizedText, prettyName } from '../lib/api'

const hidden = new Set(['id', 'name', 'names', 'flavor_text_entries', 'effect_entries', 'sprites'])
export function ResourceDetailPage() {
  const { resource = '', name = '' } = useParams()
  const valid = allResources.some((item) => item.endpoint === resource)
  const { data, loading, error } = useApi<Record<string, unknown>>(valid ? `${resource}/${name}` : null)
  if (loading) return <Loading />
  if (error || !data) return <ErrorState title="Registro não encontrado" message="Este conteúdo não existe ou está temporariamente indisponível." />
  const title = typeof data.name === 'string' ? data.name : `${getResourceLabel(resource)} #${data.id ?? name}`
  const description = localizedText(data.flavor_text_entries) || localizedText(data.effect_entries)
  const entries = Object.entries(data).filter(([key]) => !hidden.has(key))
  const moveType = resource === 'move' && data.type && typeof data.type === 'object' ? (data.type as { name?: string }).name : undefined
  const moveClass = resource === 'move' && data.damage_class && typeof data.damage_class === 'object' ? (data.damage_class as { name?: string }).name : undefined
  return (
    <section className="page content-width detail-resource-page">
      <div className="breadcrumbs"><Link to="/explorar">Explorar</Link><span>/</span><Link to={`/explorar/${resource}`}>{getResourceLabel(resource)}</Link><span>/</span><span>{prettyName(String(title))}</span></div>
      <header className="resource-detail-header">
        <Link to={`/explorar/${resource}`} className="icon-button"><ArrowLeft /></Link>
        {resource === 'item' && <img src={itemSprite(String(data.name))} alt="" />}
        <div><span className="eyebrow">{getResourceLabel(resource)} · #{String(data.id ?? '—').padStart(3, '0')}</span><h1>{prettyName(String(title))}</h1>{description && <p>{description}</p>}<div className="resource-semantic-badges">{resource === 'type' && <TypeBadge type={String(data.name)} />}{moveType && <TypeBadge type={moveType} />}{moveClass && <DamageClassBadge value={moveClass} />}{resource === 'gender' && <GenderBadge value={String(data.name)} />}{resource === 'ability' && <span className="resource-kind-badge"><Zap size={14} />Habilidade passiva</span>}</div></div>
        <a className="button secondary api-link" href={`https://pokeapi.co/api/v2/${resource}/${name}`} target="_blank" rel="noreferrer">JSON <ExternalLink size={16} /></a>
      </header>
      <div className="resource-detail-grid">{entries.map(([key, value]) => <article className="detail-field" key={key}><h2>{prettyName(key)}</h2><ResourceValue value={value} /></article>)}</div>
    </section>
  )
}
