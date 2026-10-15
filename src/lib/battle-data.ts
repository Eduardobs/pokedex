import { apiFetch } from './api'
import { array, record, reference } from './resource-data'
import { parseTeamPokemon, type Team } from './teams'
import { BATTLE_TYPES, type BattleType } from './type-chart'
import {
  createBattlePokemon,
  type BattleMove,
  type BattlePokemon,
  type BattleResource,
  type BattleStages,
} from './battle'

const battleStats: Record<string, keyof BattleStages> = {
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

const boundedInteger = (value: unknown, minimum: number, maximum: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum ? value : null

const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,100}$/.test(value)

function parseBattleResource(value: unknown, includeSprite = false): BattleResource {
  const data = record(value)
  if (!identifier(data.name)) throw new Error('Invalid battle resource.')
  const names = array(data.names, 50).flatMap((entry) => {
    const name = record(entry)
    const text = name.name
    const language = reference(name.language)?.name
    return typeof text === 'string' && text.length <= 200 && identifier(language)
      ? [{ name: text, language: { name: language } }]
      : []
  })
  const descriptions = [...array(data.effect_entries, 50), ...array(data.flavor_text_entries, 100)].flatMap((entry) => {
    const description = record(entry)
    const text = description.short_effect ?? description.effect ?? description.flavor_text
    const language = reference(description.language)?.name
    const normalized = typeof text === 'string' ? text.replace(/[\n\f]/g, ' ').trim() : ''
    return normalized && normalized.length <= 5_000 && identifier(language)
      ? [{ effect: normalized, language: { name: language } }]
      : []
  })
  const sprite = includeSprite ? record(data.sprites).default : null
  if (
    sprite !== null &&
    sprite !== undefined &&
    (typeof sprite !== 'string' || !sprite.startsWith('https://raw.githubusercontent.com/'))
  )
    throw new Error('Invalid battle resource sprite.')
  return { name: data.name, names, descriptions, sprite: typeof sprite === 'string' ? sprite : null }
}

export const parseBattleAbility = (value: unknown) => parseBattleResource(value)
export const parseBattleItem = (value: unknown) => parseBattleResource(value, true)

export function parseBattleMove(value: unknown): BattleMove {
  const data = record(value)
  const name = typeof data.name === 'string' ? data.name : ''
  const type = reference(data.type)?.name
  const damageClass = reference(data.damage_class)?.name
  if (
    !/^[a-z0-9-]{1,100}$/.test(name) ||
    !BATTLE_TYPES.includes(type as BattleType) ||
    !['physical', 'special', 'status'].includes(damageClass ?? '')
  )
    throw new Error('Invalid battle move.')
  const meta = record(data.meta)
  const healing = boundedInteger(meta.healing, -100, 100) ?? 0
  const drain = boundedInteger(meta.drain, -100, 100) ?? 0
  const ailmentName = reference(meta.ailment)?.name
  const ailment = typeof ailmentName === 'string' && ailmentName !== 'none' ? ailmentName : null
  const metaChance = boundedInteger(meta.ailment_chance, 0, 100) ?? 0
  const effectChance = boundedInteger(data.effect_chance, 0, 100) ?? 0
  const descriptions = array(data.flavor_text_entries, 200).flatMap((entry) => {
    const flavor = record(entry)
    const language = reference(flavor.language)?.name
    const text = flavor.flavor_text
    const normalizedText = typeof text === 'string' ? text.replace(/[\n\f]/g, ' ').trim() : ''
    return language && normalizedText && normalizedText.length <= 1000 ? [{ language, text: normalizedText }] : []
  })
  return {
    name,
    type: type as BattleType,
    damageClass: damageClass as BattleMove['damageClass'],
    power: data.power === null ? null : boundedInteger(data.power, 1, 1000),
    accuracy: data.accuracy === null ? null : boundedInteger(data.accuracy, 1, 100),
    priority: boundedInteger(data.priority, -10, 10) ?? 0,
    pp: boundedInteger(data.pp, 1, 100) ?? 1,
    target: reference(data.target)?.name ?? 'selected-pokemon',
    healing: Math.max(0, healing),
    drain,
    ailment,
    ailmentChance: metaChance || effectChance || (ailment ? 100 : 0),
    statChanges: array(data.stat_changes, 10).flatMap((entry) => {
      const change = record(entry)
      const stat = battleStats[reference(change.stat)?.name ?? '']
      const amount = boundedInteger(change.change, -6, 6)
      return stat && amount ? [{ stat, change: amount }] : []
    }),
    descriptions,
  }
}

export async function loadBattleRoster(team: Team, signal?: AbortSignal): Promise<BattlePokemon[]> {
  return Promise.all(
    team.members.map(async (member) => {
      const [pokemon, ...moves] = await Promise.all([
        apiFetch<unknown>(`pokemon/${member.pokemon}`, signal).then(parseTeamPokemon),
        ...member.moves.map((move) => apiFetch<unknown>(`move/${move}`, signal).then(parseBattleMove)),
      ])
      const abilityName = pokemon.abilities.includes(member.ability) ? member.ability : pokemon.abilities[0]
      const fallback = (name: string): BattleResource => ({ name, names: [], descriptions: [], sprite: null })
      const [ability, item] = await Promise.all([
        apiFetch<unknown>(`ability/${abilityName}`, signal)
          .then(parseBattleAbility)
          .catch(() => fallback(abilityName)),
        member.item
          ? apiFetch<unknown>(`item/${member.item}`, signal)
              .then(parseBattleItem)
              .catch(() => fallback(member.item))
          : Promise.resolve(null),
      ])
      return createBattlePokemon(member, pokemon, moves, { ability, item })
    }),
  )
}
