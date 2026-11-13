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
  const versions = new Map<string, { name: string; url: string }>()
  for (const { version_group_details } of moves) {
    for (const { version_group } of version_group_details) {
      versions.set(version_group.name, version_group)
    }
  }
  return [...versions.values()]
    .map(({ name, url }) => ({ name, id: idFromUrl(url) || 0 }))
    .sort((a, b) => b.id - a.id)
    .map(({ name }) => name)
}

export function groupMovesByLearningMethod(moves: Pokemon['moves'], version?: string): MoveLearningGroup[] {
  const groups = new Map<string, MoveWithLearning[]>()
  const seen = new Map<string, Set<string>>()

  moves.forEach(({ move, version_group_details }) => {
    const details = version
      ? version_group_details.filter((detail) => detail.version_group.name === version)
      : version_group_details.slice(-1)
    for (const detail of details) {
      const method = detail.move_learn_method.name
      const level = detail.level_learned_at
      let existing = groups.get(method)
      if (!existing) {
        existing = []
        groups.set(method, existing)
        seen.set(method, new Set())
      }
      const key = `${move.name}:${level}`
      const methodSeen = seen.get(method)!
      if (!methodSeen.has(key)) {
        methodSeen.add(key)
        existing.push({ move, method, level })
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
