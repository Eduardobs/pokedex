import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import type { ResourceListSort } from '../lib/resource-list-controls'
import { SearchField } from './SearchField'

export function ResourceListHeader({
  columns,
  filters,
  sort,
  onFilter,
  onSort,
}: {
  columns: { key: string; label: string }[]
  filters: Record<string, string>
  sort: ResourceListSort
  onFilter: (key: string, value: string) => void
  onSort: (sort: ResourceListSort) => void
}) {
  const { t } = useLanguage()
  return (
    <header className="resource-list-controls" aria-label={t('resource.columnControls')}>
      {columns.map(({ key, label }) => {
        const active = sort?.key === key
        const SortIcon = active ? (sort.direction === 'ascending' ? ArrowUp : ArrowDown) : ArrowUpDown
        return (
          <div className={`resource-list-column resource-list-column-${key}`} key={key}>
            <button
              type="button"
              className="resource-list-sort"
              aria-label={t('resource.sortColumn', { column: label })}
              aria-pressed={active}
              aria-description={active ? t(`pokedex.sort.${sort.direction}`) : undefined}
              onClick={() =>
                onSort(
                  active && sort.direction === 'descending'
                    ? null
                    : {
                        key,
                        direction: active ? 'descending' : 'ascending',
                      },
                )
              }
            >
              {label} <SortIcon size={14} aria-hidden="true" />
            </button>
            <SearchField
              compact
              iconSize={14}
              value={filters[key] ?? ''}
              onChange={(value) => onFilter(key, value)}
              clearLabel={t('common.clear')}
              aria-label={t('resource.filterColumn', { column: label })}
              placeholder={t('resource.filterPlaceholder')}
              maxLength={64}
            />
          </div>
        )
      })}
    </header>
  )
}
