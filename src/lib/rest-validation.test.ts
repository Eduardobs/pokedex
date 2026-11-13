import { describe, expect, it } from 'vitest'
import {
  evolutionFixture,
  evolutionNodeFixture,
  pokemonFixture,
  resource,
  speciesFixture,
} from '../test/pokemon-fixtures'
import {
  parseApiList,
  parseEvolutionChain,
  parsePokemon,
  parsePokemonForm,
  parsePokemonType,
  parseSpecies,
} from './rest-validation'
import { evolutionVarietyRoots } from './evolution-varieties'

describe('REST trust boundaries', () => {
  it('parses the Pokemon and species contracts and discards unknown fields', () => {
    expect(parsePokemon({ ...pokemonFixture, unexpected: 'discard' })).toEqual(pokemonFixture)
    expect(parseSpecies(speciesFixture)).toEqual(speciesFixture)
    expect(
      parsePokemonType({
        id: 13,
        name: 'electric',
        damage_relations: { double_damage_from: [], half_damage_from: [], no_damage_from: [] },
      }),
    ).toMatchObject({ pokemon: [], moves: [] })
    expect(
      parseApiList({ count: 1, results: [resource('pokemon', 'pikachu', 25)], next: null, previous: null }).results,
    ).toHaveLength(1)
    expect(
      parsePokemonForm({
        id: 25,
        name: 'pikachu',
        order: 1,
        form_order: 1,
        form_name: '',
        is_default: true,
        is_battle_only: false,
        is_mega: false,
        pokemon: resource('pokemon', 'pikachu', 25),
        types: pokemonFixture.types,
        sprites: { front_default: null, front_shiny: null, back_default: null, back_shiny: null },
        version_group: null,
        names: [],
        form_names: [],
      }).id,
    ).toBe(25)
  })
  it('rejects schema-invalid successes and unsafe API references', () => {
    for (const parser of [
      parsePokemon,
      parseSpecies,
      parseEvolutionChain,
      parsePokemonType,
      parsePokemonForm,
      parseApiList,
    ])
      for (const value of [null, {}, [], { name: 'pikachu' }]) expect(() => parser(value)).toThrow()
    expect(() =>
      parsePokemon({ ...pokemonFixture, species: { name: 'pikachu', url: 'https://evil.example/collect' } }),
    ).toThrow()
    expect(() => parsePokemon({ ...pokemonFixture, stats: [] })).toThrow()
    expect(() =>
      parseSpecies({
        ...speciesFixture,
        varieties: Array(101).fill({ is_default: true, pokemon: pokemonFixture.species }),
      }),
    ).toThrow()
  })
  it('removes remote media outside the exact Pokemon asset paths', () => {
    expect(
      parsePokemon({
        ...pokemonFixture,
        sprites: {
          front_default: 'https://raw.githubusercontent.com/attacker/pixel/main/tracker.svg',
          front_shiny: 'javascript:alert(1)',
        },
      }).sprites,
    ).toEqual({ front_default: null, front_shiny: null })
    const url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
    expect(
      parsePokemon({ ...pokemonFixture, sprites: { front_default: url, front_shiny: null } }).sprites.front_default,
    ).toBe(url)
    expect(
      parsePokemon({ ...pokemonFixture, sprites: { front_default: 'invalid', front_shiny: '' } }).sprites.front_default,
    ).toBeNull()
  })
  it('bounds evolution trees before schema recursion and expansion', () => {
    expect(parseEvolutionChain(evolutionFixture)).toEqual(evolutionFixture)
    expect(() =>
      parseEvolutionChain({
        ...evolutionFixture,
        chain: { ...evolutionNodeFixture, evolves_to: Array(1000).fill(evolutionNodeFixture) },
      }),
    ).toThrow()
    let chain = evolutionNodeFixture
    for (let i = 0; i < 9; i++) chain = { ...evolutionNodeFixture, evolves_to: [chain] }
    expect(() => parseEvolutionChain({ ...evolutionFixture, chain })).toThrow()
    const child = { ...evolutionNodeFixture, evolves_to: Array(10).fill(evolutionNodeFixture) }
    expect(() =>
      parseEvolutionChain({
        ...evolutionFixture,
        chain: { ...evolutionNodeFixture, evolves_to: Array(10).fill(child) },
      }),
    ).toThrow()
    const cyclic = { ...evolutionNodeFixture }
    cyclic.evolves_to = [cyclic]
    expect(() => parseEvolutionChain({ ...evolutionFixture, chain: cyclic })).toThrow()
    const wide = { ...evolutionNodeFixture, evolves_to: Array(300).fill(evolutionNodeFixture) }
    expect(() => evolutionVarietyRoots(wide)).toThrow()
  })
})

it('accepts partial historical stats without weakening the current six-stat contract', () => {
  const past_stats = [
    {
      generation: resource('generation', 'generation-i'),
      stats: [{ base_stat: 50, effort: 0, stat: resource('stat', 'special', 9) }],
    },
  ]
  expect(parsePokemon({ ...pokemonFixture, past_stats }).past_stats).toEqual(past_stats)
  expect(() => parsePokemon({ ...pokemonFixture, stats: past_stats[0].stats })).toThrow()
})
