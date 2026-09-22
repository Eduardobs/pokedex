import { describe, expect, it } from 'vitest'
import { captureRatePercentage, pokemonColorHex } from './pokemon-species'

describe('captureRatePercentage', () => {
  it('converts the PokéAPI capture scale to a percentage', () => {
    expect(captureRatePercentage(45)).toBeCloseTo(17.6470588)
    expect(captureRatePercentage(255)).toBe(100)
  })

  it('keeps values within the documented capture scale', () => {
    expect(captureRatePercentage(-1)).toBe(0)
    expect(captureRatePercentage(300)).toBe(100)
  })
})

describe('pokemonColorHex', () => {
  it('maps API color names to a safe visual color', () => {
    expect(pokemonColorHex('green')).toBe('#55a868')
    expect(pokemonColorHex('unknown')).toBe('#8b929a')
  })
})
