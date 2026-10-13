import type { Pokemon } from '../types'
import { idFromUrl } from './api'

export type MoveWithLearning = {
  move: Pokemon['moves'][number]['move']
  method: string
  level: number
}

export type MoveLearningGroup = {
  method: string
  moves: MoveWithLearning[]
}

const methodOrder = ['level-up', 'machine', 'egg', 'tutor']

export function moveVersionGroups(moves: Pokemon['moves']) {
  const versions = new Map(
    moves.flatMap(({ version_group_details }) =>
      version_group_details.map(({ version_group }) => [version_group.name, version_group] as const),
    ),
  )
  return [...versions.values()]
    .sort((a, b) => (idFromUrl(b.url) || 0) - (idFromUrl(a.url) || 0))
    .map(({ name }) => name)
}

export function groupMovesByLearningMethod(moves: Pokemon['moves'], version?: string): MoveLearningGroup[] {
  const groups = new Map<string, MoveWithLearning[]>()

  moves.forEach(({ move, version_group_details }) => {
    const details = version
      ? version_group_details.filter((detail) => detail.version_group.name === version)
      : version_group_details.slice(-1)
    for (const detail of details) {
      const method = detail.move_learn_method.name
      const level = detail.level_learned_at
      const existing = groups.get(method) ?? []
      if (!existing.some((entry) => entry.move.name === move.name && entry.level === level)) {
        groups.set(method, [...existing, { move, method, level }])
      }
    }
  })

  return Array.from(groups, ([method, groupedMoves]) => ({
    method,
    moves: groupedMoves.sort((left, right) => {
      if (method === 'level-up' && left.level !== right.level) return left.level - right.level
      return left.move.name.localeCompare(right.move.name)
    }),
  })).sort((left, right) => {
    const leftIndex = methodOrder.indexOf(left.method)
    const rightIndex = methodOrder.indexOf(right.method)
    const leftRank = leftIndex === -1 ? methodOrder.length : leftIndex
    const rightRank = rightIndex === -1 ? methodOrder.length : rightIndex
    return leftRank - rightRank || left.method.localeCompare(right.method)
  })
}
