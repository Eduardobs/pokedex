import { ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/FeedbackState'
import { PageHeader } from '../components/PageHeader'
import { SearchField } from '../components/SearchField'
import { DamageClassIconSet } from '../components/SemanticBadges'
import { useLanguage } from '../contexts/LanguageContext'
import { getResourceGroups } from '../data/resources'
import { useSearchParamUpdater } from '../hooks/useSearchParamUpdater'
import { normalizeSearchText } from '../lib/api'

export function ExplorePage() {
  const { searchParams, updateSearchParam } = useSearchParamUpdater()
  const query = searchParams.get('q') ?? ''
  const { language, t } = useLanguage()
  const resourceGroups = getResourceGroups(language)
  const normalized = normalizeSearchText(query)
  const groups = resourceGroups
    .map((group) => {
      const groupMatches = [group.title, group.description].some((value) =>
        normalizeSearchText(value).includes(normalized),
      )
      return {
        ...group,
        resources:
          groupMatches || !normalized
            ? group.resources
            : group.resources.filter(
                (resource) =>
                  normalizeSearchText(resource.label).includes(normalized) ||
                  normalizeSearchText(resource.endpoint).includes(normalized),
              ),
      }
    })
    .filter((group) => group.resources.length)
  return (
    <section className="page content-width">
      <PageHeader
        className="explore-title"
        eyebrow={t('explore.eyebrow')}
        title={t('explore.title')}
        description={t('explore.description')}
        aside={
          <SearchField
            value={query}
            onChange={(value) => updateSearchParam('q', value)}
            clearLabel={t('common.clear')}
            compact
            aria-label={t('explore.search')}
            placeholder={t('explore.search')}
          />
        }
      />
      <div className="resource-groups">
        {groups.map((group) => (
          <article
            className="resource-group"
            key={group.title}
            style={{ '--group-color': group.color } as React.CSSProperties}
          >
            <header>
              <span className="group-icon">
                <group.icon />
              </span>
              <div>
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <span className="resource-total">{group.resources.length}</span>
            </header>
            <div className="resource-links">
              {group.resources.map((resource) => {
                const ResourceIcon = resource.icon
                return (
                  <Link key={resource.endpoint} to={`/explorar/${resource.endpoint}`}>
                    <span className="resource-link-icon">
                      {resource.endpoint === 'move-damage-class' ? (
                        <DamageClassIconSet />
                      ) : (
                        <ResourceIcon size={17} />
                      )}
                    </span>
                    <span>{resource.label}</span>
                    <ArrowRight size={16} />
                  </Link>
                )
              })}
            </div>
          </article>
        ))}
      </div>
      {!groups.length && <EmptyState icon={<Search />} title={t('explore.empty')} />}
    </section>
  )
}
