import { API_BASE_URL, POKEAPI_ALTERNATE_POKEMON_ID_START } from '../config/app'
import { apiTermMessages } from '../i18n/messages'
import type { Language } from '../i18n/types'
import type { ApiList, NamedResource, PokemonListItem } from '../types'
import { apiFetch } from './api-client'

export const API_BASE = API_BASE_URL
export { ApiError, apiFetch, resolveApiUrl } from './api-client'

export async function listResource(endpoint: string, limit = 24, offset = 0, signal?: AbortSignal) {
  return apiFetch<ApiList>(`${endpoint}?limit=${limit}&offset=${offset}`, signal)
}

export const idFromUrl = (url: string) => Number(url.split('/').filter(Boolean).at(-1))
export const pokemonArtwork = (id: number, shiny = false) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? 'shiny/' : ''}${encodeURIComponent(String(id))}.png`
export const itemSprite = (name: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${encodeURIComponent(name)}.png`
export const berrySprite = (name: string) => itemSprite(`${name}-berry`)
export const pokemonListItems = (resources: NamedResource[]): PokemonListItem[] =>
  resources.flatMap((item) => {
    const id = idFromUrl(item.url)
    // PokéAPI reserves IDs from 10001 onward for alternate varieties such as
    // regional, Mega and Gigantamax forms. The Pokédex directory lists species.
    return Number.isInteger(id) && id > 0 && id < POKEAPI_ALTERNATE_POKEMON_ID_START ? [{ ...item, id }] : []
  })

export const prettyName = (value: string) =>
  value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const numberFormatters = new Map<string, Intl.NumberFormat>()

function numberFormatter(language: Language, maximumFractionDigits?: number) {
  const key = `${language}:${maximumFractionDigits ?? 'default'}`
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(
      language,
      maximumFractionDigits === undefined ? undefined : { maximumFractionDigits },
    )
    numberFormatters.set(key, formatter)
  }
  return formatter
}

export const formatNumber = (value: number, language: Language = 'pt-BR') => numberFormatter(language).format(value)

export const formatDecimal = (value: number, language: Language = 'pt-BR', maximumFractionDigits = 1) =>
  numberFormatter(language, maximumFractionDigits).format(value)

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const localizedApiTerm = (value: string, language: Language) => {
  const terms = apiTermMessages[language] as Readonly<Record<string, string>>
  return terms[value] ?? prettyName(value)
}

export type LocalizedTextResult = { text: string; language: string; fallback: boolean }

export function localizedTextResult(
  entries: unknown,
  keys: string[] = ['flavor_text', 'effect', 'description'],
  language = 'pt-br',
): LocalizedTextResult {
  if (!Array.isArray(entries)) return { text: '', language, fallback: false }
  const candidates = entries as Array<Record<string, unknown>>
  const selected =
    candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === language) ??
    candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'en') ??
    candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'pt-br') ??
    candidates[0]
  if (!selected) return { text: '', language, fallback: false }
  const key = keys.find((item) => typeof selected[item] === 'string')
  const selectedLanguage = (selected.language as NamedResource | undefined)?.name ?? language
  return {
    text: key ? String(selected[key]).replace(/[\n\f]/g, ' ') : '',
    language: selectedLanguage,
    fallback: selectedLanguage !== language,
  }
}

export function localizedText(
  entries: unknown,
  keys: string[] = ['flavor_text', 'effect', 'description'],
  language = 'pt-br',
): string {
  return localizedTextResult(entries, keys, language).text
}

export function localizedName(entries: unknown, language = 'pt-br'): string {
  if (!Array.isArray(entries)) return ''
  const candidates = entries as Array<{ name?: unknown; language?: NamedResource }>
  const selected =
    candidates.find((entry) => entry.language?.name === language) ??
    candidates.find((entry) => entry.language?.name === 'en') ??
    candidates.find((entry) => entry.language?.name === 'pt-br')
  return typeof selected?.name === 'string' ? selected.name : ''
}
