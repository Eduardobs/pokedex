import { TEAM_LIMITS } from '../config/app'
import { record, reference, invalidData, array } from './resource-data'

export const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const
export type Stats = [number, number, number, number, number, number]
export type TeamPokemon = {
  name: string
  id: number
  species: string
  stats: Stats
  types: string[]
  abilities: string[]
  moves: string[]
  homeSprite?: string | null
  homeShinySprite?: string | null
  showdownFrontSprite?: string | null
  showdownBackSprite?: string | null
  showdownFrontShinySprite?: string | null
  showdownBackShinySprite?: string | null
}
export const natureNames = [
  'hardy',
  'lonely',
  'brave',
  'adamant',
  'naughty',
  'bold',
  'docile',
  'relaxed',
  'impish',
  'lax',
  'timid',
  'hasty',
  'serious',
  'jolly',
  'naive',
  'modest',
  'mild',
  'quiet',
  'bashful',
  'rash',
  'calm',
  'gentle',
  'sassy',
  'careful',
  'quirky',
]
export const teraTypes = [
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
  'stellar',
]
export const competitiveFormats = ['unrestricted', 'singles-6v6', 'doubles-6v6', 'doubles-4v4', 'singles-3v3'] as const
export type CompetitiveFormat = (typeof competitiveFormats)[number]
export type TeamMember = {
  id: string
  pokemon: string
  level: number
  friendship?: number
  shiny: boolean
  gender: string
  tera: string
  ability: string
  nature: string
  item: string
  moves: string[]
  evs: Stats
  ivs: Stats
  abilityActive: boolean
  itemActive: boolean
}
export type Team = { id: string; name: string; members: TeamMember[]; competitiveFormat?: CompetitiveFormat }
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value)
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
const optionalIdentifier = (value: unknown) => value === '' || identifier(value)
const statsValid = (value: unknown, max: number): value is Stats =>
  Array.isArray(value) && value.length === 6 && value.every((v) => integer(v, 0, max))
export function validTeams(value: unknown): value is Team[] {
  return (
    Array.isArray(value) &&
    value.length <= TEAM_LIMITS.teams &&
    new Set(value.map((v) => record(v).id)).size === value.length &&
    value.every((value) => {
      const team = record(value)
      return (
        identifier(team.id) &&
        typeof team.name === 'string' &&
        team.name.length <= 80 &&
        (team.competitiveFormat === undefined ||
          competitiveFormats.includes(team.competitiveFormat as CompetitiveFormat)) &&
        Array.isArray(team.members) &&
        team.members.length <= TEAM_LIMITS.members &&
        new Set(team.members.map((v) => record(v).id)).size === team.members.length &&
        team.members.every((value) => {
          const m = record(value)
          return (
            identifier(m.id) &&
            identifier(m.pokemon) &&
            integer(m.level, 1, 100) &&
            (m.friendship === undefined || integer(m.friendship, 0, 255)) &&
            typeof m.shiny === 'boolean' &&
            ['random', 'male', 'female', 'none'].includes(String(m.gender)) &&
            teraTypes.includes(String(m.tera)) &&
            optionalIdentifier(m.ability) &&
            natureNames.includes(String(m.nature)) &&
            optionalIdentifier(m.item) &&
            Array.isArray(m.moves) &&
            m.moves.length === 4 &&
            m.moves.every(optionalIdentifier) &&
            new Set(m.moves.filter(Boolean)).size === m.moves.filter(Boolean).length &&
            statsValid(m.evs, 252) &&
            m.evs.reduce((a, b) => a + b, 0) <= 510 &&
            statsValid(m.ivs, 31) &&
            typeof m.abilityActive === 'boolean' &&
            typeof m.itemActive === 'boolean'
          )
        })
      )
    })
  )
}
export function parseTeamPokemon(value: unknown): TeamPokemon {
  const data = record(value)
  const species = reference(data.species)
  if (!identifier(data.name) || !integer(data.id, 1, 100000) || !species) return invalidData()
  const stats = statNames.map((name) => {
    const stat = array(data.stats)
      .map(record)
      .find((s) => reference(s.stat)?.name === name)
    if (!stat || !integer(stat.base_stat, 1, 1000)) return invalidData()
    return stat.base_stat
  }) as Stats
  const types = array(data.types, 2)
    .map((v) => reference(record(v).type)?.name)
    .filter((v): v is string => !!v && teraTypes.includes(v))
  const abilities = array(data.abilities, 10)
    .map((v) => reference(record(v).ability)?.name)
    .filter((v): v is string => !!v && identifier(v))
  const moves = array(data.moves, 2000)
    .map((v) => reference(record(v).move)?.name)
    .filter((v): v is string => !!v && identifier(v))
  if (!types.length || !abilities.length) return invalidData()
  const home = record(record(record(data.sprites).other).home)
  const showdown = record(record(record(data.sprites).other).showdown)
  const safeHomeSprite = (value: unknown) => {
    if (typeof value !== 'string') return null
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' ? url.toString() : null
    } catch {
      return null
    }
  }
  return {
    name: data.name,
    id: data.id,
    species: species.name,
    stats,
    types,
    abilities,
    moves,
    homeSprite: safeHomeSprite(home.front_default),
    homeShinySprite: safeHomeSprite(home.front_shiny),
    showdownFrontSprite: safeHomeSprite(showdown.front_default),
    showdownBackSprite: safeHomeSprite(showdown.back_default),
    showdownFrontShinySprite: safeHomeSprite(showdown.front_shiny),
    showdownBackShinySprite: safeHomeSprite(showdown.back_shiny),
  }
}
export function parseTeamSpecies(value: unknown) {
  const data = record(value)
  if (!integer(data.id, 1, 10000) || !integer(data.gender_rate, -1, 8)) return invalidData()
  return { id: data.id, genderRate: data.gender_rate }
}
export function newMember(p: TeamPokemon): TeamMember {
  return {
    id: crypto.randomUUID(),
    pokemon: p.name,
    level: 100,
    friendship: 255,
    shiny: false,
    gender: 'random',
    tera: p.types[0],
    ability: p.abilities[0],
    nature: 'hardy',
    item: '',
    moves: ['', '', '', ''],
    evs: [0, 0, 0, 0, 0, 0],
    ivs: [31, 31, 31, 31, 31, 31],
    abilityActive: false,
    itemActive: false,
  }
}
export function editEv(evs: Stats, index: number, value: number): Stats {
  return evs.map((v, i) =>
    i === index
      ? Math.max(0, Math.min(252, 510 - evs.reduce((a, b, j) => a + (j === index ? 0 : b), 0), Math.trunc(value) || 0))
      : v,
  ) as Stats
}
const natureOrder = [1, 2, 5, 3, 4]
export function natureModifiers(name: string) {
  const index = natureNames.indexOf(name)
  if (index < 0 || Math.floor(index / 5) === index % 5) return null
  return { increased: statNames[natureOrder[Math.floor(index / 5)]], decreased: statNames[natureOrder[index % 5]] }
}
export function calculatedCoreStats(p: TeamPokemon, m: TeamMember): Stats {
  const nature = natureNames.indexOf(m.nature)
  const up = natureOrder[Math.floor(nature / 5)],
    down = natureOrder[nature % 5]
  return p.stats.map((base, i) => {
    const value = Math.floor(((2 * base + m.ivs[i] + Math.floor(m.evs[i] / 4)) * m.level) / 100)
    return i === 0
      ? p.name === 'shedinja'
        ? 1
        : value + m.level + 10
      : Math.floor((value + 5) * (up === down ? 1 : i === up ? 1.1 : i === down ? 0.9 : 1))
  }) as Stats
}
export function calculatedStats(p: TeamPokemon, m: TeamMember): Stats {
  const values = calculatedCoreStats(p, m)
  const multiply = (index: number, factor: number) => {
    values[index] = Math.floor(values[index] * factor)
  }
  const ability = p.abilities.includes(m.ability) ? m.ability : p.abilities[0]
  if (['huge-power', 'pure-power'].includes(ability)) multiply(1, 2)
  if (['hustle', 'gorilla-tactics'].includes(ability)) multiply(1, 1.5)
  if (ability === 'fur-coat') multiply(2, 2)
  if (m.abilityActive) {
    if (ability === 'orichalcum-pulse') multiply(1, 4 / 3)
    if (ability === 'hadron-engine') multiply(3, 4 / 3)
    if (ability === 'intrepid-sword') multiply(1, 1.5)
    if (ability === 'dauntless-shield') multiply(2, 1.5)
    if (['guts'].includes(ability)) multiply(1, 1.5)
    if (['solar-power', 'plus', 'minus'].includes(ability)) multiply(3, 1.5)
    if (['swift-swim', 'chlorophyll', 'sand-rush', 'slush-rush', 'surge-surfer', 'unburden'].includes(ability))
      multiply(5, 2)
    if (ability === 'quick-feet') multiply(5, 1.5)
    if (ability === 'marvel-scale') multiply(2, 1.5)
    if (ability === 'grass-pelt') multiply(2, 1.5)
    if (ability === 'slow-start') {
      multiply(1, 0.5)
      multiply(5, 0.5)
    }
    if (ability === 'defeatist') {
      multiply(1, 0.5)
      multiply(3, 0.5)
    }
    if (['protosynthesis', 'quark-drive'].includes(ability)) {
      const highest = values.slice(1).indexOf(Math.max(...values.slice(1))) + 1
      multiply(highest, highest === 5 ? 1.5 : 1.3)
    }
  }
  if (m.item === 'choice-band') multiply(1, 1.5)
  if (m.item === 'choice-specs') multiply(3, 1.5)
  if (m.item === 'choice-scarf') multiply(5, 1.5)
  if (m.item === 'assault-vest') multiply(4, 1.5)
  if (
    m.item === 'iron-ball' ||
    m.item === 'macho-brace' ||
    /^power-(weight|bracer|belt|lens|band|anklet)$/.test(m.item)
  )
    multiply(5, 0.5)
  if (m.item === 'deep-sea-tooth' && p.species === 'clamperl') multiply(3, 2)
  if (m.item === 'deep-sea-scale' && p.species === 'clamperl') multiply(4, 2)
  if (m.item === 'light-ball' && p.species === 'pikachu') {
    multiply(1, 2)
    multiply(3, 2)
  }
  if (m.item === 'thick-club' && ['cubone', 'marowak'].includes(p.species)) multiply(1, 2)
  if (m.item === 'quick-powder' && p.name === 'ditto') multiply(5, 2)
  if (m.item === 'metal-powder' && p.name === 'ditto') multiply(2, 2)
  if (m.item === 'eviolite' && m.itemActive) {
    multiply(2, 1.5)
    multiply(4, 1.5)
  }
  return values
}
