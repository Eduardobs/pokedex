import { apiFetch, idFromUrl } from './api'
import { BATTLE_TYPES, type BattleType, type DamageMultiplier } from './type-chart'
import { array, invalidData, record, reference } from './resource-data'

type Relations = { no_damage_to: BattleType[]; half_damage_to: BattleType[]; double_damage_to: BattleType[] }
export type HistoricalType = {
  name: BattleType
  generation: number
  current: Relations
  past: { through: number; relations: Relations }[]
}
export function parseHistoricalType(value: unknown): HistoricalType {
  const data = record(value)
  const name = BATTLE_TYPES.find((type) => type === data.name)
  const generation = reference(data.generation)
  if (!name || !generation || !Number.isInteger(idFromUrl(generation.url))) return invalidData()
  function relations(value: unknown): Relations {
    const data = record(value)
    function names(key: string) {
      if (!Array.isArray(data[key]) || data[key].length > 30) return invalidData()
      return array(data[key]).map((entry) => {
        const type = BATTLE_TYPES.find((type) => type === record(entry).name)
        return type ?? invalidData()
      })
    }
    return {
      no_damage_to: names('no_damage_to'),
      half_damage_to: names('half_damage_to'),
      double_damage_to: names('double_damage_to'),
    }
  }
  return {
    name,
    generation: idFromUrl(generation.url),
    current: relations(data.damage_relations),
    past: array(data.past_damage_relations, 20)
      .map((entry) => {
        const past = record(entry)
        const generation = reference(past.generation)
        const through = generation ? idFromUrl(generation.url) : NaN
        if (!Number.isInteger(through) || through < 1 || through > 100) return invalidData()
        return { through, relations: relations(past.damage_relations) }
      })
      .sort((a, b) => a.through - b.through),
  }
}
export async function loadTypeHistory(signal: AbortSignal): Promise<HistoricalType[]> {
  // Four workers keep the fixed 18-type catalog bounded and cancellable.
  const results: HistoricalType[] = []
  const pending = [...BATTLE_TYPES]
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (pending.length && !signal.aborted) {
        const name = pending.shift()!
        const result = parseHistoricalType(await apiFetch<unknown>(`type/${name}`, signal))
        if (result.name !== name) return invalidData()
        results.push(result)
      }
    }),
  )
  return results
}
export function historicalMultiplier(
  types: HistoricalType[],
  generation: number,
  attack: BattleType,
  defense: BattleType,
): DamageMultiplier {
  const type = types.find((entry) => entry.name === attack)
  if (!type) return invalidData()
  const relation = type.past.find((entry) => entry.through >= generation)?.relations ?? type.current
  return relation.no_damage_to.includes(defense)
    ? 0
    : relation.half_damage_to.includes(defense)
      ? 0.5
      : relation.double_damage_to.includes(defense)
        ? 2
        : 1
}
