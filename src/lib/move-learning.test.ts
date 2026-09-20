import { describe, expect, it } from 'vitest'
import type { Pokemon } from '../types'
import { groupMovesByLearningMethod } from './move-learning'

function pokemonMove(name: string, method: string, level = 0): Pokemon['moves'][number] {
  return {
    move: { name, url: `https://example.test/move/${name}` },
    version_group_details: [{
      level_learned_at: level,
      move_learn_method: { name: method, url: `https://example.test/method/${method}` },
      version_group: { name: 'latest', url: 'https://example.test/version/latest' },
    }],
  }
}

describe('groupMovesByLearningMethod', () => {
  it('groups methods in a useful order and sorts level-up moves by level', () => {
    const groups = groupMovesByLearningMethod([
      pokemonMove('thunder', 'machine'),
      pokemonMove('thunder-wave', 'level-up', 8),
      pokemonMove('tail-whip', 'level-up', 1),
      pokemonMove('fake-out', 'egg'),
      pokemonMove('covet', 'tutor'),
    ])

    expect(groups.map((group) => group.method)).toEqual(['level-up', 'machine', 'egg', 'tutor'])
    expect(groups[0].moves.map(({ move, level }) => [move.name, level])).toEqual([
      ['tail-whip', 1],
      ['thunder-wave', 8],
    ])
  })

  it('uses the most recent version detail when grouping a move', () => {
    const move = pokemonMove('thunderbolt', 'level-up', 20)
    move.version_group_details.push({
      level_learned_at: 0,
      move_learn_method: { name: 'machine', url: 'https://example.test/method/machine' },
      version_group: { name: 'newer', url: 'https://example.test/version/newer' },
    })

    expect(groupMovesByLearningMethod([move])).toMatchObject([
      { method: 'machine', moves: [{ method: 'machine', level: 0 }] },
    ])
  })
})
