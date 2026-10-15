import showdownSetsJson from '../data/third-party/pokemon-showdown-gen9-random-battle-sets.json'
import { POKEMON_CATALOG_LIMIT, TEAM_LIMITS } from '../config/app'
import { apiFetch, pokemonListItems } from './api'
import { BATTLE_TYPES, getDamageMultiplier, type BattleType } from './type-chart'
import { array, record, reference } from './resource-data'
import { parseTeamPokemon, teraTypes, type Stats, type Team, type TeamMember, type TeamPokemon } from './teams'

type RandomSource = () => number
type ShowdownSet = { role: string; movepool: string[]; abilities: string[]; teraTypes: string[] }
type ShowdownSpecies = { level: number; sets: ShowdownSet[] }

const RANDOM_CANDIDATE_COUNT = 24
const SHOWDOWN_SHINY_CHANCE = 1 / 1024
const SHOWDOWN_EVS: Stats = [85, 85, 85, 85, 85, 85]
const SHOWDOWN_IVS: Stats = [31, 31, 31, 31, 31, 31]

function randomInteger(minimum: number, maximum: number, random: RandomSource) {
  return minimum + Math.floor(random() * (maximum - minimum + 1))
}

function randomChoice<T>(values: readonly T[], random: RandomSource): T {
  const choice = values[Math.floor(random() * values.length)]
  if (choice === undefined) throw new Error('Cannot choose from an empty collection.')
  return choice
}

function randomUniqueChoices<T>(values: readonly T[], count: number, random: RandomSource) {
  const available = [...new Set(values)]
  if (available.length < count) throw new Error('Not enough distinct choices.')
  const choices: T[] = []
  while (choices.length < count) {
    const index = randomInteger(0, available.length - 1, random)
    const choice = available[index]
    if (choice === undefined) throw new Error('Cannot choose from an empty collection.')
    choices.push(choice)
    available.splice(index, 1)
  }
  return choices
}

function showdownId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function pokemonId(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseShowdownSets(value: unknown): Readonly<Record<string, ShowdownSpecies>> {
  const catalog: Record<string, ShowdownSpecies> = {}
  for (const [name, entry] of Object.entries(record(value))) {
    const species = record(entry)
    const level = species.level
    const sets = array(species.sets, 20).flatMap((set) => {
      const data = record(set)
      const role = data.role
      const movepool = array(data.movepool, 30).filter((move): move is string => typeof move === 'string')
      const abilities = array(data.abilities, 10).filter((ability): ability is string => typeof ability === 'string')
      const tera = array(data.teraTypes, 20).filter((type): type is string => typeof type === 'string')
      if (typeof role !== 'string') return []
      const teraTypesForSet = tera
        .map(pokemonId)
        .filter((type): type is (typeof teraTypes)[number] => teraTypes.includes(type as (typeof teraTypes)[number]))
      return movepool.length >= 4 && abilities.length && teraTypesForSet.length
        ? [{ role, movepool: movepool.map(pokemonId), abilities: abilities.map(pokemonId), teraTypes: teraTypesForSet }]
        : []
    })
    if (typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 100 && sets.length)
      catalog[showdownId(name)] = { level, sets }
  }
  return catalog
}

const showdownSets = parseShowdownSets(showdownSetsJson)

function compatibleSets(pokemon: TeamPokemon, teraBlastUsed: boolean) {
  const species = showdownSets[showdownId(pokemon.name)]
  if (!species) return []
  return species.sets.filter(
    (set) =>
      (!teraBlastUsed || set.role !== 'Tera Blast user') &&
      set.abilities.some((ability) => pokemon.abilities.includes(ability)) &&
      set.movepool.filter((move) => pokemon.moves.includes(move)).length >= 4,
  )
}

function weaknesses(types: readonly string[]) {
  return BATTLE_TYPES.flatMap((attacking) => {
    const multiplier = types.reduce(
      (total, defending) => total * getDamageMultiplier(attacking, defending as BattleType),
      1,
    )
    return multiplier > 1 ? [{ type: attacking, double: multiplier > 2 }] : []
  })
}

function isCompatibleWithTeam(candidate: TeamPokemon, team: readonly TeamPokemon[]) {
  if (team.some((member) => member.species === candidate.species)) return false
  for (const type of candidate.types) {
    if (team.filter((member) => member.types.includes(type)).length >= 2) return false
  }
  for (const weakness of weaknesses(candidate.types)) {
    const existing = team.filter((member) => weaknesses(member.types).some((entry) => entry.type === weakness.type))
    if (existing.length >= 3) return false
    if (
      weakness.double &&
      existing.some((member) => weaknesses(member.types).some((entry) => entry.type === weakness.type && entry.double))
    )
      return false
  }
  return true
}

export function selectRandomBattlePokemon(candidates: readonly TeamPokemon[], random: RandomSource = Math.random) {
  const available = [...candidates]
  const team: TeamPokemon[] = []
  while (team.length < TEAM_LIMITS.members) {
    const compatible = available.filter((candidate) => isCompatibleWithTeam(candidate, team))
    if (!compatible.length) throw new Error('Could not satisfy Random Battle team composition rules.')
    const candidate = randomChoice(compatible, random)
    team.push(candidate)
    available.splice(available.indexOf(candidate), 1)
  }
  return team
}

function chooseMoves(pokemon: TeamPokemon, set: ShowdownSet, random: RandomSource) {
  const available = set.movepool.filter((move) => pokemon.moves.includes(move))
  const moves: string[] = []
  const pairedMoves = [
    ['light-screen', 'reflect'],
    ['sleep-talk', 'rest'],
    ['protect', 'wish'],
    ['leech-seed', 'protect'],
    ['leech-seed', 'substitute'],
  ]
  for (const pair of pairedMoves) {
    if (moves.length <= 2 && pair.every((move) => available.includes(move))) moves.push(...pair)
  }
  const remaining = available.filter((move) => !moves.includes(move))
  return [...moves, ...randomUniqueChoices(remaining, 4 - moves.length, random)]
}

function itemForSet(pokemon: TeamPokemon, set: ShowdownSet, moves: readonly string[], isLead: boolean) {
  if (pokemon.name === 'pikachu') return 'light-ball'
  if (set.role === 'AV Pivot') return 'assault-vest'
  if (moves.includes('shell-smash')) return 'white-herb'
  if (moves.includes('aurora-veil') || (moves.includes('light-screen') && moves.includes('reflect')))
    return 'light-clay'
  if (moves.includes('rest') && !moves.includes('sleep-talk')) return 'chesto-berry'
  if (set.role === 'Fast Support' && isLead && (moves.includes('stealth-rock') || moves.includes('spikes')))
    return 'focus-sash'
  if (['Bulky Attacker', 'Bulky Support', 'Bulky Setup'].includes(set.role)) return 'leftovers'
  if (['Fast Attacker', 'Fast Bulky Setup', 'Setup Sweeper', 'Tera Blast user', 'Wallbreaker'].includes(set.role))
    return 'life-orb'
  return 'leftovers'
}

function natureForSet(pokemon: TeamPokemon, set: ShowdownSet) {
  if (set.role.includes('Bulky')) return pokemon.stats[2] >= pokemon.stats[4] ? 'impish' : 'calm'
  return pokemon.stats[1] >= pokemon.stats[3] ? 'jolly' : 'timid'
}

function randomMember(pokemon: TeamPokemon, set: ShowdownSet, random: RandomSource, isLead: boolean): TeamMember {
  const moves = chooseMoves(pokemon, set, random)
  const abilities = set.abilities.filter((ability) => pokemon.abilities.includes(ability))
  return {
    id: crypto.randomUUID(),
    pokemon: pokemon.name,
    level: showdownSets[showdownId(pokemon.name)]!.level,
    friendship: 255,
    shiny: random() < SHOWDOWN_SHINY_CHANCE,
    gender: 'random',
    tera: randomChoice(set.teraTypes, random),
    ability: randomChoice(abilities, random),
    nature: natureForSet(pokemon, set),
    item: itemForSet(pokemon, set, moves, isLead),
    moves,
    evs: [...SHOWDOWN_EVS] as Stats,
    ivs: [...SHOWDOWN_IVS] as Stats,
    abilityActive: false,
    itemActive: false,
  }
}

export async function loadRandomTeamPokemon(signal?: AbortSignal, random: RandomSource = Math.random) {
  const directory = await apiFetch<unknown>(`pokemon?limit=${POKEMON_CATALOG_LIMIT}`, signal)
  const candidates = pokemonListItems(
    array(record(directory).results, POKEMON_CATALOG_LIMIT)
      .map(reference)
      .filter((entry) => entry !== null),
  ).filter((entry) => showdownSets[showdownId(entry.name)])
  const names = randomUniqueChoices(
    candidates.map((entry) => entry.name),
    Math.min(RANDOM_CANDIDATE_COUNT, candidates.length),
    random,
  )
  const pokemon = await Promise.all(
    names.map(async (name) => parseTeamPokemon(await apiFetch<unknown>(`pokemon/${name}`, signal))),
  )
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
  return selectRandomBattlePokemon(pokemon, random)
}

export function createRandomTeam(
  name: string,
  pokemon: readonly TeamPokemon[],
  random: RandomSource = Math.random,
): Team {
  if (
    pokemon.length !== TEAM_LIMITS.members ||
    new Set(pokemon.map((entry) => entry.species)).size !== TEAM_LIMITS.members
  )
    throw new Error('A Random Battle team needs six distinct species.')
  const members: TeamMember[] = []
  let teraBlastRoleUsed = false
  for (const entry of pokemon) {
    const set: ShowdownSet = randomChoice(compatibleSets(entry, teraBlastRoleUsed), random)
    members.push(randomMember(entry, set, random, members.length === 0))
    teraBlastRoleUsed ||= set.role === 'Tera Blast user'
  }
  return {
    id: crypto.randomUUID(),
    name,
    competitiveFormat: 'singles-6v6',
    members,
  }
}
