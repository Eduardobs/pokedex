import type { Pokemon } from '../types'

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

export function groupMovesByLearningMethod(moves: Pokemon['moves']): MoveLearningGroup[] {
  const groups = new Map<string, MoveWithLearning[]>()

  moves.forEach(({ move, version_group_details }) => {
    const detail = version_group_details.at(-1)
    const method = detail?.move_learn_method.name ?? 'unknown'
    const groupedMove = { move, method, level: detail?.level_learned_at ?? 0 }
    groups.set(method, [...(groups.get(method) ?? []), groupedMove])
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
