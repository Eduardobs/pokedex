import { API_BASE_URL } from '../config/app'
import { resolveApiUrl } from './api-client'

export type RelatedPokemonDatum = {
  key: string
  value: string | number | boolean
}

export type RelatedPokemon = {
  id: number
  name: string
  details: RelatedPokemonDatum[]
}

const pokemonReferenceKeys = ['pokemon', 'pokemon_species', 'species'] as const
const apiBasePath = new URL(API_BASE_URL).pathname.replace(/\/$/, '')

function pokemonReference(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const { name, url } = value as Record<string, unknown>
  if (typeof name !== 'string' || !name.trim() || typeof url !== 'string') return null

  try {
    const pathname = new URL(resolveApiUrl(url)).pathname
    if (!pathname.startsWith(`${apiBasePath}/`)) return null
    const [endpoint, rawId, ...remaining] = pathname.slice(apiBasePath.length + 1).split('/').filter(Boolean)
    const id = Number(rawId)
    if (remaining.length || (endpoint !== 'pokemon' && endpoint !== 'pokemon-species') || !Number.isSafeInteger(id) || id <= 0) return null
    return { id, name }
  } catch {
    return null
  }
}

function relatedPokemon(value: unknown): RelatedPokemon | null {
  const directReference = pokemonReference(value)
  if (directReference) return { ...directReference, details: [] }
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const referenceKey = pokemonReferenceKeys.find((key) => pokemonReference(record[key]))
  if (!referenceKey) return null
  const reference = pokemonReference(record[referenceKey])
  if (!reference) return null

  const details = Object.entries(record).flatMap(([key, detail]) => {
    if (key === referenceKey || (typeof detail !== 'string' && typeof detail !== 'number' && typeof detail !== 'boolean')) return []
    return [{ key, value: detail }]
  }).slice(0, 4)

  return { ...reference, details }
}

export function parseRelatedPokemonList(value: unknown): RelatedPokemon[] | null {
  if (!Array.isArray(value) || !value.length) return null
  const parsed = value.map(relatedPokemon)
  return parsed.every((item): item is RelatedPokemon => item !== null) ? parsed : null
}

export const isRelatedPokemonList = (value: unknown) => parseRelatedPokemonList(value) !== null
