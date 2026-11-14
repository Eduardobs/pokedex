import { normalizeSearchText } from './api'

export type ResourceListSort = { key: string; direction: 'ascending' | 'descending' } | null

export function filterAndSortResourceRows<T extends Record<string, unknown>>(
  rows: T[],
  filters: Record<string, string>,
  sort: ResourceListSort,
  locale: string,
) {
  const filtered = rows.filter((row) =>
    Object.entries(filters).every(([key, query]) =>
      normalizeSearchText(String(row[key] ?? '—')).includes(normalizeSearchText(query.trim())),
    ),
  )
  if (!sort) return filtered
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  return filtered.sort((left, right) => {
    const a = left[sort.key]
    const b = right[sort.key]
    if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
    const comparison = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b))
    return sort.direction === 'ascending' ? comparison : -comparison
  })
}
