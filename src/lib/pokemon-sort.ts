import type { Pokemon, PokemonListItem } from '../types'
import { normalizeSearchText } from './api'

export type PokemonSortDetails = Pick<Pokemon, 'stats'>

export type PokemonSortKey =
  | 'number'
  | 'name'
  | 'total'
  | 'hp'
  | 'attack'
  | 'defense'
  | 'special-attack'
  | 'special-defense'
  | 'speed'

export type PokemonSortDirection = 'asc' | 'desc'

export const pokemonSortNeedsDetails = (sort: PokemonSortKey) => sort !== 'number' && sort !== 'name'

export function filterPokemonList(pokemon: PokemonListItem[], query: string): PokemonListItem[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return pokemon
  return pokemon.filter((item) => normalizeSearchText(item.name).includes(normalizedQuery) || String(item.id) === normalizedQuery)
}

export function getPokemonSortValue(pokemon: PokemonSortDetails | undefined, sort: PokemonSortKey): number | undefined {
  if (!pokemon || !pokemonSortNeedsDetails(sort)) return undefined
  if (sort === 'total') return pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0)
  return pokemon.stats.find((stat) => stat.stat.name === sort)?.base_stat
}

export function sortPokemonList(
  pokemon: PokemonListItem[],
  sort: PokemonSortKey,
  direction: PokemonSortDirection,
  details: Record<string, PokemonSortDetails>,
  locale: string,
): PokemonListItem[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' })
  const directionMultiplier = direction === 'asc' ? 1 : -1

  return [...pokemon].sort((left, right) => {
    if (sort === 'number') return (left.id - right.id) * directionMultiplier
    if (sort === 'name') return collator.compare(left.name, right.name) * directionMultiplier || left.id - right.id

    const leftValue = getPokemonSortValue(details[left.name], sort)
    const rightValue = getPokemonSortValue(details[right.name], sort)
    if (leftValue === undefined && rightValue === undefined) return left.id - right.id
    if (leftValue === undefined) return 1
    if (rightValue === undefined) return -1
    return (leftValue - rightValue) * directionMultiplier || left.id - right.id
  })
}
