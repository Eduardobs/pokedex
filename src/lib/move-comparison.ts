import { array, invalidData, record, reference } from './resource-data'

export function moveIdentifier(value: string) {
  const name = value.trim().toLowerCase().replace(/\s+/g, '-')
  return /^(?:[a-z][a-z0-9-]{0,99}|[1-9]\d{0,5})$/.test(name) ? name : null
}
export function parseComparisonMove(value: unknown) {
  const data = record(value)
  if (
    typeof data.name !== 'string' ||
    !moveIdentifier(data.name) ||
    !reference(data.type) ||
    !reference(data.damage_class)
  )
    return invalidData()
  for (const key of ['power', 'accuracy', 'pp', 'priority']) {
    const number = data[key]
    if (number !== null && (typeof number !== 'number' || !Number.isInteger(number) || number < -10 || number > 10000))
      return invalidData()
  }
  return data
}
export const comparisonFields = [
  'type',
  'damage_class',
  'power',
  'accuracy',
  'pp',
  'priority',
  'target',
  'effect_chance',
  'stat_changes',
] as const
export const moveMetaFields = [
  'ailment',
  'ailment_chance',
  'flinch_chance',
  'stat_chance',
  'crit_rate',
  'drain',
  'healing',
  'min_hits',
  'max_hits',
  'min_turns',
  'max_turns',
] as const
export function moveHistory(value: unknown) {
  return array(value, 100).flatMap((entry) => {
    const data = record(entry)
    const version = reference(data.version_group)
    if (!version) return []
    const changes = Object.fromEntries(
      Object.entries(data).filter(
        ([key, value]) =>
          key !== 'version_group' &&
          value !== null &&
          (comparisonFields.some((field) => field === key) || key === 'effect_entries'),
      ),
    )
    return [{ version, changes }]
  })
}
