export const API_BASE_URL = 'https://pokeapi.co/api/v2'
export const API_ORIGIN = new URL(API_BASE_URL).origin
export const GRAPHQL_API_URL = 'https://graphql.pokeapi.co/v1beta2'

export const POKEMON_CATALOG_LIMIT = 10_000

export const NETWORK = {
  cacheMaxEntries: 250,
  cacheTtlMs: 5 * 60 * 1000,
  requestTimeoutMs: 15_000,
} as const

export const STORAGE_KEYS = {
  favorites: 'atlas-pokemon-favorites',
  language: 'atlas-language',
  theme: 'atlas-theme',
} as const

export const FAVORITES_LIMIT = 200
