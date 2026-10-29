export type ResourceEntry = [string, unknown]

export function isResourceReference(value: unknown): value is { name: string; url: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'name' in value &&
    'url' in value &&
    typeof value.name === 'string' &&
    typeof value.url === 'string'
  )
}

export function resourceRecordColumns(values: unknown[]): string[] | null {
  if (values.length < 2) return null
  const columns: string[] = []
  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || isResourceReference(value)) return null
    const entries = Object.entries(value)
    if (!entries.length) return null
    for (const [key, child] of entries) {
      if (child !== null && typeof child === 'object' && !isResourceReference(child)) return null
      if (!columns.includes(key)) columns.push(key)
      if (columns.length > 6) return null
    }
  }
  return columns
}

const hidden = new Set(['id', 'name', 'names', 'flavor_text_entries', 'effect_entries', 'sprites'])
const historical = new Set(['game_indices', 'past_values', 'past_types', 'past_damage_relations', 'effect_changes'])
const preferred: Record<string, string[]> = {
  move: ['type', 'damage_class', 'power', 'accuracy', 'pp', 'priority', 'target'],
  ability: ['generation', 'is_main_series'],
  item: ['category', 'attributes', 'fling_power', 'fling_effect'],
  berry: ['size', 'growth_time', 'max_harvest', 'natural_gift_power', 'natural_gift_type'],
  type: ['generation', 'move_damage_class'],
  region: ['main_generation'],
}

export function groupResourceEntries(resource: string, data: Record<string, unknown>) {
  const groups: Record<'summary' | 'details' | 'collections' | 'technical', ResourceEntry[]> = {
    summary: [],
    details: [],
    collections: [],
    technical: [],
  }
  for (const entry of Object.entries(data)) {
    const [key, value] = entry
    if (hidden.has(key)) continue
    if (
      (resource === 'item' && key === 'prices') ||
      (resource === 'growth-rate' && key === 'levels') ||
      (resource === 'pokemon-form' && key === 'trigger_conditions')
    )
      continue
    if (historical.has(key)) groups.technical.push(entry)
    else if (Array.isArray(value)) groups.collections.push(entry)
    else if (
      preferred[resource]?.includes(key) ||
      (!preferred[resource] && (value === null || typeof value !== 'object' || isResourceReference(value)))
    )
      groups.summary.push(entry)
    else groups.details.push(entry)
  }
  const keys = preferred[resource]
  if (keys) groups.summary.sort(([left], [right]) => keys.indexOf(left) - keys.indexOf(right))
  return groups
}
