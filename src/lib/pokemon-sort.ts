import type { Pokemon, PokemonListItem } from '../types'

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

export const pokemonSortNeedsDetails = (sort: PokemonSortKey) => sort !== 'number' && sort !== 'name'

export function getPokemonSortValue(pokemon: Pokemon | undefined, sort: PokemonSortKey): number | undefined {
  if (!pokemon || !pokemonSortNeedsDetails(sort)) return undefined
  if (sort === 'total') return pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0)
  return pokemon.stats.find((stat) => stat.stat.name === sort)?.base_stat
}

export function sortPokemonList(
  pokemon: PokemonListItem[],
  sort: PokemonSortKey,
  details: Record<string, Pokemon>,
  locale: string,
): PokemonListItem[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' })

  return [...pokemon].sort((left, right) => {
    if (sort === 'number') return left.id - right.id
    if (sort === 'name') return collator.compare(left.name, right.name) || left.id - right.id

    const leftValue = getPokemonSortValue(details[left.name], sort)
    const rightValue = getPokemonSortValue(details[right.name], sort)
    if (leftValue === undefined && rightValue === undefined) return left.id - right.id
    if (leftValue === undefined) return 1
    if (rightValue === undefined) return -1
    return rightValue - leftValue || left.id - right.id
  })
}
