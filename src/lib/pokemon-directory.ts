import type { Translate } from '../contexts/LanguageContext'
import { POKEMON_REGIONS, type PokemonRegion } from './pokemon-catalog'
import type { PokemonSortKey } from './pokemon-sort'

export const POKEMON_TYPES = [
  'all',
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const

export const POKEMON_SORT_KEYS: PokemonSortKey[] = [
  'number',
  'name',
  'total',
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

export function isPokemonRegion(value: string): value is PokemonRegion {
  return POKEMON_REGIONS.some((region) => region.name === value)
}

export function pokemonSortOptions(
  t: Translate,
): { value: PokemonSortKey; label: string; metric?: string }[] {
  return [
    { value: 'number', label: t('pokedex.sort.number') },
    { value: 'name', label: t('pokedex.sort.name') },
    { value: 'total', label: t('pokedex.sort.total'), metric: t('detail.total') },
    { value: 'hp', label: t('pokedex.sort.hp'), metric: t('pokedex.sort.hp') },
    { value: 'attack', label: t('pokedex.sort.attack'), metric: t('stats.attack') },
    { value: 'defense', label: t('pokedex.sort.defense'), metric: t('stats.defense') },
    {
      value: 'special-attack',
      label: t('pokedex.sort.specialAttack'),
      metric: t('stats.specialAttack'),
    },
    {
      value: 'special-defense',
      label: t('pokedex.sort.specialDefense'),
      metric: t('stats.specialDefense'),
    },
    { value: 'speed', label: t('pokedex.sort.speed'), metric: t('stats.speed') },
  ]
}

export function pokemonSortMetricLabel(sort: PokemonSortKey, t: Translate) {
  return pokemonSortOptions(t).find((option) => option.value === sort)?.metric ?? ''
}
