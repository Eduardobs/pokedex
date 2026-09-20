import { ArrowRight, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { getResourceGroups } from '../data/resources'
import { normalizeSearchText } from '../lib/api'

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const { language, t } = useLanguage()
  const resourceGroups = getResourceGroups(language)
  const normalized = normalizeSearchText(query)
  const groups = resourceGroups.map((group) => {
    const groupMatches = [group.title, group.description].some((value) => normalizeSearchText(value).includes(normalized))
    return {
      ...group,
      resources: groupMatches || !normalized
        ? group.resources
        : group.resources.filter((resource) => normalizeSearchText(resource.label).includes(normalized) || normalizeSearchText(resource.endpoint).includes(normalized)),
    }
  }).filter((group) => group.resources.length)
  const updateQuery = (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true })
  return (
    <section className="page content-width">
      <div className="page-title explore-title"><div><span className="eyebrow">{t('explore.eyebrow')}</span><h1>{t('explore.title')}</h1><p>{t('explore.description')}</p></div><div className="search-field compact"><Search size={19} /><input aria-label={t('explore.search')} value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t('explore.search')} />{query && <button className="search-clear" type="button" onClick={() => updateQuery('')} aria-label={t('common.clear')}>×</button>}</div></div>
      <div className="resource-groups">
        {groups.map((group) => <article className="resource-group" key={group.title} style={{ '--group-color': group.color } as React.CSSProperties}>
          <header><span className="group-icon"><group.icon /></span><div><h2>{group.title}</h2><p>{group.description}</p></div><span className="resource-total">{group.resources.length}</span></header>
          <div className="resource-links">{group.resources.map((resource) => {
            const ResourceIcon = resource.icon
            return <Link key={resource.endpoint} to={`/explorar/${resource.endpoint}`}><span className="resource-link-icon"><ResourceIcon size={17} /></span><span>{resource.label}</span><ArrowRight size={16} /></Link>
          })}</div>
        </article>)}
      </div>
      {!groups.length && <div className="empty"><Search /><h2>{t('explore.empty')}</h2></div>}
    </section>
  )
}
