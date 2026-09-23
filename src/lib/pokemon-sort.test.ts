import { describe, expect, it } from 'vitest'
import type { Pokemon, PokemonListItem } from '../types'
import { filterPokemonList, getPokemonSortValue, sortPokemonList } from './pokemon-sort'

const list: PokemonListItem[] = [
  { id: 6, name: 'charizard', url: 'pokemon/6' },
  { id: 1, name: 'bulbasaur', url: 'pokemon/1' },
  { id: 9, name: 'blastoise', url: 'pokemon/9' },
]

const pokemon = (id: number, name: string, stats: Record<string, number>) =>
  ({
    id,
    name,
    stats: Object.entries(stats).map(([statName, base_stat]) => ({
      base_stat,
      effort: 0,
      stat: { name: statName, url: '' },
    })),
  }) as Pokemon

const details = {
  charizard: pokemon(6, 'charizard', {
    hp: 78,
    attack: 84,
    defense: 78,
    'special-attack': 109,
    'special-defense': 85,
    speed: 100,
  }),
  bulbasaur: pokemon(1, 'bulbasaur', {
    hp: 45,
    attack: 49,
    defense: 49,
    'special-attack': 65,
    'special-defense': 65,
    speed: 45,
  }),
  blastoise: pokemon(9, 'blastoise', {
    hp: 79,
    attack: 83,
    defense: 100,
    'special-attack': 85,
    'special-defense': 105,
    speed: 78,
  }),
}

describe('ordenação da Pokédex', () => {
  it('filtra por nome parcial ou número no catálogo recebido', () => {
    expect(filterPokemonList(list, 'saur').map(({ name }) => name)).toEqual(['bulbasaur'])
    expect(filterPokemonList(list, ' 9 ').map(({ name }) => name)).toEqual(['blastoise'])
  })

  it('ordena por número e por nome nas duas direções', () => {
    expect(sortPokemonList(list, 'number', 'asc', details, 'pt-BR').map(({ id }) => id)).toEqual([1, 6, 9])
    expect(sortPokemonList(list, 'number', 'desc', details, 'pt-BR').map(({ id }) => id)).toEqual([9, 6, 1])
    expect(sortPokemonList(list, 'name', 'asc', details, 'pt-BR').map(({ name }) => name)).toEqual([
      'blastoise',
      'bulbasaur',
      'charizard',
    ])
    expect(sortPokemonList(list, 'name', 'desc', details, 'pt-BR').map(({ name }) => name)).toEqual([
      'charizard',
      'bulbasaur',
      'blastoise',
    ])
  })

  it('ordena atributos nas duas direções', () => {
    expect(sortPokemonList(list, 'defense', 'asc', details, 'pt-BR').map(({ name }) => name)).toEqual([
      'bulbasaur',
      'charizard',
      'blastoise',
    ])
    expect(sortPokemonList(list, 'defense', 'desc', details, 'pt-BR').map(({ name }) => name)).toEqual([
      'blastoise',
      'charizard',
      'bulbasaur',
    ])
  })

  it('calcula o total dos seis atributos base', () => {
    expect(getPokemonSortValue(details.charizard, 'total')).toBe(534)
    expect(sortPokemonList(list, 'total', 'asc', details, 'pt-BR').map(({ name }) => name)).toEqual([
      'bulbasaur',
      'blastoise',
      'charizard',
    ])
  })

  it('mantém dados ainda indisponíveis depois dos Pokémon ordenáveis', () => {
    expect(
      sortPokemonList(list, 'hp', 'asc', { charizard: details.charizard }, 'pt-BR').map(({ name }) => name),
    ).toEqual(['charizard', 'bulbasaur', 'blastoise'])
    expect(
      sortPokemonList(list, 'hp', 'desc', { charizard: details.charizard }, 'pt-BR').map(({ name }) => name),
    ).toEqual(['charizard', 'bulbasaur', 'blastoise'])
  })
})
