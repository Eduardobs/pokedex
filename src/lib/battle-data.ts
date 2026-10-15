import { apiFetch } from './api'
import { array, record, reference } from './resource-data'
import { parseTeamPokemon, type Team } from './teams'
import { BATTLE_TYPES, type BattleType } from './type-chart'
import { createBattlePokemon, type BattleMove, type BattlePokemon, type BattleStages } from './battle'

const battleStats: Record<string, keyof BattleStages> = {
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
}

const boundedInteger = (value: unknown, minimum: number, maximum: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum ? value : null

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
      return createBattlePokemon(member, pokemon, moves)
    }),
  )
}
