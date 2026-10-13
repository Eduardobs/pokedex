import type { Translate } from '../i18n/types'
import { normalizeSearchText } from './api'
import { POKEMON_REGIONS, type PokemonRarityDetails, type PokemonRegion } from './pokemon-catalog'
import type { PokemonSortKey } from './pokemon-sort'

export const POKEMON_TYPES = [
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

export type PokemonType = (typeof POKEMON_TYPES)[number]

export function parsePokemonTypes(value: string | null): PokemonType[] {
  const types = (value ?? '')
    .split(',')
    .filter((type): type is PokemonType => POKEMON_TYPES.some((supported) => supported === type))
  return [...new Set(types)].slice(-2)
}

export function togglePokemonType(types: readonly PokemonType[], type: PokemonType): PokemonType[] {
  return types.includes(type) ? types.filter((selected) => selected !== type) : [...types.slice(-1), type]
}

export function intersectPokemonTypes<T extends { name: string }>(first: T[], second: T[]): T[] {
  const names = new Set(second.map(({ name }) => name))
  return first.filter(({ name }) => names.has(name))
}

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

type CatalogMetadataFilters = {
  region: PokemonRegion | 'all'
  regionDetails: Record<string, PokemonRegion> | null
  legendary: boolean
  mythical: boolean
  baby: boolean
  rarityDetails: Record<string, PokemonRarityDetails> | null
}

export function filterPokemonCatalogMetadata<T extends { name: string }>(
  pokemon: T[],
  { region, regionDetails, legendary, mythical, baby, rarityDetails }: CatalogMetadataFilters,
) {
  return pokemon.filter(({ name }) => {
    if (region !== 'all' && regionDetails?.[name] !== region) return false
    if (!legendary && !mythical && !baby) return true

    const rarity = rarityDetails?.[name]
    return Boolean((legendary && rarity?.isLegendary) || (mythical && rarity?.isMythical) || (baby && rarity?.isBaby))
  })
}

export function pokemonSearchSuggestions<T extends { id: number; name: string }>(
  pokemon: T[],
  query: string,
  searchValues: (pokemon: T) => readonly string[] = ({ name }) => [name],
  limit = 7,
) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery || !/[a-z]/.test(normalizedQuery)) return []

  return pokemon
    .filter((entry) => searchValues(entry).some((value) => normalizeSearchText(value).includes(normalizedQuery)))
    .sort((left, right) => {
      const leftStartsWith = normalizeSearchText(left.name).startsWith(normalizedQuery)
      const rightStartsWith = normalizeSearchText(right.name).startsWith(normalizedQuery)
      if (leftStartsWith !== rightStartsWith) return leftStartsWith ? -1 : 1
      return left.id - right.id || left.name.localeCompare(right.name)
    })
    .slice(0, limit)
}

export function pokemonSortOptions(t: Translate): { value: PokemonSortKey; label: string; metric?: string }[] {
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
