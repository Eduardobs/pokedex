import { ArrowRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resourceGroups } from '../data/resources'

export function ExplorePage() {
  const [query, setQuery] = useState('')
  const normalized = query.toLowerCase()
  const groups = resourceGroups.map((group) => ({ ...group, resources: group.resources.filter((resource) => resource.label.toLowerCase().includes(normalized) || resource.endpoint.includes(normalized)) })).filter((group) => group.resources.length)
  return (
    <section className="page content-width">
      <div className="page-title explore-title"><div><span className="eyebrow">ENCICLOPÉDIA</span><h1>Explore o universo Pokémon</h1><p>Todos os recursos públicos da PokéAPI, organizados para você.</p></div><label className="search-field compact"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar uma categoria..." /></label></div>
      <div className="resource-groups">
        {groups.map((group) => <article className="resource-group" key={group.title} style={{ '--group-color': group.color } as React.CSSProperties}>
          <header><span className="group-icon"><group.icon /></span><div><h2>{group.title}</h2><p>{group.description}</p></div><span className="resource-total">{group.resources.length}</span></header>
          <div className="resource-links">{group.resources.map((resource) => <Link key={resource.endpoint} to={`/explorar/${resource.endpoint}`}><span>{resource.label}</span><small>/{resource.endpoint}</small><ArrowRight size={16} /></Link>)}</div>
        </article>)}
      </div>
      {!groups.length && <div className="empty"><Search /><h2>Nenhuma categoria encontrada</h2></div>}
    </section>
  )
}
