import { ArrowRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { getResourceGroups } from '../data/resources'

export function ExplorePage() {
  const [query, setQuery] = useState('')
  const { language, t } = useLanguage()
  const resourceGroups = getResourceGroups(language)
  const normalized = query.toLowerCase()
  const groups = resourceGroups.map((group) => ({ ...group, resources: group.resources.filter((resource) => resource.label.toLowerCase().includes(normalized) || resource.endpoint.includes(normalized)) })).filter((group) => group.resources.length)
  return (
    <section className="page content-width">
      <div className="page-title explore-title"><div><span className="eyebrow">{t('explore.eyebrow')}</span><h1>{t('explore.title')}</h1><p>{t('explore.description')}</p></div><label className="search-field compact"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('explore.search')} /></label></div>
      <div className="resource-groups">
        {groups.map((group) => <article className="resource-group" key={group.title} style={{ '--group-color': group.color } as React.CSSProperties}>
          <header><span className="group-icon"><group.icon /></span><div><h2>{group.title}</h2><p>{group.description}</p></div><span className="resource-total">{group.resources.length}</span></header>
          <div className="resource-links">{group.resources.map((resource) => {
            const ResourceIcon = resource.icon
            return <Link key={resource.endpoint} to={`/explorar/${resource.endpoint}`}><span className="resource-link-icon"><ResourceIcon size={17} /></span><span>{resource.label}</span><small>/{resource.endpoint}</small><ArrowRight size={16} /></Link>
          })}</div>
        </article>)}
      </div>
      {!groups.length && <div className="empty"><Search /><h2>{t('explore.empty')}</h2></div>}
    </section>
  )
}
