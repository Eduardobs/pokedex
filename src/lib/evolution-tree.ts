import type { EvolutionNode } from '../types'

export function evolutionFamilyStats(node: EvolutionNode): {
  pokemon: number
  stages: number
  outcomes: number
  branching: boolean
} {
  const children = node.evolves_to.map(evolutionFamilyStats)
  return {
    pokemon: 1 + children.reduce((total, child) => total + child.pokemon, 0),
    stages: 1 + Math.max(0, ...children.map((child) => child.stages)),
    outcomes: children.length ? children.reduce((total, child) => total + (child.outcomes || 1), 0) : 0,
    branching: children.length > 1 || children.some((child) => child.branching),
  }
}
