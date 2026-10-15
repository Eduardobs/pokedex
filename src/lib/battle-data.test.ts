import { describe, expect, it } from 'vitest'
import { parseBattleMove } from './battle-data'

const ref = (name: string) => ({ name, url: `https://pokeapi.co/api/v2/${name}/1/` })

describe('battle move parsing', () => {
  it('normalizes the bounded move fields used by the engine', () => {
    expect(
      parseBattleMove({
        name: 'flamethrower',
        type: ref('fire'),
        damage_class: ref('special'),
        power: 90,
        accuracy: 100,
        priority: 0,
        pp: 15,
        target: ref('selected-pokemon'),
        effect_chance: 10,
        stat_changes: [],
        meta: { healing: 0, drain: 0, ailment: ref('burn'), ailment_chance: 10 },
        flavor_text_entries: [
          { flavor_text: 'Has a chance to burn.\n', language: ref('en') },
          { flavor_text: 'Pode queimar.\f', language: ref('pt-br') },
        ],
      }),
    ).toMatchObject({
      name: 'flamethrower',
      type: 'fire',
      damageClass: 'special',
      power: 90,
      ailment: 'burn',
      ailmentChance: 10,
      descriptions: [
        { language: 'en', text: 'Has a chance to burn.' },
        { language: 'pt-br', text: 'Pode queimar.' },
      ],
    })
  })

  it('rejects unsupported types and malformed move identifiers', () => {
    expect(() => parseBattleMove({ name: '../move', type: ref('fire'), damage_class: ref('physical') })).toThrow()
    expect(() => parseBattleMove({ name: 'tackle', type: ref('unknown'), damage_class: ref('physical') })).toThrow()
  })
})
