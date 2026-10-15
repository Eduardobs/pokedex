import { describe, expect, it } from 'vitest'
import { parseBattleAbility, parseBattleItem, parseBattleMove } from './battle-data'

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

describe('battle resource parsing', () => {
  it('keeps the localized detail and safe item sprite used by active Pokémon tooltips', () => {
    expect(
      parseBattleAbility({
        name: 'run-away',
        names: [{ name: 'Fuga', language: ref('pt-br') }],
        effect_entries: [{ short_effect: 'Permite fugir.', language: ref('pt-br') }],
      }),
    ).toMatchObject({
      name: 'run-away',
      names: [{ name: 'Fuga', language: { name: 'pt-br' } }],
      descriptions: [{ effect: 'Permite fugir.', language: { name: 'pt-br' } }],
    })
    expect(
      parseBattleItem({
        name: 'leftovers',
        names: [],
        effect_entries: [],
        flavor_text_entries: [],
        sprites: { default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leftovers.png' },
      }).sprite,
    ).toContain('/leftovers.png')
  })

  it('rejects an unsafe item sprite URL', () => {
    expect(() =>
      parseBattleItem({
        name: 'leftovers',
        names: [],
        effect_entries: [],
        flavor_text_entries: [],
        sprites: { default: 'javascript:alert(1)' },
      }),
    ).toThrow()
  })
})
