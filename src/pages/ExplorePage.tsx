import { ArrowRight, Search, Swords, Zap, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/FeedbackState'
import { PageHeader } from '../components/PageHeader'
import { SearchField } from '../components/SearchField'
import { DamageClassIconSet } from '../components/SemanticBadges'
import { useLanguage } from '../contexts/LanguageContext'
import { getResourceGroups } from '../data/resources'
import { useSearchParamUpdater } from '../hooks/useSearchParamUpdater'
import { normalizeSearchText, formatNumber } from '../lib/api'

export function ExplorePage() {
  const { searchParams, updateSearchParam } = useSearchParamUpdater()
  const query = searchParams.get('q') ?? ''
  const { language, t } = useLanguage()
  const resourceGroups = getResourceGroups(language)
  const normalized = normalizeSearchText(query)
  const selectedGroup = searchParams.get('group') ?? ''
  const activeGroup = resourceGroups.some((group) => group.resources[0]?.endpoint === selectedGroup)
    ? selectedGroup
    : ''
  const groups = resourceGroups
    .map((group) => {
      const groupMatches = [group.title, group.description].some((value) =>
        normalizeSearchText(value).includes(normalized),
      )
      return {
        ...group,
        id: group.resources[0]?.endpoint,
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
    .filter((group) => group.resources.length && (!activeGroup || group.id === activeGroup))
  return (
    <section className="page content-width explore-directory">
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
      <nav className="quick-tools" aria-label={t('ui.quickTools')}>
        <Link className="button secondary" to="/explore/move">
          <Swords size={18} aria-hidden="true" />
          {t('move.name')}
        </Link>
        <Link className="button secondary" to="/explore/ability">
          <Zap size={18} aria-hidden="true" />
          {t('ability.name')}
        </Link>
        <Link className="button secondary" to="/explore/item">
          <Package size={18} aria-hidden="true" />
          {t('ui.items')}
        </Link>
        <Link className="button secondary" to="/compare-moves">
          {t('tools.compare')}
        </Link>
      </nav>
      <div className="explore-directory-toolbar">
        <nav className="explore-group-filters" aria-label={t('resource.groupFilter')}>
          <button type="button" aria-pressed={!activeGroup} onClick={() => updateSearchParam('group', '')}>
            {t('resource.allGroups')}
          </button>
          {resourceGroups.map((group) => (
            <button
              type="button"
              key={group.title}
              aria-pressed={activeGroup === group.resources[0]?.endpoint}
              onClick={() => updateSearchParam('group', group.resources[0]?.endpoint ?? '')}
            >
              {group.title}
            </button>
          ))}
        </nav>
        <p role="status">
          {t('resource.directoryCount', {
            count: formatNumber(
              groups.reduce((total, group) => total + group.resources.length, 0),
              language,
            ),
            groups: formatNumber(groups.length, language),
          })}
        </p>
      </div>
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
                  <Link key={resource.endpoint} to={`/explore/${resource.endpoint}`}>
                    <span className="resource-link-icon">
                      {resource.endpoint === 'move-damage-class' ? <DamageClassIconSet /> : <ResourceIcon size={17} />}
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
      {!groups.length && (
        <EmptyState icon={<Search />} title={t('explore.empty')}>
          <button
            className="button secondary"
            onClick={() => {
              updateSearchParam('q', '')
            }}
          >
            {t('ui.clearSearch')}
          </button>
          {activeGroup && (
            <button className="button secondary" onClick={() => updateSearchParam('group', '')}>
              {t('resource.allGroups')}
            </button>
          )}
        </EmptyState>
      )}
    </section>
  )
}
