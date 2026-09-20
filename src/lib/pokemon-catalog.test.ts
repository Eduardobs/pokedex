import { describe, expect, it } from 'vitest'
import { ApiError } from './api-client'
import { parsePokemonSortDetails } from './pokemon-catalog'

describe('catálogo de atributos da Pokédex', () => {
  const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
    .map((name, index) => ({ base_stat: 50 + index, stat: { name } }))

  it('mantém somente os campos necessários para ordenar', () => {
    expect(parsePokemonSortDetails({ data: { pokemon: [{
      name: 'pikachu',
      pokemonstats: stats,
      ignored: 'value',
    }] } })).toEqual({
      pikachu: { stats: stats.map(({ base_stat, stat }) => ({ base_stat, effort: 0, stat: { ...stat, url: '' } })) },
    })
  })

  it('rejeita nomes e atributos inesperados', () => {
    expect(() => parsePokemonSortDetails({ data: { pokemon: [{ name: '__proto__', pokemonstats: stats }] } })).toThrow(ApiError)
    expect(() => parsePokemonSortDetails({ data: { pokemon: [{ name: 'pikachu', pokemonstats: stats.map((stat, index) => index ? stat : { ...stat, base_stat: -1 }) }] } })).toThrow(ApiError)
    expect(() => parsePokemonSortDetails({ errors: [{ message: 'partial response' }], data: { pokemon: [{ name: 'pikachu', pokemonstats: stats }] } })).toThrow(ApiError)
  })
})
