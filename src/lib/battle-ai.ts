import {
  currentBattleStats,
  legalBattleMoveIndexes,
  possibleBattleStats,
  type BattleChoice,
  type BattleField,
  type BattleMove,
  type BattlePokemon,
  type BattleState,
} from './battle'
import { supplementalMoveEffect } from './battle-move-effects'
import { getDamageMultiplier, type BattleType } from './type-chart'

export const BATTLE_DIFFICULTIES = ['very-easy', 'easy', 'medium', 'hard', 'very-hard', 'expert'] as const
export type BattleDifficulty = (typeof BATTLE_DIFFICULTIES)[number]

// This projection is the information boundary. Scoring never receives the player's
// team builds, selected action, unrevealed moves, exact stats, ability or held item.
type ObservedPokemon = {
  types: BattleType[]
  hp: number
  stats: number[]
  status: BattlePokemon['status']
  stages: BattlePokemon['stages']
  moves: BattleMove[]
}
const typesOf = (pokemon: BattlePokemon): BattleType[] =>
  (pokemon.terastallized ? [pokemon.member.tera] : pokemon.pokemon.types) as BattleType[]
const multiplier = (type: BattleType, types: BattleType[]) =>
  types.reduce((value, target) => value * getDamageMultiplier(type, target), 1)
const stage = (value: number) => (value >= 0 ? (2 + value) / 2 : 2 / (2 - value))
function observe(pokemon: BattlePokemon): ObservedPokemon {
  return {
    types: typesOf(pokemon),
    hp: Math.ceil((pokemon.hp / pokemon.maxHp) * 100) / 100,
    stats: possibleBattleStats(pokemon.pokemon, pokemon.member.level).map(([min, max]) => (min + max) / 2),
    status: pokemon.status,
    stages: { ...pokemon.stages },
    moves: pokemon.moves.filter(({ data }) => pokemon.revealedMoves.includes(data.name)).map(({ data }) => data),
  }
}
const pivots = new Set([
  'u-turn',
  'volt-switch',
  'flip-turn',
  'parting-shot',
  'teleport',
  'chilly-reception',
  'baton-pass',
])
const hazardNames = {
  'stealth-rock': 'stealthRock',
  spikes: 'spikes',
  'toxic-spikes': 'toxicSpikes',
  'sticky-web': 'stickyWeb',
} as const

function damageScore(
  own: BattlePokemon,
  move: BattleMove,
  foe: ObservedPokemon,
  field: BattleField,
  detailed: boolean,
) {
  const effectiveness = multiplier(move.type, foe.types)
  if (!effectiveness || move.damageClass === 'status') return 0
  const stab = own.pokemon.types.includes(move.type)
    ? own.terastallized && own.member.tera === move.type
      ? 2
      : 1.5
    : own.terastallized && own.member.tera === move.type
      ? 1.5
      : 1
  if (!detailed) return ((move.power ?? 50) * stab * effectiveness) / 2
  const stats = currentBattleStats(own)
  const physical = move.damageClass === 'physical'
  const attack = stats[physical ? 1 : 3]
  const defense = foe.stats[physical ? 2 : 4] * stage(foe.stages[physical ? 'defense' : 'specialDefense'])
  let damage =
    ((((2 * own.member.level) / 5 + 2) * (move.power ?? 50) * attack) / defense / 50 + 2) * stab * effectiveness
  const effect = supplementalMoveEffect(move.name)
  if (effect?.kind === 'fixed-damage') {
    damage =
      effect.amount === 'level'
        ? own.member.level
        : effect.amount === 'half-current-hp'
          ? (foe.stats[0] * foe.hp) / 2
          : Math.max(0, foe.stats[0] * foe.hp - own.hp)
    return (damage / foe.stats[0]) * 100
  }
  if (field.weather === 'sun') damage *= move.type === 'fire' ? 1.5 : move.type === 'water' ? 0.5 : 1
  if (field.weather === 'rain') damage *= move.type === 'water' ? 1.5 : move.type === 'fire' ? 0.5 : 1
  return (damage / foe.stats[0]) * 100
}

function incomingThreat(own: BattlePokemon, foe: ObservedPokemon, detailed: boolean, tera = false) {
  const types = tera ? [own.member.tera as BattleType] : typesOf(own)
  // Before attacks are revealed, type matchups are a prior, never a guessed moveset.
  if (!detailed || !foe.moves.some((move) => move.damageClass !== 'status')) {
    return Math.max(...foe.types.map((type) => multiplier(type, types))) * 25
  }
  return Math.max(
    0,
    ...foe.moves.map((move) => {
      if (move.damageClass === 'status') return 0
      if (move.type === 'ground' && own.ability.name === 'levitate') return 0
      const physical = move.damageClass === 'physical'
      const stats = currentBattleStats(own)
      return (
        ((move.power ?? 50) *
          multiplier(move.type, types) *
          (foe.types.includes(move.type) ? 1.5 : 1) *
          foe.stats[physical ? 1 : 3] *
          stage(foe.stages[physical ? 'attack' : 'specialAttack'])) /
        stats[physical ? 2 : 4] /
        3
      )
    }),
  )
}

export function chooseBattleOpponentAction(
  state: BattleState,
  difficulty: BattleDifficulty,
  random: () => number,
): BattleChoice {
  const rank = BATTLE_DIFFICULTIES.indexOf(difficulty)
  const side = state.opponent
  const own = side.roster[side.active]
  const forced = state.phase === 'opponent-switch' || own.hp <= 0
  const switches = side.roster.flatMap((pokemon, index) => (index !== side.active && pokemon.hp > 0 ? [index] : []))
  const legal = legalBattleMoveIndexes(own)
  // Beginner levels avoid voluntary pivot moves too, unless no legal alternative remains.
  const simpleMoves = rank <= 1 ? legal.filter((index) => !pivots.has(own.moves[index].data.name)) : legal
  const moves = simpleMoves.length ? simpleMoves : legal
  const pick = (indexes: number[]) => indexes[Math.min(indexes.length - 1, Math.floor(random() * indexes.length))] ?? 0
  if (rank === 0) return forced ? { kind: 'switch', index: pick(switches) } : { kind: 'move', index: pick(moves) }
  if (!forced && (own.recharging || own.chargingMoveIndex !== undefined))
    return { kind: 'move', index: own.chargingMoveIndex ?? 0 }
  const foe = observe(state.player.roster[state.player.active])
  const detailed = rank >= 3
  const threat = incomingThreat(own, foe, detailed)
  const scoreMove = (pokemon: BattlePokemon, move: BattleMove) => {
    let score = damageScore(pokemon, move, foe, state.field, rank >= 2)
    const accuracy = (move.accuracy ?? 100) / 100
    // Hard takes more accuracy risks; higher levels favor expected value.
    score *= rank === 3 ? Math.sqrt(accuracy) : accuracy
    if (rank >= 2) {
      if (score >= foe.hp * 100) score += 35
      if (move.healing && !pokemon.volatile['heal-block'])
        score += Math.min(move.healing, (1 - pokemon.hp / pokemon.maxHp) * 100) * 1.2
      if (move.ailment && !foe.status && multiplier(move.type, foe.types) > 0) {
        const immune =
          (['poison', 'badly-poisoned'].includes(move.ailment) &&
            foe.types.some((type) => type === 'poison' || type === 'steel')) ||
          (move.ailment === 'burn' && foe.types.includes('fire')) ||
          (move.ailment === 'paralysis' && foe.types.includes('electric'))
        if (!immune) score += 22 * (move.damageClass === 'status' ? accuracy : move.ailmentChance / 100)
      }
    }
    if (rank >= 3) {
      for (const change of move.statChanges) {
        const self = move.target === 'user'
        const current = self ? pokemon.stages[change.stat] : foe.stages[change.stat]
        if ((self && change.change > 0 && current < 6) || (!self && change.change < 0 && current > -6))
          score += Math.abs(change.change) * 12 * (pokemon.hp / pokemon.maxHp)
      }
      const faster =
        currentBattleStats(pokemon)[5] > foe.stats[5] * stage(foe.stages.speed) * (foe.status === 'paralysis' ? 0.5 : 1)
      if (move.priority > 0 && (!faster || state.field.trickRoomTurns > 0) && score > 0) score += 14
      if (pivots.has(move.name) && switches.length && threat > 30) score += 16
    }
    if (rank >= 4) {
      const effect = supplementalMoveEffect(move.name)
      if (move.name in hazardNames) {
        const key = hazardNames[move.name as keyof typeof hazardNames]
        const limit = key === 'spikes' ? 3 : key === 'toxicSpikes' ? 2 : 1
        if (Number(state.player.hazards[key]) < limit) score += 28
      }
      if (
        ['rapid-spin', 'mortal-spin', 'defog', 'tidy-up'].includes(move.name) &&
        Object.values(side.hazards).some(Boolean)
      )
        score += 38
      if (effect?.kind === 'cure-team-status')
        score += side.roster.filter((entry) => entry.hp > 0 && entry.status).length * 22
      if (effect?.kind === 'set-side-condition') {
        const key = {
          reflect: 'reflect',
          'light-screen': 'lightScreen',
          'aurora-veil': 'auroraVeil',
          tailwind: 'tailwind',
          safeguard: 'safeguard',
          'crafty-shield': 'craftyShield',
        } as const
        if (
          !side.conditions[key[effect.condition]] &&
          (!effect.requiresWeather || state.field.weather === effect.requiresWeather)
        )
          score += 30
      }
      if (effect?.kind === 'reset-stages' && Object.values(foe.stages).some((value) => value >= 2)) score += 40
      if (effect?.kind === 'set-weather' && state.field.weather !== effect.weather) {
        const favored = effect.weather === 'sun' ? 'fire' : effect.weather === 'rain' ? 'water' : null
        if (pokemon.moves.some(({ data }) => data.type === favored)) score += 25
      }
      if (
        effect?.kind === 'set-trick-room' &&
        !state.field.trickRoomTurns &&
        currentBattleStats(pokemon)[5] < foe.stats[5]
      )
        score += 30
      if (effect?.kind === 'substitute' && !pokemon.substituteHp && pokemon.hp > pokemon.maxHp / 2 && threat < 25)
        score += 25
      if (move.damageClass === 'status' && !move.healing && threat > (pokemon.hp / pokemon.maxHp) * 100) score -= 30
    }
    if (rank === 5 && move.damageClass !== 'status') {
      // Hedge against already revealed reserves, without inspecting unknown slots.
      const known = state.player.roster
        .filter((entry, index) => index !== state.player.active && entry.hasEnteredBattle)
        .map(observe)
        .filter((entry) => entry.hp > 0)
      if (known.length)
        score =
          score * 0.85 + Math.min(...known.map((entry) => damageScore(pokemon, move, entry, state.field, true))) * 0.15
      if (
        state.player.conditions[move.damageClass === 'physical' ? 'reflect' : 'lightScreen'] ||
        state.player.conditions.auroraVeil
      )
        score *= 0.5
    }
    return score
  }
  const switchScore = (index: number) => {
    const candidate = side.roster[index]
    const attack = Math.max(
      0,
      ...legalBattleMoveIndexes(candidate).map((moveIndex) => scoreMove(candidate, candidate.moves[moveIndex].data)),
    )
    let cost = 0
    if (rank >= 4 && candidate.item?.name !== 'heavy-duty-boots' && candidate.ability.name !== 'magic-guard') {
      if (side.hazards.stealthRock) cost += 12.5 * multiplier('rock', typesOf(candidate))
      if (!typesOf(candidate).includes('flying') && candidate.ability.name !== 'levitate')
        cost += side.hazards.spikes * 8 + side.hazards.toxicSpikes * 8 + (side.hazards.stickyWeb ? 8 : 0)
      if (cost >= (candidate.hp / candidate.maxHp) * 100) return -1000
    }
    return attack - incomingThreat(candidate, foe, detailed) - cost + (candidate.hp / candidate.maxHp) * 10
  }
  if (forced)
    return {
      kind: 'switch',
      index:
        rank === 1
          ? pick(switches)
          : switches.reduce((best, index) => (switchScore(index) > switchScore(best) ? index : best), switches[0] ?? 0),
    }
  const options: { choice: BattleChoice; score: number }[] = moves.map((index) => ({
    choice: { kind: 'move', index },
    score: scoreMove(own, own.moves[index].data),
  }))
  if (rank >= 2 && !own.volatile.bound && !own.volatile.ingrain && !own.volatile.octolock) {
    for (const index of switches)
      options.push({ choice: { kind: 'switch', index }, score: switchScore(index) + threat - (rank >= 4 ? 28 : 40) })
  }
  if (!options.length) return { kind: 'move', index: 0 }
  // Bounded variation keeps stronger choices dominant while avoiding a fixed script.
  const noise = rank === 1 ? 45 : rank === 2 ? 12 : rank === 3 ? 22 : rank === 4 ? 7 : 3
  const best = options
    .map((option) => ({ ...option, score: option.score + random() * noise }))
    .reduce((a, b) => (b.score > a.score ? b : a)).choice
  if (best.kind === 'move' && rank >= 3 && !own.terastallized) {
    const defensiveGain = threat - incomingThreat(own, foe, detailed, true)
    const transformed = { ...own, terastallized: true }
    const move = own.moves[best.index].data
    const offensiveGain = scoreMove(transformed, move) - scoreMove(own, move)
    // Tera resolves after this turn, so value it for subsequent turns only.
    best.tera = defensiveGain + offensiveGain > 18 && own.hp / own.maxHp > 0.25
  }
  return best
}
