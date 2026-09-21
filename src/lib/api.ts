import type { ApiList, NamedResource, PokemonListItem } from '../types'
import type { Language } from '../contexts/LanguageContext'
import { API_BASE_URL, POKEAPI_ALTERNATE_POKEMON_ID_START } from '../config/app'
import { apiFetch } from './api-client'

export const API_BASE = API_BASE_URL
export { ApiError, apiFetch, resolveApiUrl } from './api-client'

export async function listResource(endpoint: string, limit = 24, offset = 0, signal?: AbortSignal) {
  return apiFetch<ApiList>(`${endpoint}?limit=${limit}&offset=${offset}`, signal)
}

export const idFromUrl = (url: string) => Number(url.split('/').filter(Boolean).at(-1))
export const pokemonArtwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${encodeURIComponent(String(id))}.png`
export const itemSprite = (name: string) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${encodeURIComponent(name)}.png`
export const pokemonListItems = (resources: NamedResource[]): PokemonListItem[] => resources.flatMap((item) => {
  const id = idFromUrl(item.url)
  // PokéAPI reserves IDs from 10001 onward for alternate varieties such as
  // regional, Mega and Gigantamax forms. The Pokédex directory lists species.
  return Number.isInteger(id) && id > 0 && id < POKEAPI_ALTERNATE_POKEMON_ID_START
    ? [{ ...item, id }]
    : []
})

export const prettyName = (value: string) => value
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

const numberFormatters = new Map<string, Intl.NumberFormat>()

function numberFormatter(language: Language, maximumFractionDigits?: number) {
  const key = `${language}:${maximumFractionDigits ?? 'default'}`
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(language, maximumFractionDigits === undefined ? undefined : { maximumFractionDigits })
    numberFormatters.set(key, formatter)
  }
  return formatter
}

export const formatNumber = (value: number, language: Language = 'pt-BR') => numberFormatter(language).format(value)

export const formatDecimal = (value: number, language: Language = 'pt-BR', maximumFractionDigits = 1) =>
  numberFormatter(language, maximumFractionDigits).format(value)

export const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const apiTermTranslations: Record<Language, Record<string, string>> = {
  'pt-BR': {
    'generation-i': 'Geração I', 'generation-ii': 'Geração II', 'generation-iii': 'Geração III',
    'generation-iv': 'Geração IV', 'generation-v': 'Geração V', 'generation-vi': 'Geração VI',
    'generation-vii': 'Geração VII', 'generation-viii': 'Geração VIII', 'generation-ix': 'Geração IX',
    grassland: 'Campos', forest: 'Floresta', mountain: 'Montanha', cave: 'Caverna', urban: 'Urbano',
    'waters-edge': 'Margens de água', sea: 'Mar', 'rough-terrain': 'Terreno acidentado', rare: 'Raro',
    'medium-slow': 'Médio-lento', medium: 'Médio', slow: 'Lento', fast: 'Rápido',
    'slow-then-very-fast': 'Lento, depois muito rápido', 'fast-then-very-slow': 'Rápido, depois muito lento',
    monster: 'Monstro', plant: 'Planta', bug: 'Inseto', flying: 'Voador', field: 'Campo', fairy: 'Fada',
    humanoid: 'Humanoide', mineral: 'Mineral', amorphous: 'Amorfo', dragon: 'Dragão', water1: 'Água 1',
    water2: 'Água 2', water3: 'Água 3', ditto: 'Ditto', undiscovered: 'Não descoberto',
  },
  en: {},
  es: {
    'generation-i': 'Generación I', 'generation-ii': 'Generación II', 'generation-iii': 'Generación III',
    'generation-iv': 'Generación IV', 'generation-v': 'Generación V', 'generation-vi': 'Generación VI',
    'generation-vii': 'Generación VII', 'generation-viii': 'Generación VIII', 'generation-ix': 'Generación IX',
    grassland: 'Pradera', forest: 'Bosque', mountain: 'Montaña', cave: 'Cueva', urban: 'Urbano',
    'waters-edge': 'Orilla', sea: 'Mar', 'rough-terrain': 'Terreno accidentado', rare: 'Raro',
    'medium-slow': 'Medio-lento', medium: 'Medio', slow: 'Lento', fast: 'Rápido',
    'slow-then-very-fast': 'Lento y luego muy rápido', 'fast-then-very-slow': 'Rápido y luego muy lento',
    monster: 'Monstruo', plant: 'Planta', bug: 'Bicho', flying: 'Volador', field: 'Campo', fairy: 'Hada',
    humanoid: 'Humanoide', mineral: 'Mineral', amorphous: 'Amorfo', dragon: 'Dragón', water1: 'Agua 1',
    water2: 'Agua 2', water3: 'Agua 3', ditto: 'Ditto', undiscovered: 'No descubierto',
  },
}

export const localizedApiTerm = (value: string, language: Language) =>
  apiTermTranslations[language][value] ?? prettyName(value)

export type LocalizedTextResult = { text: string; language: string; fallback: boolean }

export function localizedTextResult(entries: unknown, keys: string[] = ['flavor_text', 'effect', 'description'], language = 'pt-br'): LocalizedTextResult {
  if (!Array.isArray(entries)) return { text: '', language, fallback: false }
  const candidates = entries as Array<Record<string, unknown>>
  const selected = candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === language)
    ?? candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'en')
    ?? candidates.find((entry) => (entry.language as NamedResource | undefined)?.name === 'pt-br')
    ?? candidates[0]
  if (!selected) return { text: '', language, fallback: false }
  const key = keys.find((item) => typeof selected[item] === 'string')
  const selectedLanguage = (selected.language as NamedResource | undefined)?.name ?? language
  return {
    text: key ? String(selected[key]).replace(/[\n\f]/g, ' ') : '',
    language: selectedLanguage,
    fallback: selectedLanguage !== language,
  }
}

export function localizedText(entries: unknown, keys: string[] = ['flavor_text', 'effect', 'description'], language = 'pt-br'): string {
  return localizedTextResult(entries, keys, language).text
}

export function localizedName(entries: unknown, language = 'pt-br'): string {
  if (!Array.isArray(entries)) return ''
  const candidates = entries as Array<{ name?: unknown; language?: NamedResource }>
  const selected = candidates.find((entry) => entry.language?.name === language)
    ?? candidates.find((entry) => entry.language?.name === 'en')
    ?? candidates.find((entry) => entry.language?.name === 'pt-br')
  return typeof selected?.name === 'string' ? selected.name : ''
}
