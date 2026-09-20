import type { ApiList, NamedResource, PokemonListItem } from '../types'
import type { Language } from '../contexts/LanguageContext'
import { API_BASE_URL } from '../config/app'
import { apiFetch } from './api-client'

export const API_BASE = API_BASE_URL
export { ApiError, apiFetch, resolveApiUrl } from './api-client'

export async function listResource(endpoint: string, limit = 24, offset = 0, signal?: AbortSignal) {
  return apiFetch<ApiList>(`${endpoint}?limit=${limit}&offset=${offset}`, signal)
}

export const idFromUrl = (url: string) => Number(url.split('/').filter(Boolean).at(-1))
export const pokemonArtwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${encodeURIComponent(String(id))}.png`
export const itemSprite = (name: string) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${encodeURIComponent(name)}.png`
export const pokemonListItems = (resources: NamedResource[]): PokemonListItem[] => resources.map((item) => ({ ...item, id: idFromUrl(item.url) }))

export const prettyName = (value: string) => value
  .replace(/-/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

export const formatNumber = (value: number, language: Language = 'pt-BR') => new Intl.NumberFormat(language).format(value)

export function localizedText(entries: unknown, keys: string[] = ['flavor_text', 'effect', 'description'], language = 'pt-br'): string {
  if (!Array.isArray(entries)) return ''
  const candidates = entries as Array<Record<string, unknown>>
  const selected = candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === language)
    ?? candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'en')
    ?? candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'pt-br')
    ?? candidates[0]
  if (!selected) return ''
  const key = keys.find((item) => typeof selected[item] === 'string')
  return key ? String(selected[key]).replace(/[\n\f]/g, ' ') : ''
}

export function localizedName(entries: unknown, language = 'pt-br'): string {
  if (!Array.isArray(entries)) return ''
  const candidates = entries as Array<{ name?: unknown; language?: NamedResource }>
  const selected = candidates.find((entry) => entry.language?.name === language)
    ?? candidates.find((entry) => entry.language?.name === 'en')
    ?? candidates.find((entry) => entry.language?.name === 'pt-br')
  return typeof selected?.name === 'string' ? selected.name : ''
}
