import { describe, expect, it } from 'vitest'
import { BATTLE_TYPES, getDamageMultiplier } from './type-chart'

describe('getDamageMultiplier', () => {
  it('returns super-effective, resisted and immune matchups', () => {
    expect(getDamageMultiplier('water', 'fire')).toBe(2)
    expect(getDamageMultiplier('fire', 'water')).toBe(0.5)
    expect(getDamageMultiplier('electric', 'ground')).toBe(0)
  })

  it('returns neutral damage for an unspecified matchup', () => {
    expect(getDamageMultiplier('normal', 'water')).toBe(1)
  })

  it('contains the 18 standard battle types', () => {
    expect(BATTLE_TYPES).toHaveLength(18)
    expect(new Set(BATTLE_TYPES).size).toBe(18)
  })
})
