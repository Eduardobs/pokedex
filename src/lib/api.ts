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
    black: 'Preto', blue: 'Azul', brown: 'Marrom', gray: 'Cinza', green: 'Verde', pink: 'Rosa',
    purple: 'Roxo', red: 'Vermelho', white: 'Branco', yellow: 'Amarelo',
    ball: 'Esférico', squiggle: 'Serpentino', fish: 'Peixe', arms: 'Com braços', blob: 'Amorfo', upright: 'Ereto',
    legs: 'Com pernas', quadruped: 'Quadrúpede', wings: 'Com asas', tentacles: 'Com tentáculos', heads: 'Múltiplas cabeças',
    'bug-wings': 'Inseto alado', armor: 'Com armadura',
    walk: 'Caminhando', surf: 'Surfe', 'old-rod': 'Vara velha', 'good-rod': 'Vara boa', 'super-rod': 'Supervara',
    gift: 'Presente', overworld: 'Mundo aberto', wanderer: 'Errante', sos: 'Chamado por ajuda', 'npc-trade': 'Troca com NPC',
    'max-raid': 'Batalha Max Raid', 'rock-smash': 'Quebra-rocha', headbutt: 'Cabeçada', 'dark-grass': 'Grama escura',
    'time-morning': 'De manhã', 'time-day': 'Durante o dia', 'time-night': 'À noite',
    'weather-normal': 'Clima normal', 'weather-overcast': 'Tempo nublado', 'weather-raining': 'Chuva',
    'weather-intense-sun': 'Sol intenso', 'weather-sandstorm': 'Tempestade de areia', 'weather-thunderstorm': 'Tempestade', 'weather-fog': 'Neblina',
    'story-progress-before-hall-of-fame': 'Antes do Hall da Fama', 'story-progress-hall-of-fame': 'Após o Hall da Fama',
    'max-den-rarity-common': 'Covil comum', 'max-den-rarity-rare': 'Covil raro', 'max-den-rarity-special': 'Covil especial',
  },
  en: {
    walk: 'Walking', surf: 'Surfing', 'old-rod': 'Old Rod', 'good-rod': 'Good Rod', 'super-rod': 'Super Rod',
    gift: 'Gift', overworld: 'Overworld', wanderer: 'Wanderer', sos: 'SOS encounter', 'npc-trade': 'NPC trade',
    'max-raid': 'Max Raid Battle', 'rock-smash': 'Rock Smash', headbutt: 'Headbutt', 'dark-grass': 'Dark grass',
    'time-morning': 'Morning', 'time-day': 'Daytime', 'time-night': 'Night',
    'weather-normal': 'Normal weather', 'weather-overcast': 'Overcast', 'weather-raining': 'Rain',
    'weather-intense-sun': 'Intense sun', 'weather-sandstorm': 'Sandstorm', 'weather-thunderstorm': 'Thunderstorm', 'weather-fog': 'Fog',
    'story-progress-before-hall-of-fame': 'Before the Hall of Fame', 'story-progress-hall-of-fame': 'After the Hall of Fame',
    'max-den-rarity-common': 'Common den', 'max-den-rarity-rare': 'Rare den', 'max-den-rarity-special': 'Special den',
  },
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
    black: 'Negro', blue: 'Azul', brown: 'Marrón', gray: 'Gris', green: 'Verde', pink: 'Rosa',
    purple: 'Morado', red: 'Rojo', white: 'Blanco', yellow: 'Amarillo',
    ball: 'Esférico', squiggle: 'Serpentino', fish: 'Pez', arms: 'Con brazos', blob: 'Amorfo', upright: 'Erguido',
    legs: 'Con piernas', quadruped: 'Cuadrúpedo', wings: 'Con alas', tentacles: 'Con tentáculos', heads: 'Varias cabezas',
    'bug-wings': 'Insecto alado', armor: 'Con armadura',
    walk: 'Caminando', surf: 'Surf', 'old-rod': 'Caña vieja', 'good-rod': 'Caña buena', 'super-rod': 'Supercaña',
    gift: 'Regalo', overworld: 'Mundo abierto', wanderer: 'Errante', sos: 'Encuentro SOS', 'npc-trade': 'Intercambio con NPC',
    'max-raid': 'Incursión Dinamax', 'rock-smash': 'Golpe roca', headbutt: 'Cabezazo', 'dark-grass': 'Hierba oscura',
    'time-morning': 'Por la mañana', 'time-day': 'Durante el día', 'time-night': 'Por la noche',
    'weather-normal': 'Clima normal', 'weather-overcast': 'Nublado', 'weather-raining': 'Lluvia',
    'weather-intense-sun': 'Sol intenso', 'weather-sandstorm': 'Tormenta de arena', 'weather-thunderstorm': 'Tormenta eléctrica', 'weather-fog': 'Niebla',
    'story-progress-before-hall-of-fame': 'Antes del Salón de la Fama', 'story-progress-hall-of-fame': 'Después del Salón de la Fama',
    'max-den-rarity-common': 'Nido común', 'max-den-rarity-rare': 'Nido raro', 'max-den-rarity-special': 'Nido especial',
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
