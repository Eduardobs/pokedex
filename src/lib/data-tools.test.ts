import { describe, expect, it } from 'vitest'
import { experienceBetween, itemPrices, parseExperience, reference, array } from './resource-data'
import { formatEvolutionExpression } from './evolution-expression'
import { spriteGallery } from './sprite-gallery'
import { moveIdentifier, moveHistory, parseComparisonMove } from './move-comparison'
import { historicalMultiplier, parseHistoricalType } from './type-history'
import { groupMovesByLearningMethod, moveVersionGroups } from './move-learning'
import { localizedTextResult } from './api'
import type { Pokemon } from '../types'

const ref = (name: string, endpoint = 'version-group', id = 1) => ({
  name,
  url: `https://pokeapi.co/api/v2/${endpoint}/${id}/`,
})
const relations = (half: string[] = []) => ({
  no_damage_to: [],
  half_damage_to: half.map((name) => ({ name })),
  double_damage_to: [],
})

describe('resource tools', () => {
  it('validates bounded experience curves and calculates exact differences', () => {
    const levels = parseExperience({
      levels: [
        { level: 100, experience: 1000000 },
        { level: 1, experience: 0 },
        { level: 50, experience: 125000 },
      ],
    })
    expect(experienceBetween(levels, 50, 100)).toBe(875000)
    expect(experienceBetween(levels, 50, 50)).toBe(0)
    for (const [from, to] of [
      [0, 1],
      [50, 1],
      [1, 101],
      [1.5, 50],
      [2, 50],
      [1, 20],
    ])
      expect(experienceBetween(levels, from, to)).toBeNull()
    for (const levels of [
      [],
      [{ level: 101, experience: 1 }],
      [{ level: 1, experience: -1 }],
      [
        { level: 1, experience: 0 },
        { level: 1, experience: 0 },
      ],
      [
        { level: 1, experience: 100 },
        { level: 2, experience: 1 },
      ],
      Array(101).fill({ level: 1, experience: 0 }),
    ])
      expect(() => parseExperience({ levels })).toThrow()
  })
  it('preserves zero prices and unavailable prices while rejecting unsafe references', () => {
    const price = {
      currency: ref('poke-dollar', 'currency'),
      version_group: ref('red-blue'),
      purchase_price: 0,
      sell_price: null,
    }
    expect(itemPrices([price])).toMatchObject([{ purchase: 0, sell: null }])
    expect(
      itemPrices([
        { ...price, purchase_price: -1 },
        { ...price, currency: { name: 'bad', url: 'https://evil.test' } },
      ]),
    ).toEqual([])
    expect(reference({})).toBeNull()
    expect(array(null)).toEqual([])
  })
  it('reads item flavor text and preserves language fallback', () => {
    expect(
      localizedTextResult([{ text: 'A ball.\nCatch!', language: ref('en', 'language') }], undefined, 'pt-br'),
    ).toMatchObject({ text: 'A ball. Catch!', fallback: true })
  })
  it('renders bounded RPN without evaluating arbitrary code', () => {
    expect(formatEvolutionExpression('EC 100 % 0 ==')).toBe('((EC mod 100) = 0)')
    expect(formatEvolutionExpression('A 2 >= B 1 != &&')).toBe('((A ≥ 2) ∧ (B ≠ 1))')
    expect(formatEvolutionExpression('A !')).toBe('¬A')
    for (const input of ['', 'A B', '==', '!', 'alert(1)', 'A '.repeat(201)])
      expect(formatEvolutionExpression(input)).toBeNull()
  })
  it('collects historical, female, shiny and animated sprites and rejects external URLs', () => {
    const prefix = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
    const sprites = {
      front_default: `${prefix}25.png`,
      front_shiny: null,
      front_female: `${prefix}female/25.png`,
      versions: {
        'generation-v': {
          'black-white': {
            animated: { front_default: `${prefix}animated/25.gif` },
            front_shiny: `${prefix}shiny/25.png`,
          },
        },
      },
      other: {
        dream_world: {
          front_default: `${prefix}25.svg`,
          bad: 'https://evil.test/a.png',
          invalid: '???',
          query: `${prefix}25.png?x=1`,
        },
      },
    }
    const groups = spriteGallery(sprites)
    expect(groups[0].sprites).toHaveLength(2)
    expect(groups.find((group) => group.name.endsWith('animated'))?.sprites[0].animated).toBe(true)
    expect(groups.find((group) => group.name.includes('dream_world'))?.sprites).toHaveLength(1)
    expect(spriteGallery({ front_default: null, front_shiny: null })).toEqual([])
  })
  it('selects historical type relations through the inclusive generation boundary', () => {
    const type = parseHistoricalType({
      name: 'ghost',
      generation: ref('generation-i', 'generation'),
      damage_relations: relations(),
      past_damage_relations: [
        { generation: ref('generation-v', 'generation', 5), damage_relations: relations(['steel']) },
        {
          generation: ref('generation-i', 'generation', 1),
          damage_relations: {
            ...relations(),
            no_damage_to: [{ name: 'psychic' }],
            double_damage_to: [{ name: 'ghost' }],
          },
        },
      ],
    })
    expect(historicalMultiplier([type], 5, 'ghost', 'steel')).toBe(0.5)
    expect(historicalMultiplier([type], 6, 'ghost', 'steel')).toBe(1)
    expect(historicalMultiplier([type], 1, 'ghost', 'psychic')).toBe(0)
    expect(historicalMultiplier([type], 1, 'ghost', 'ghost')).toBe(2)
    expect(() => historicalMultiplier([], 1, 'ghost', 'ghost')).toThrow()
    expect(() => parseHistoricalType({})).toThrow()
    expect(() =>
      parseHistoricalType({ name: 'ghost', generation: ref('generation-i'), damage_relations: {} }),
    ).toThrow()
    expect(() =>
      parseHistoricalType({
        name: 'ghost',
        generation: ref('generation-i'),
        damage_relations: { ...relations(), no_damage_to: [{ name: 'invalid' }] },
      }),
    ).toThrow()
  })
  it('validates comparison identifiers, numeric fields and partial historical changes', () => {
    expect(moveIdentifier(' Thunder Shock ')).toBe('thunder-shock')
    expect(moveIdentifier('85')).toBe('85')
    expect(moveIdentifier('../pokemon')).toBeNull()
    const data = {
      name: 'thunder',
      type: ref('electric', 'type'),
      damage_class: ref('special', 'move-damage-class'),
      power: 110,
      accuracy: 70,
      pp: 10,
      priority: 0,
    }
    expect(parseComparisonMove(data)).toEqual(data)
    expect(() => parseComparisonMove({})).toThrow()
    expect(() => parseComparisonMove({ ...data, power: '110' })).toThrow()
    expect(moveHistory([{ version_group: ref('x-y'), power: 120, pp: null, unknown: 'bad' }, {}])).toMatchObject([
      { changes: { power: 120 } },
    ])
  })
  it('keeps every learning method for one game and excludes moves from other games', () => {
    const detail = (version: string, id: number, method: string, level: number) => ({
      version_group: ref(version, 'version-group', id),
      move_learn_method: ref(method, 'move-learn-method'),
      level_learned_at: level,
    })
    const moves: Pokemon['moves'] = [
      {
        move: ref('thunderbolt', 'move'),
        version_group_details: [
          detail('red-blue', 1, 'level-up', 20),
          detail('scarlet-violet', 25, 'machine', 0),
          detail('red-blue', 1, 'machine', 0),
          detail('red-blue', 1, 'machine', 0),
        ],
      },
      { move: ref('volt-tackle', 'move'), version_group_details: [detail('scarlet-violet', 25, 'egg', 0)] },
    ]
    expect(moveVersionGroups(moves)).toEqual(['scarlet-violet', 'red-blue'])
    expect(groupMovesByLearningMethod(moves, 'red-blue').map((group) => [group.method, group.moves.length])).toEqual([
      ['level-up', 1],
      ['machine', 1],
    ])
    expect(groupMovesByLearningMethod(moves, 'unavailable')).toEqual([])
  })
})
