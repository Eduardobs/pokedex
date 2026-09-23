import { describe, expect, it } from 'vitest'
import {
  captureRatePercentage,
  defaultPokemonNameForSpecies,
  pokemonVariantForSpeciesGender,
  pokemonColorHex,
} from './pokemon-species'

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

describe('defaultPokemonNameForSpecies', () => {
  it.each([
    ['deoxys', 'deoxys-normal'],
    ['wormadam', 'wormadam-plant'],
    ['giratina', 'giratina-altered'],
    ['shaymin', 'shaymin-land'],
    ['basculin', 'basculin-red-striped'],
    ['darmanitan', 'darmanitan-standard'],
    ['frillish', 'frillish-male'],
    ['jellicent', 'jellicent-male'],
    ['tornadus', 'tornadus-incarnate'],
    ['thundurus', 'thundurus-incarnate'],
    ['landorus', 'landorus-incarnate'],
    ['keldeo', 'keldeo-ordinary'],
    ['meloetta', 'meloetta-aria'],
    ['pyroar', 'pyroar-male'],
    ['meowstic', 'meowstic-male'],
    ['aegislash', 'aegislash-shield'],
    ['pumpkaboo', 'pumpkaboo-average'],
    ['gourgeist', 'gourgeist-average'],
    ['zygarde', 'zygarde-50'],
    ['oricorio', 'oricorio-baile'],
    ['lycanroc', 'lycanroc-midday'],
    ['wishiwashi', 'wishiwashi-solo'],
    ['minior', 'minior-red-meteor'],
    ['mimikyu', 'mimikyu-disguised'],
    ['toxtricity', 'toxtricity-amped'],
    ['eiscue', 'eiscue-ice'],
    ['indeedee', 'indeedee-male'],
    ['morpeko', 'morpeko-full-belly'],
    ['urshifu', 'urshifu-single-strike'],
    ['basculegion', 'basculegion-male'],
    ['enamorus', 'enamorus-incarnate'],
    ['oinkologne', 'oinkologne-male'],
    ['maushold', 'maushold-family-of-four'],
    ['squawkabilly', 'squawkabilly-green-plumage'],
    ['palafin', 'palafin-zero'],
    ['tatsugiri', 'tatsugiri-curly'],
    ['dudunsparce', 'dudunsparce-two-segment'],
  ])('maps %s to the canonical default variety %s', (species, pokemon) => {
    expect(defaultPokemonNameForSpecies(species)).toBe(pokemon)
  })

  it('keeps the species name when the default variety uses the same name', () => {
    expect(defaultPokemonNameForSpecies('pikachu')).toBe('pikachu')
  })
})

describe('pokemonVariantForSpeciesGender', () => {
  it.each([
    ['meowstic', 678, 'meowstic-female', 10025],
    ['basculegion', 902, 'basculegion-female', 10248],
    ['oinkologne', 916, 'oinkologne-female', 10254],
  ])('selects the female %s variety and artwork', (species, id, name, artworkId) => {
    expect(pokemonVariantForSpeciesGender(species, id, 'female')).toEqual({ name, artworkId })
  })

  it('preserves the default male variety', () => {
    expect(pokemonVariantForSpeciesGender('meowstic', 678, 'male')).toEqual({
      name: 'meowstic-male',
      artworkId: 678,
    })
  })

  it('uses the normal species presentation when there is no gender-specific variety', () => {
    expect(pokemonVariantForSpeciesGender('vespiquen', 416, 'female')).toEqual({
      name: 'vespiquen',
      artworkId: 416,
    })
  })
})
