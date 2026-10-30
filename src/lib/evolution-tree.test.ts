import { expect, it } from 'vitest'
import type { EvolutionNode } from '../types'
import { evolutionFamilyStats } from './evolution-tree'

const node = (name: string, evolves_to: EvolutionNode[] = []): EvolutionNode => ({
  is_baby: false,
  species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${name}/` },
  evolves_to,
  evolution_details: [],
})

it('counts final outcomes without treating sibling branches as later stages', () => {
  const family = node('oddish', [node('gloom', [node('vileplume'), node('bellossom')])])
  expect(evolutionFamilyStats(family)).toEqual({ pokemon: 4, stages: 3, outcomes: 2, branching: true })
})

it('handles a large split and a species without known evolutions', () => {
  expect(
    evolutionFamilyStats(
      node(
        'eevee',
        Array.from({ length: 8 }, (_, i) => node(`evolution-${i}`)),
      ),
    ),
  ).toEqual({ pokemon: 9, stages: 2, outcomes: 8, branching: true })
  expect(evolutionFamilyStats(node('ditto'))).toEqual({ pokemon: 1, stages: 1, outcomes: 0, branching: false })
})
