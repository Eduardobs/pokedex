import type { TypeDamageRelations } from '../types'

export interface TypeWeakness {
  type: string
  multiplier: number
}

function calculateMultipliers(relations: TypeDamageRelations[]) {
  const multipliers = new Map<string, number>()

  const applyMultiplier = (types: TypeDamageRelations['double_damage_from'], multiplier: number) => {
    types.forEach(({ name }) => {
      multipliers.set(name, (multipliers.get(name) ?? 1) * multiplier)
    })
  }

  relations.forEach((relation) => {
    applyMultiplier(relation.double_damage_from, 2)
    applyMultiplier(relation.half_damage_from, 0.5)
    applyMultiplier(relation.no_damage_from, 0)
  })

  return multipliers
}

export function calculateWeaknesses(relations: TypeDamageRelations[]): TypeWeakness[] {
  const multipliers = calculateMultipliers(relations)

  return [...multipliers]
    .filter(([, multiplier]) => multiplier > 1)
    .map(([type, multiplier]) => ({ type, multiplier }))
    .sort((left, right) => right.multiplier - left.multiplier || left.type.localeCompare(right.type))
}

export function calculateImmunities(relations: TypeDamageRelations[]): TypeWeakness[] {
  const multipliers = calculateMultipliers(relations)

  return [...multipliers]
    .filter(([, multiplier]) => multiplier === 0)
    .map(([type, multiplier]) => ({ type, multiplier }))
    .sort((left, right) => left.type.localeCompare(right.type))
}
