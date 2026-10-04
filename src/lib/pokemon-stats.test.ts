import { describe, expect, it } from 'vitest'
import { level100StatRange } from './pokemon-stats'

describe('level 100 stats', () => {
  it('calculates the possible HP range', () => {
    expect(level100StatRange(45, 'hp', 'bulbasaur')).toEqual({ minimum: 200, maximum: 294 })
  })

  it('accounts for IVs, EVs, and natures in the remaining stats', () => {
    expect(level100StatRange(49, 'attack', 'bulbasaur')).toEqual({ minimum: 92, maximum: 216 })
    expect(level100StatRange(65, 'special-attack', 'bulbasaur')).toEqual({
      minimum: 121,
      maximum: 251,
    })
  })

  it('keeps Shedinja HP at 1', () => {
    expect(level100StatRange(1, 'hp', 'shedinja')).toEqual({ minimum: 1, maximum: 1 })
  })
})
