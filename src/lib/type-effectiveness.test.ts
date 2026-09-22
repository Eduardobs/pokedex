import { describe, expect, it } from 'vitest'
import type { NamedResource, TypeDamageRelations } from '../types'
import {
  calculateImmunities,
  calculateResistances,
  calculateWeaknesses,
} from './type-effectiveness'

const resources = (...names: string[]): NamedResource[] =>
  names.map((name) => ({
    name,
    url: `https://example.test/type/${name}`,
  }))

function relations({
  double = [],
  half = [],
  none = [],
}: {
  double?: string[]
  half?: string[]
  none?: string[]
}): TypeDamageRelations {
  return {
    double_damage_from: resources(...double),
    half_damage_from: resources(...half),
    no_damage_from: resources(...none),
  }
}

describe('calculateWeaknesses', () => {
  it('returns the weaknesses of a single type', () => {
    expect(
      calculateWeaknesses([
        relations({ double: ['water', 'ground', 'rock'], half: ['fire', 'grass'] }),
      ]),
    ).toEqual([
      { type: 'ground', multiplier: 2 },
      { type: 'rock', multiplier: 2 },
      { type: 'water', multiplier: 2 },
    ])
  })

  it('combines both defensive types and highlights quadruple damage', () => {
    const fire = relations({
      double: ['water', 'ground', 'rock'],
      half: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
    })
    const flying = relations({
      double: ['electric', 'ice', 'rock'],
      half: ['grass', 'fighting', 'bug'],
      none: ['ground'],
    })

    expect(calculateWeaknesses([fire, flying])).toEqual([
      { type: 'rock', multiplier: 4 },
      { type: 'electric', multiplier: 2 },
      { type: 'water', multiplier: 2 },
    ])
  })

  it('removes weaknesses neutralized by resistance or immunity', () => {
    const dark = relations({
      double: ['fighting', 'bug', 'fairy'],
      half: ['ghost', 'dark'],
      none: ['psychic'],
    })
    const ghost = relations({
      double: ['ghost', 'dark'],
      half: ['poison', 'bug'],
      none: ['normal', 'fighting'],
    })

    expect(calculateWeaknesses([dark, ghost])).toEqual([{ type: 'fairy', multiplier: 2 }])
  })

  it('returns type immunities with a zero multiplier', () => {
    const steel = relations({
      double: ['fire', 'fighting', 'ground'],
      half: ['normal', 'grass'],
      none: ['poison'],
    })

    expect(calculateImmunities([steel])).toEqual([{ type: 'poison', multiplier: 0 }])
  })

  it('keeps an immunity when the second type would otherwise be weak', () => {
    const flying = relations({ double: ['electric', 'ice', 'rock'], none: ['ground'] })
    const fire = relations({ double: ['water', 'ground', 'rock'], half: ['fire', 'grass'] })

    expect(calculateImmunities([flying, fire])).toEqual([{ type: 'ground', multiplier: 0 }])
  })

  it('returns half-damage resistances without including immunities', () => {
    const steel = relations({ half: ['normal', 'grass'], none: ['poison'] })

    expect(calculateResistances([steel])).toEqual([
      { type: 'grass', multiplier: 0.5 },
      { type: 'normal', multiplier: 0.5 },
    ])
  })

  it('combines two resistances into quarter damage', () => {
    const fire = relations({ half: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'] })
    const flying = relations({ half: ['grass', 'fighting', 'bug'] })

    expect(calculateResistances([fire, flying])).toEqual([
      { type: 'bug', multiplier: 0.25 },
      { type: 'grass', multiplier: 0.25 },
      { type: 'fairy', multiplier: 0.5 },
      { type: 'fighting', multiplier: 0.5 },
      { type: 'fire', multiplier: 0.5 },
      { type: 'ice', multiplier: 0.5 },
      { type: 'steel', multiplier: 0.5 },
    ])
  })
})
