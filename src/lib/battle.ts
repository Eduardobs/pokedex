import { chooseBattleOpponentAction, type BattleDifficulty } from './battle-ai'
import { getDamageMultiplier, type BattleType } from './type-chart'
import { calculatedCoreStats, calculatedStats, type Stats, type Team, type TeamMember, type TeamPokemon } from './teams'
import { supplementalMoveEffect } from './battle-move-effects'

export type BattleMove = {
  name: string
  type: BattleType
  damageClass: 'physical' | 'special' | 'status'
  power: number | null
  accuracy: number | null
  priority: number
  pp: number
  target: string
  healing: number
  drain: number
  ailment: string | null
  ailmentChance: number
  effectChance: number | null
  statChanges: { stat: keyof BattleStages; change: number }[]
  descriptions?: { language: string; text: string }[]
}

export type BattleStages = {
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}
export type BattleStatus = 'burn' | 'freeze' | 'paralysis' | 'poison' | 'badly-poisoned' | 'sleep' | null
export type BattleVolatileStatus = 'attraction' | 'confusion' | 'curse'
export type BattleVolatileCondition =
  | 'aqua-ring'
  | 'ingrain'
  | 'magnet-rise'
  | 'bound'
  | 'yawn'
  | 'heal-block'
  | 'disable'
  | 'nightmare'
  | 'leech-seed'
  | 'octolock'
  | 'salt-cure'
  | 'syrupy'
  | 'tar-shot'
  | 'telekinesis'
  | 'throat-chop'
  | 'torment'
  | 'smack-down'
  | 'protect'
  | 'flinch'
export type BattlePokemon = {
  chargingMoveIndex?: number
  recharging?: boolean
  member: TeamMember
  pokemon: TeamPokemon
  originalStats: Stats
  stats: Stats
  ability: BattleResource
  item: BattleResource | null
  maxHp: number
  hp: number
  substituteHp: number
  moves: { data: BattleMove; pp: number }[]
  revealedMoves: string[]
  stages: BattleStages
  status: BattleStatus
  sleepTurns: number
  toxicTurns: number
  confusionTurns: number
  attracted: boolean
  cursed: boolean
  volatile: Partial<Record<BattleVolatileCondition, number>>
  disabledMoveIndex: number | null
  lastMoveIndex: number | null
  encoreTurns: number
  encoreMoveIndex: number | null
  tauntTurns: number
  protectStreak: number
  terastallized: boolean
  hasEnteredBattle: boolean
}
export type BattleResource = {
  name: string
  names: { name: string; language: { name: string } }[]
  descriptions: { effect: string; language: { name: string } }[]
  sprite: string | null
}
export type BattleStatRanges = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
]
export type BattleHazards = {
  stealthRock: boolean
  spikes: number
  toxicSpikes: number
  stickyWeb: boolean
}
export type BattleSideConditions = {
  reflect: number
  lightScreen: number
  auroraVeil: number
  tailwind: number
  safeguard: number
  craftyShield: number
}
export type BattleWeather = 'rain' | 'sun' | 'sandstorm' | 'snow'
export type BattleTerrain = 'electric' | 'grassy' | 'misty' | 'psychic'
export type BattleField = {
  weather: BattleWeather | null
  weatherTurns: number
  terrain: BattleTerrain | null
  terrainTurns: number
  trickRoomTurns: number
}
export type BattleSide = {
  team: Team
  roster: BattlePokemon[]
  active: number
  hazards: BattleHazards
  conditions: BattleSideConditions
  futureSight?: { turns: number; attacker: BattlePokemon; move: BattleMove }
  switchRequested: boolean
}
export type BattlePhase = 'choice' | 'player-switch' | 'opponent-switch' | 'won' | 'lost'
export type BattleState = {
  turn: number
  player: BattleSide
  opponent: BattleSide
  field: BattleField
  phase: BattlePhase
}
export type BattleChoice = { kind: 'move'; index: number; tera?: boolean } | { kind: 'switch'; index: number }
export type BattleTurnStep = {
  state: BattleState
  events: BattleEvent[]
  action: { side: 'player' | 'opponent'; move: string | null } | null
}
export type BattleEvent =
  | { type: 'charging' | 'recharging' | 'futureSight'; pokemon: string }
  | { type: 'turn'; turn: number }
  | { type: 'move'; side: 'player' | 'opponent'; pokemon: string; move: string }
  | { type: 'switch'; side: 'player' | 'opponent'; pokemon: string }
  | { type: 'tera'; side: 'player' | 'opponent'; pokemon: string; tera: string }
  | { type: 'miss'; pokemon: string }
  | { type: 'immune'; pokemon: string }
  | { type: 'damage'; pokemon: string; amount: number; effectiveness: number; critical: boolean }
  | { type: 'hazardSet'; side: 'player' | 'opponent'; hazard: BattleHazard }
  | { type: 'hazardDamage'; pokemon: string; hazard: BattleHazard; amount: number }
  | { type: 'hazardsCleared'; side: 'player' | 'opponent' }
  | { type: 'heal'; pokemon: string; amount: number }
  | { type: 'substituteSet'; pokemon: string; hp: number }
  | { type: 'substituteDamage'; pokemon: string; amount: number; broken: boolean }
  | { type: 'itemRemoved'; pokemon: string; item: string }
  | {
      type: 'status'
      pokemon: string
      status: Exclude<BattleStatus, null> | BattleVolatileStatus | BattleVolatileCondition
    }
  | {
      type: 'statusCured'
      pokemon: string
      status: Exclude<BattleStatus, null> | BattleVolatileStatus | BattleVolatileCondition
    }
  | { type: 'statusDamage'; pokemon: string; status: 'burn' | 'poison' | 'badly-poisoned' | 'curse'; amount: number }
  | { type: 'weatherDamage'; pokemon: string; weather: 'sandstorm'; amount: number }
  | { type: 'asleep'; pokemon: string }
  | { type: 'wake'; pokemon: string }
  | { type: 'thaw'; pokemon: string }
  | { type: 'ability'; pokemon: string; ability: string }
  | { type: 'stage'; pokemon: string; stat: keyof BattleStages; change: number }
  | { type: 'encore'; pokemon: string; move: string; turns: number }
  | { type: 'taunt'; pokemon: string }
  | { type: 'stagesReset'; pokemon: string }
  | { type: 'teamStatusCured'; side: 'player' | 'opponent' }
  | { type: 'fieldSet'; field: BattleWeather | BattleTerrain | 'trick-room'; turns: number }
  | { type: 'fieldEnded'; field: BattleWeather | BattleTerrain | 'trick-room' }
  | { type: 'sideConditionSet'; side: 'player' | 'opponent'; condition: keyof BattleSideConditions; turns: number }
  | { type: 'sideConditionEnded'; side: 'player' | 'opponent'; condition: keyof BattleSideConditions }
  | { type: 'fieldBlocked'; pokemon: string; field: BattleTerrain }
  | { type: 'protected'; pokemon: string }
  | { type: 'failed'; pokemon: string }
  | { type: 'faint'; pokemon: string }
  | { type: 'win'; side: 'player' | 'opponent' }

type RandomSource = () => number
type BattleHazard = 'stealth-rock' | 'spikes' | 'toxic-spikes' | 'sticky-web'
type MoveOutcome = { hit: boolean; succeeded: boolean; hitSubstitute?: boolean } | null

const emptyStages = (): BattleStages => ({ attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 })
const emptyHazards = (): BattleHazards => ({ stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false })
const emptySideConditions = (): BattleSideConditions => ({
  reflect: 0,
  lightScreen: 0,
  auroraVeil: 0,
  tailwind: 0,
  safeguard: 0,
  craftyShield: 0,
})
const emptyField = (): BattleField => ({
  weather: null,
  weatherTurns: 0,
  terrain: null,
  terrainTurns: 0,
  trickRoomTurns: 0,
})
const stageMultiplier = (stage: number) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage))
const moveTypes = new Set<BattleType>([
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
])
const hazardMoves: Partial<Record<string, BattleHazard>> = {
  'stealth-rock': 'stealth-rock',
  spikes: 'spikes',
  'toxic-spikes': 'toxic-spikes',
  'sticky-web': 'sticky-web',
  'stone-axe': 'stealth-rock',
  'ceaseless-edge': 'spikes',
}
const afterHitHazardMoves = new Set(['stone-axe', 'ceaseless-edge'])
const pivotMoves = new Set([
  'u-turn',
  'volt-switch',
  'flip-turn',
  'parting-shot',
  'teleport',
  'chilly-reception',
  'baton-pass',
])
const forceSwitchMoves = new Set(['circle-throw', 'dragon-tail', 'roar', 'whirlwind'])
const ownHazardRemovalMoves = new Set(['rapid-spin', 'mortal-spin', 'tidy-up'])
// PokéAPI exposes only the resulting stage changes, not which combatant receives
// each one. These damaging moves lower the user despite targeting an opponent.
const selfStatChangeMoves = new Set([
  'close-combat',
  'draco-meteor',
  'fleur-cannon',
  'hammer-arm',
  'headlong-rush',
  'ice-hammer',
  'leaf-storm',
  'make-it-rain',
  'overheat',
  'psycho-boost',
  'scale-shot',
  'spin-out',
  'superpower',
  'v-create',
])
// These moves raise a selected opponent's stage rather than the user's.
const targetStatChangeMoves = new Set(['decorate', 'flatter', 'swagger'])
const itemRemovalMoves = new Set(['corrosive-gas', 'knock-off'])
const badlyPoisoningMoves = new Set(['toxic', 'poison-fang'])
const sleepUsableMoves = new Set(['sleep-talk', 'snore'])
const soundMoves = new Set([
  'boomburst',
  'bug-buzz',
  'chatter',
  'clangorous-soul',
  'clangorous-soulblaze',
  'clanging-scales',
  'disarming-voice',
  'echoed-voice',
  'eerie-spell',
  'growl',
  'hyper-voice',
  'noble-roar',
  'parting-shot',
  'perish-song',
  'rellic-song',
  'roar',
  'round',
  'screech',
  'sing',
  'snarl',
  'snore',
  'sparkling-aria',
  'supersonic',
  'torch-song',
  'uproar',
])
const selfVolatileConditions = new Set<BattleVolatileCondition>(['aqua-ring', 'ingrain', 'magnet-rise'])
const freezeThawingMoves = new Set([
  'fusion-flare',
  'flame-wheel',
  'flare-blitz',
  'sacred-fire',
  'scald',
  'steam-eruption',
])
const entryStageAbilities: Partial<Record<string, keyof BattleStages>> = {
  'intrepid-sword': 'attack',
  'dauntless-shield': 'defense',
}
const entryWeatherAbilities: Partial<Record<string, BattleWeather>> = {
  drizzle: 'rain',
  drought: 'sun',
  'orichalcum-pulse': 'sun',
  'sand-stream': 'sandstorm',
  'snow-warning': 'snow',
}
const entryTerrainAbilities: Partial<Record<string, BattleTerrain>> = {
  'electric-surge': 'electric',
  'hadron-engine': 'electric',
  'grassy-surge': 'grassy',
  'misty-surge': 'misty',
  'psychic-surge': 'psychic',
}

function changesApplyToUser(move: BattleMove) {
  return move.target === 'user' || selfStatChangeMoves.has(move.name)
}

function changesApplyToTarget(move: BattleMove) {
  return targetStatChangeMoves.has(move.name)
}

export function isBattleReadyTeam(team: Team) {
  return (
    team.members.length === 6 &&
    team.members.every((member) => member.moves.length === 4 && member.moves.every(Boolean))
  )
}

const fallbackResource = (name: string): BattleResource => ({ name, names: [], descriptions: [], sprite: null })

export function createBattlePokemon(
  member: TeamMember,
  pokemon: TeamPokemon,
  moves: BattleMove[],
  details: Partial<Pick<BattlePokemon, 'ability' | 'item'>> = {},
): BattlePokemon {
  if (moves.length !== 4 || moves.some((move) => !moveTypes.has(move.type))) throw new Error('Invalid battle moves.')
  const ability = pokemon.abilities.includes(member.ability) ? member.ability : pokemon.abilities[0]
  // Entry boosts are represented by battle stages so they correctly disappear on
  // switching out and trigger again every time the Pokémon enters.
  const stats = calculatedStats(pokemon, {
    ...member,
    abilityActive: entryStageAbilities[ability] ? false : member.abilityActive,
  })
  return {
    member,
    pokemon,
    originalStats: calculatedCoreStats(pokemon, member),
    stats,
    ability: details.ability ?? fallbackResource(ability),
    item: details.item ?? (member.item ? fallbackResource(member.item) : null),
    maxHp: stats[0],
    hp: stats[0],
    substituteHp: 0,
    moves: moves.map((data) => ({ data, pp: data.pp })),
    revealedMoves: [],
    stages: emptyStages(),
    status: null,
    sleepTurns: 0,
    toxicTurns: 0,
    confusionTurns: 0,
    attracted: false,
    cursed: false,
    volatile: {},
    disabledMoveIndex: null,
    lastMoveIndex: null,
    encoreTurns: 0,
    encoreMoveIndex: null,
    tauntTurns: 0,
    protectStreak: 0,
    terastallized: false,
    hasEnteredBattle: false,
  }
}

/** Returns the legal in-battle stat bounds when an opponent's training is unknown. */
export function possibleBattleStats(pokemon: TeamPokemon, level: number): BattleStatRanges {
  const boundedLevel = Math.max(1, Math.min(100, Math.trunc(level)))
  return pokemon.stats.map((base, index) => {
    if (index === 0 && pokemon.name === 'shedinja') return [1, 1] as const
    const minimum = Math.floor((2 * base * boundedLevel) / 100) + (index === 0 ? boundedLevel + 10 : 5)
    const maximumBase =
      Math.floor(((2 * base + 31 + Math.floor(252 / 4)) * boundedLevel) / 100) + (index === 0 ? boundedLevel + 10 : 5)
    return index === 0
      ? ([minimum, maximumBase] as const)
      : ([Math.floor(minimum * 0.9), Math.floor(maximumBase * 1.1)] as const)
  }) as BattleStatRanges
}

export function createBattleState(
  playerTeam: Team,
  player: BattlePokemon[],
  opponentTeam: Team,
  opponent: BattlePokemon[],
): BattleState {
  if (
    !isBattleReadyTeam(playerTeam) ||
    !isBattleReadyTeam(opponentTeam) ||
    player.length !== 6 ||
    opponent.length !== 6
  )
    throw new Error('Battle requires two complete teams.')
  const state: BattleState = {
    turn: 1,
    player: {
      team: playerTeam,
      roster: player.map((pokemon, index) => ({ ...pokemon, hasEnteredBattle: index === 0 })),
      active: 0,
      hazards: emptyHazards(),
      conditions: emptySideConditions(),
      switchRequested: false,
    },
    opponent: {
      team: opponentTeam,
      roster: opponent.map((pokemon, index) => ({ ...pokemon, hasEnteredBattle: index === 0 })),
      active: 0,
      hazards: emptyHazards(),
      conditions: emptySideConditions(),
      switchRequested: false,
    },
    field: emptyField(),
    phase: 'choice',
  }
  applyEntryAbility(state.player, state.opponent, state.field, [])
  applyEntryAbility(state.opponent, state.player, state.field, [])
  return state
}

function cloneState(state: BattleState): BattleState {
  const cloneSide = (side: BattleSide): BattleSide => ({
    ...side,
    futureSight: side.futureSight ? { ...side.futureSight } : undefined,
    hazards: { ...side.hazards },
    conditions: { ...side.conditions },
    roster: side.roster.map((pokemon) => ({
      ...pokemon,
      member: { ...pokemon.member },
      moves: pokemon.moves.map((move) => ({
        ...move,
        data: { ...move.data, statChanges: [...move.data.statChanges] },
      })),
      revealedMoves: [...pokemon.revealedMoves],
      stages: { ...pokemon.stages },
      volatile: { ...pokemon.volatile },
    })),
  })
  return { ...state, field: { ...state.field }, player: cloneSide(state.player), opponent: cloneSide(state.opponent) }
}

function effectiveTypes(pokemon: BattlePokemon) {
  return pokemon.terastallized ? [pokemon.member.tera] : pokemon.pokemon.types
}

function isGrounded(pokemon: BattlePokemon) {
  if (pokemon.volatile['smack-down'] || pokemon.volatile.telekinesis) return true
  if (pokemon.volatile['magnet-rise']) return false
  return !effectiveTypes(pokemon).includes('flying') && pokemon.ability.name !== 'levitate'
}

export function battleMoveEffectiveness(move: BattleMove, defender: BattlePokemon) {
  const typeEffectiveness = effectiveTypes(defender).reduce(
    (value, type) => value * getDamageMultiplier(move.type, type as BattleType),
    1,
  )
  return typeEffectiveness * (move.type === 'fire' && defender.volatile['tar-shot'] ? 2 : 1)
}

export function battleSameTypeAttackBonus(attacker: BattlePokemon, moveType: BattleType) {
  const matchesOriginalType = attacker.pokemon.types.includes(moveType)
  const matchesTeraType = attacker.terastallized && attacker.member.tera === moveType
  if (matchesTeraType) return matchesOriginalType ? 2 : 1.5
  return matchesOriginalType ? 1.5 : 1
}

/** Returns the current stats used by the battle after stage and status modifiers. */
export function currentBattleStats(pokemon: BattlePokemon): Stats {
  const ability = pokemon.ability.name
  const hasStatus = pokemon.status !== null
  const statusAbilityMultiplier = (matches: boolean, factor: number) =>
    hasStatus && !pokemon.member.abilityActive && matches ? factor : 1
  const attack =
    pokemon.stats[1] *
    statusAbilityMultiplier(ability === 'guts' || (ability === 'toxic-boost' && isPoisoned(pokemon)), 1.5) *
    (pokemon.status === 'burn' && ability !== 'guts' ? 0.5 : 1)
  const defense = pokemon.stats[2] * statusAbilityMultiplier(ability === 'marvel-scale', 1.5)
  const specialAttack =
    pokemon.stats[3] * statusAbilityMultiplier(ability === 'flare-boost' && pokemon.status === 'burn', 2)
  const speedMultiplier = statusAbilityMultiplier(ability === 'quick-feet', 1.5)
  return [
    pokemon.stats[0],
    Math.floor(attack * stageMultiplier(pokemon.stages.attack)),
    Math.floor(defense * stageMultiplier(pokemon.stages.defense)),
    Math.floor(specialAttack * stageMultiplier(pokemon.stages.specialAttack)),
    Math.floor(pokemon.stats[4] * stageMultiplier(pokemon.stages.specialDefense)),
    Math.floor(
      pokemon.stats[5] *
        stageMultiplier(pokemon.stages.speed) *
        speedMultiplier *
        (pokemon.status === 'paralysis' && ability !== 'quick-feet' ? 0.5 : 1),
    ),
  ]
}

function isPoisoned(pokemon: BattlePokemon) {
  return pokemon.status === 'poison' || pokemon.status === 'badly-poisoned'
}

function isDamagingStatus(status: BattleStatus): status is 'burn' | 'poison' | 'badly-poisoned' {
  return status === 'burn' || status === 'poison' || status === 'badly-poisoned'
}

function addHazard(side: BattleSide, hazard: BattleHazard) {
  switch (hazard) {
    case 'stealth-rock':
      if (side.hazards.stealthRock) return false
      side.hazards.stealthRock = true
      return true
    case 'spikes':
      if (side.hazards.spikes >= 3) return false
      side.hazards.spikes += 1
      return true
    case 'toxic-spikes':
      if (side.hazards.toxicSpikes >= 2) return false
      side.hazards.toxicSpikes += 1
      return true
    case 'sticky-web':
      if (side.hazards.stickyWeb) return false
      side.hazards.stickyWeb = true
      return true
  }
}

function clearHazards(side: BattleSide) {
  const cleared =
    side.hazards.stealthRock || side.hazards.spikes > 0 || side.hazards.toxicSpikes > 0 || side.hazards.stickyWeb
  side.hazards = emptyHazards()
  return cleared
}

function applyEntryHazards(side: BattleSide, pokemon: BattlePokemon, events: BattleEvent[]) {
  const damage = (hazard: BattleHazard, amount: number) => {
    if (amount <= 0 || pokemon.hp <= 0) return
    const applied = Math.min(pokemon.hp, amount)
    pokemon.hp -= applied
    events.push({ type: 'hazardDamage', pokemon: pokemon.pokemon.name, hazard, amount: applied })
  }
  if (side.hazards.stealthRock) {
    const effectiveness = effectiveTypes(pokemon).reduce(
      (value, type) => value * getDamageMultiplier('rock', type as BattleType),
      1,
    )
    damage('stealth-rock', Math.max(1, Math.floor((pokemon.maxHp * effectiveness) / 8)))
  }
  if (side.hazards.spikes > 0 && isGrounded(pokemon)) {
    const fractions = [0, 8, 6, 4]
    damage('spikes', Math.max(1, Math.floor(pokemon.maxHp / fractions[side.hazards.spikes])))
  }
  if (pokemon.hp <= 0) return
  if (side.hazards.toxicSpikes > 0 && isGrounded(pokemon)) {
    if (effectiveTypes(pokemon).includes('poison')) side.hazards.toxicSpikes = 0
    else if (!effectiveTypes(pokemon).includes('steel') && !pokemon.status) {
      pokemon.status = side.hazards.toxicSpikes >= 2 ? 'badly-poisoned' : 'poison'
      pokemon.toxicTurns = 0
      events.push({ type: 'status', pokemon: pokemon.pokemon.name, status: pokemon.status })
    }
  }
  if (side.hazards.stickyWeb && isGrounded(pokemon)) {
    const previous = pokemon.stages.speed
    pokemon.stages.speed = Math.max(-6, previous - 1)
    if (pokemon.stages.speed !== previous)
      events.push({
        type: 'stage',
        pokemon: pokemon.pokemon.name,
        stat: 'speed',
        change: pokemon.stages.speed - previous,
      })
  }
}

function speed(side: BattleSide) {
  const pokemon = side.roster[side.active]
  return currentBattleStats(pokemon)[5] * (side.conditions.tailwind > 0 ? 2 : 1)
}

function confusionDamage(pokemon: BattlePokemon) {
  const stats = currentBattleStats(pokemon)
  const base = Math.floor((((2 * pokemon.member.level) / 5 + 2) * 40 * (stats[1] / Math.max(1, stats[2]))) / 50 + 2)
  return Math.max(1, base)
}

function canAct(pokemon: BattlePokemon, move: BattleMove, random: RandomSource, events: BattleEvent[]) {
  if (pokemon.volatile.flinch) {
    delete pokemon.volatile.flinch
    events.push({ type: 'failed', pokemon: pokemon.pokemon.name })
    return false
  }
  if (pokemon.status === 'sleep') {
    if (pokemon.sleepTurns > 0) {
      pokemon.sleepTurns -= 1
      events.push({ type: 'asleep', pokemon: pokemon.pokemon.name })
      if (sleepUsableMoves.has(move.name)) return true
      return false
    }
    pokemon.status = null
    events.push({ type: 'wake', pokemon: pokemon.pokemon.name })
  }
  if (pokemon.status === 'paralysis' && random() < 0.25) {
    events.push({ type: 'failed', pokemon: pokemon.pokemon.name })
    return false
  }
  if (pokemon.status === 'freeze') {
    if (freezeThawingMoves.has(move.name)) {
      pokemon.status = null
      events.push({ type: 'thaw', pokemon: pokemon.pokemon.name })
    } else if (random() >= 0.2) {
      events.push({ type: 'failed', pokemon: pokemon.pokemon.name })
      return false
    } else {
      pokemon.status = null
      events.push({ type: 'thaw', pokemon: pokemon.pokemon.name })
    }
  }
  if (pokemon.confusionTurns > 0) {
    pokemon.confusionTurns -= 1
    if (random() < 1 / 3) {
      const amount = Math.min(pokemon.hp, confusionDamage(pokemon))
      pokemon.hp -= amount
      events.push({ type: 'damage', pokemon: pokemon.pokemon.name, amount, effectiveness: 1, critical: false })
      if (pokemon.hp === 0) events.push({ type: 'faint', pokemon: pokemon.pokemon.name })
      if (pokemon.confusionTurns === 0)
        events.push({ type: 'statusCured', pokemon: pokemon.pokemon.name, status: 'confusion' })
      return false
    }
    if (pokemon.confusionTurns === 0)
      events.push({ type: 'statusCured', pokemon: pokemon.pokemon.name, status: 'confusion' })
  }
  if (pokemon.attracted && random() < 0.5) {
    events.push({ type: 'failed', pokemon: pokemon.pokemon.name })
    return false
  }
  return true
}

function applyEntryAbility(own: BattleSide, foe: BattleSide, field: BattleField, events: BattleEvent[]) {
  const pokemon = own.roster[own.active]
  if (!pokemon || pokemon.hp <= 0) return
  const ability = pokemon.ability.name
  const stage = entryStageAbilities[ability]
  const weather = entryWeatherAbilities[ability]
  const terrain = entryTerrainAbilities[ability]
  const activates = Boolean(stage || weather || terrain || ability === 'intimidate')
  if (!activates) return

  events.push({ type: 'ability', pokemon: pokemon.pokemon.name, ability })
  if (stage) {
    const previous = pokemon.stages[stage]
    pokemon.stages[stage] = Math.min(6, previous + 1)
    if (pokemon.stages[stage] !== previous)
      events.push({
        type: 'stage',
        pokemon: pokemon.pokemon.name,
        stat: stage,
        change: pokemon.stages[stage] - previous,
      })
  }
  if (weather) {
    field.weather = weather
    field.weatherTurns = 5
    events.push({ type: 'fieldSet', field: weather, turns: field.weatherTurns })
  }
  if (terrain) {
    field.terrain = terrain
    field.terrainTurns = 5
    events.push({ type: 'fieldSet', field: terrain, turns: field.terrainTurns })
  }
  if (ability === 'intimidate') {
    const target = foe.roster[foe.active]
    if (!target || target.hp <= 0) return
    const previous = target.stages.attack
    target.stages.attack = Math.max(-6, previous - 1)
    if (target.stages.attack !== previous)
      events.push({
        type: 'stage',
        pokemon: target.pokemon.name,
        stat: 'attack',
        change: target.stages.attack - previous,
      })
  }
}

const chargingMoves = new Set([
  'fly',
  'dig',
  'dive',
  'bounce',
  'phantom-force',
  'shadow-force',
  'solar-beam',
  'solar-blade',
  'meteor-beam',
  'electro-shot',
  'geomancy',
  'skull-bash',
  'razor-wind',
  'sky-attack',
  'freeze-shock',
  'ice-burn',
])
const rechargeMoves = new Set([
  'hyper-beam',
  'giga-impact',
  'blast-burn',
  'hydro-cannon',
  'frenzy-plant',
  'rock-wrecker',
  'roar-of-time',
  'meteor-assault',
])
const chargeBoost = (name: string): keyof BattleStages | null =>
  name === 'skull-bash' ? 'defense' : ['meteor-beam', 'electro-shot'].includes(name) ? 'specialAttack' : null
function semiInvulnerableMove(pokemon: BattlePokemon) {
  return pokemon.chargingMoveIndex === undefined ? undefined : pokemon.moves[pokemon.chargingMoveIndex]?.data.name
}
function semiInvulnerableMultiplier(defender: BattlePokemon, move: BattleMove) {
  const charging = semiInvulnerableMove(defender)
  if (charging === 'fly' || charging === 'bounce')
    return ['thunder', 'hurricane', 'twister', 'gust', 'smack-down'].includes(move.name)
      ? ['twister', 'gust'].includes(move.name)
        ? 2
        : 1
      : 0
  if (charging === 'dig') return ['earthquake', 'magnitude'].includes(move.name) ? 2 : 0
  if (charging === 'dive') return ['surf', 'whirlpool'].includes(move.name) ? 2 : 0
  if (charging === 'phantom-force' || charging === 'shadow-force') return 0
  return 1
}

export function legalBattleMoveIndexes(pokemon: BattlePokemon) {
  if (pokemon.recharging) return []
  if (pokemon.chargingMoveIndex !== undefined) return [pokemon.chargingMoveIndex]
  return pokemon.moves.flatMap((move, index) => {
    if (move.pp <= 0) return []
    if (pokemon.encoreTurns > 0 && pokemon.encoreMoveIndex !== index) return []
    if (pokemon.tauntTurns > 0 && move.data.damageClass === 'status') return []
    if (pokemon.disabledMoveIndex === index && pokemon.volatile.disable) return []
    if (pokemon.volatile.torment && pokemon.lastMoveIndex === index) return []
    if (pokemon.volatile['throat-chop'] && soundMoves.has(move.data.name)) return []
    return [index]
  })
}

function selectedBattleMoveIndex(pokemon: BattlePokemon, requestedIndex: number) {
  if (pokemon.chargingMoveIndex !== undefined) return pokemon.chargingMoveIndex
  return pokemon.encoreTurns > 0 && pokemon.encoreMoveIndex !== null ? pokemon.encoreMoveIndex : requestedIndex
}

function tickMoveRestrictions(pokemon: BattlePokemon) {
  if (pokemon.encoreTurns > 0) {
    pokemon.encoreTurns -= 1
    const repeatedMove = pokemon.encoreMoveIndex === null ? null : pokemon.moves[pokemon.encoreMoveIndex]
    if (pokemon.encoreTurns === 0 || !repeatedMove || repeatedMove.pp <= 0) {
      pokemon.encoreTurns = 0
      pokemon.encoreMoveIndex = null
    }
  }
  if (pokemon.tauntTurns > 0) pokemon.tauntTurns -= 1
}

function fixedMoveDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  amount: 'level' | 'half-current-hp' | 'hp-difference',
) {
  if (amount === 'level') return attacker.member.level
  if (amount === 'half-current-hp') return Math.max(1, Math.floor(defender.hp / 2))
  return Math.max(0, defender.hp - attacker.hp)
}

function applyDirectMoveDamage(
  defender: BattlePokemon,
  damage: number,
  effectiveness: number,
  critical: boolean,
  events: BattleEvent[],
) {
  if (defender.substituteHp > 0) {
    const amount = Math.min(defender.substituteHp, damage)
    defender.substituteHp -= amount
    events.push({
      type: 'substituteDamage',
      pokemon: defender.pokemon.name,
      amount,
      broken: defender.substituteHp === 0,
    })
    return { amount, hitSubstitute: true }
  }
  defender.hp = Math.max(0, defender.hp - damage)
  events.push({ type: 'damage', pokemon: defender.pokemon.name, amount: damage, effectiveness, critical })
  return { amount: damage, hitSubstitute: false }
}

function solarMoveHasSun(attacker: BattlePokemon, defender: BattlePokemon, field: BattleField) {
  return (
    field.weather === 'sun' || attacker.ability.name === 'desolate-land' || defender.ability.name === 'desolate-land'
  )
}

function fieldPowerModifier(move: BattleMove, attacker: BattlePokemon, defender: BattlePokemon, field: BattleField) {
  let modifier = semiInvulnerableMultiplier(defender, move)
  if (['solar-beam', 'solar-blade'].includes(move.name) && field.weather && !solarMoveHasSun(attacker, defender, field))
    modifier *= 0.5
  if (field.weather === 'rain') modifier *= move.type === 'water' ? 1.5 : move.type === 'fire' ? 0.5 : 1
  if (field.weather === 'sun') modifier *= move.type === 'fire' ? 1.5 : move.type === 'water' ? 0.5 : 1
  if (isGrounded(attacker)) {
    if (field.terrain === 'electric' && move.type === 'electric') modifier *= 1.3
    if (field.terrain === 'grassy' && move.type === 'grass') modifier *= 1.3
    if (field.terrain === 'psychic' && move.type === 'psychic') modifier *= 1.3
  }
  if (isGrounded(defender) && field.terrain === 'misty' && move.type === 'dragon') modifier *= 0.5
  if (isGrounded(defender) && field.terrain === 'grassy' && ['earthquake', 'bulldoze', 'magnitude'].includes(move.name))
    modifier *= 0.5
  return modifier
}

function statusPreventedByTerrain(status: BattleStatus, target: BattlePokemon, field: BattleField) {
  if (!status || !isGrounded(target)) return false
  return field.terrain === 'misty' || (field.terrain === 'electric' && status === 'sleep')
}

function majorStatusImmune(
  status: Exclude<BattleStatus, null>,
  target: BattlePokemon,
  attacker: BattlePokemon,
  targetSide?: BattleSide,
  field?: BattleField,
) {
  const ability = target.ability.name
  if (
    targetSide?.conditions.safeguard ||
    ability === 'comatose' ||
    ability === 'purifying-salt' ||
    ability === 'shields-down' ||
    (ability === 'flower-veil' && effectiveTypes(target).includes('grass'))
  )
    return true
  if (ability === 'leaf-guard' && field?.weather === 'sun') return true
  if (status === 'burn')
    return (
      effectiveTypes(target).includes('fire') || ['thermal-exchange', 'water-bubble', 'water-veil'].includes(ability)
    )
  if (status === 'freeze') return effectiveTypes(target).includes('ice') || ability === 'magma-armor'
  if (status === 'paralysis') return effectiveTypes(target).includes('electric') || ability === 'limber'
  if (isPoisonStatus(status))
    return (
      ability === 'immunity' ||
      ability === 'poison-heal' ||
      ((effectiveTypes(target).includes('poison') || effectiveTypes(target).includes('steel')) &&
        attacker.ability.name !== 'corrosion')
    )
  return ['insomnia', 'vital-spirit', 'sweet-veil'].includes(ability)
}

function isPoisonStatus(status: Exclude<BattleStatus, null>) {
  return status === 'poison' || status === 'badly-poisoned'
}

function canApplyVolatileStatus(
  status: BattleVolatileStatus,
  attacker: BattlePokemon,
  target: BattlePokemon,
  targetSide: BattleSide,
  field: BattleField,
) {
  if (targetSide.conditions.safeguard || (field.terrain === 'misty' && isGrounded(target))) return false
  if (status === 'confusion') return target.confusionTurns === 0 && target.ability.name !== 'own-tempo'
  if (status === 'attraction')
    return (
      !target.attracted &&
      target.ability.name !== 'oblivious' &&
      attacker.member.gender !== 'none' &&
      target.member.gender !== 'none' &&
      attacker.member.gender !== target.member.gender
    )
  return !target.cursed && effectiveTypes(attacker).includes('ghost')
}

function applyMove(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  defendingSide: BattleSide,
  field: BattleField,
  moveSlot: number,
  random: RandomSource,
  events: BattleEvent[],
  skipActionCheck = false,
  delayed = false,
): MoveOutcome {
  const slot = attacker.moves[moveSlot]
  const releasing = attacker.chargingMoveIndex === moveSlot
  if (!slot || (!releasing && slot.pp <= 0) || attacker.hp <= 0 || defender.hp <= 0) return null
  if (!releasing) slot.pp -= 1
  const boost = chargeBoost(slot.data.name)
  const move = { ...slot.data, statChanges: boost ? [] : slot.data.statChanges }
  if (move.name === 'geomancy')
    move.statChanges = (['specialAttack', 'specialDefense', 'speed'] as const).map((stat) => ({
      stat,
      change: 2,
    }))
  const secondary = (
    { bounce: 'paralysis', 'freeze-shock': 'paralysis', 'ice-burn': 'burn', 'sky-attack': 'flinch' } as const
  )[move.name]
  if (secondary) {
    move.ailment = secondary
    move.ailmentChance = move.effectChance ?? 30
  }
  delete attacker.chargingMoveIndex
  const curse = supplementalMoveEffect(move.name)?.kind === 'curse'
  const ghostCurse = curse && effectiveTypes(attacker).includes('ghost')
  attacker.lastMoveIndex = moveSlot
  events.push({ type: 'move', side: 'player', pokemon: attacker.pokemon.name, move: move.name })
  if (!skipActionCheck && !canAct(attacker, move, random, events)) return { hit: false, succeeded: false }
  if (!delayed && move.name === 'future-sight') {
    if (defendingSide.futureSight) return { hit: true, succeeded: false }
    defendingSide.futureSight = {
      turns: 3,
      attacker: { ...attacker, stages: { ...attacker.stages }, moves: attacker.moves.map((slot) => ({ ...slot })) },
      move,
    }
    events.push({ type: 'futureSight', pokemon: defender.pokemon.name })
    return { hit: false, succeeded: true }
  }
  if (!releasing && chargingMoves.has(move.name)) {
    if (boost) {
      const change = Math.min(1, 6 - attacker.stages[boost])
      attacker.stages[boost] += change
      if (change) events.push({ type: 'stage', pokemon: attacker.pokemon.name, stat: boost, change })
    }
    const instant =
      (['solar-beam', 'solar-blade'].includes(move.name) && solarMoveHasSun(attacker, defender, field)) ||
      (move.name === 'electro-shot' && field.weather === 'rain')
    if (!instant) {
      attacker.chargingMoveIndex = moveSlot
      events.push({ type: 'charging', pokemon: attacker.pokemon.name })
      return { hit: false, succeeded: true }
    }
  }
  if (sleepUsableMoves.has(move.name) && attacker.status !== 'sleep') return { hit: true, succeeded: false }
  if (move.name === 'sleep-talk') {
    const choices = attacker.moves.flatMap((candidate, index) =>
      index !== moveSlot && candidate.data.name !== 'sleep-talk' && candidate.pp > 0 ? [index] : [],
    )
    const selected = choices[Math.floor(random() * choices.length)]
    return selected === undefined
      ? { hit: true, succeeded: false }
      : applyMove(attacker, defender, defendingSide, field, selected, random, events, true)
  }
  if (!['protect', 'detect'].includes(move.name)) attacker.protectStreak = 0
  if (move.name === 'protect' || move.name === 'detect') {
    const succeeds = random() < 1 / 3 ** attacker.protectStreak
    if (!succeeds) {
      attacker.protectStreak = 0
      return { hit: true, succeeded: false }
    }
    attacker.volatile.protect = 1
    attacker.protectStreak += 1
    return { hit: true, succeeded: true }
  }
  if (move.name === 'ally-switch') {
    // Random Battle is a singles format, so no adjacent ally can be selected.
    return { hit: true, succeeded: false }
  }
  if (move.name === 'steel-roller' && !field.terrain) return { hit: true, succeeded: false }
  if (
    !delayed &&
    ['selected-pokemon', 'all-opponents', 'all-other-pokemon', 'random-opponent'].includes(move.target) &&
    semiInvulnerableMultiplier(defender, move) === 0
  ) {
    events.push({ type: 'miss', pokemon: defender.pokemon.name })
    return { hit: false, succeeded: false }
  }
  if (move.accuracy !== null && !defender.volatile.telekinesis && random() * 100 >= move.accuracy) {
    events.push({ type: 'miss', pokemon: defender.pokemon.name })
    return { hit: false, succeeded: false }
  }

  if (field.terrain === 'psychic' && isGrounded(defender) && move.priority > 0 && move.target !== 'user') {
    events.push({ type: 'fieldBlocked', pokemon: defender.pokemon.name, field: 'psychic' })
    return { hit: false, succeeded: false }
  }

  if (['phantom-force', 'shadow-force'].includes(move.name)) delete defender.volatile.protect
  if (!delayed && defender.volatile.protect && move.target !== 'user' && move.name !== 'protect' && !curse) {
    events.push({ type: 'protected', pokemon: defender.pokemon.name })
    return { hit: false, succeeded: false }
  }

  if (
    defendingSide.conditions.craftyShield > 0 &&
    (ghostCurse || (move.damageClass === 'status' && move.target !== 'user'))
  ) {
    events.push({ type: 'protected', pokemon: attacker.pokemon.name })
    return { hit: false, succeeded: false }
  }

  if (defender.status === 'freeze' && (move.type === 'fire' || freezeThawingMoves.has(move.name))) {
    defender.status = null
    events.push({ type: 'thaw', pokemon: defender.pokemon.name })
  }

  const supplemental = supplementalMoveEffect(move.name)
  if (move.damageClass === 'status' && move.target === 'selected-pokemon' && defender.substituteHp > 0)
    return { hit: true, succeeded: false, hitSubstitute: true }

  if (supplemental?.kind === 'substitute') {
    const hp = Math.floor(attacker.maxHp / 4)
    if (attacker.substituteHp > 0 || attacker.hp <= hp) return { hit: true, succeeded: false }
    attacker.hp -= hp
    attacker.substituteHp = hp
    events.push({ type: 'substituteSet', pokemon: attacker.pokemon.name, hp })
    return { hit: true, succeeded: true }
  }

  if (supplemental?.kind === 'equalize-hp') {
    const sharedHp = Math.floor((attacker.hp + defender.hp) / 2)
    const attackerHp = Math.min(attacker.maxHp, sharedHp)
    const defenderHp = Math.min(defender.maxHp, sharedHp)
    const changes = [
      { pokemon: attacker, hp: attackerHp },
      { pokemon: defender, hp: defenderHp },
    ]
    let succeeded = false
    for (const change of changes) {
      const amount = Math.abs(change.hp - change.pokemon.hp)
      if (amount === 0) continue
      const type = change.hp > change.pokemon.hp ? 'heal' : 'damage'
      change.pokemon.hp = change.hp
      succeeded = true
      if (type === 'heal') events.push({ type, pokemon: change.pokemon.pokemon.name, amount })
      else
        events.push({
          type,
          pokemon: change.pokemon.pokemon.name,
          amount,
          effectiveness: 1,
          critical: false,
        })
    }
    return { hit: true, succeeded }
  }

  if (move.name === 'rest') {
    if (attacker.volatile['heal-block']) return { hit: true, succeeded: false }
    const needsRest = attacker.hp < attacker.maxHp || attacker.status !== null
    if (!needsRest) return { hit: true, succeeded: false }
    const amount = attacker.maxHp - attacker.hp
    attacker.hp = attacker.maxHp
    attacker.status = 'sleep'
    // The user cannot act on its next two turns, then wakes before acting.
    attacker.sleepTurns = 2
    attacker.toxicTurns = 0
    if (amount > 0) events.push({ type: 'heal', pokemon: attacker.pokemon.name, amount })
    events.push({ type: 'status', pokemon: attacker.pokemon.name, status: 'sleep' })
    return { hit: true, succeeded: true }
  }

  if (ghostCurse) {
    if (defender.cursed) return { hit: true, succeeded: false }
    const amount = Math.min(attacker.hp, Math.floor(attacker.maxHp / 2))
    if (amount > 0) {
      attacker.hp -= amount
      events.push({ type: 'damage', pokemon: attacker.pokemon.name, amount, effectiveness: 1, critical: false })
    }
    defender.cursed = true
    events.push({ type: 'status', pokemon: defender.pokemon.name, status: 'curse' })
    if (attacker.hp === 0) events.push({ type: 'faint', pokemon: attacker.pokemon.name })
    return { hit: true, succeeded: true }
  }

  if (curse) {
    let succeeded = false
    for (const [stat, change] of [
      ['speed', -1],
      ['attack', 1],
      ['defense', 1],
    ] as const) {
      const previous = attacker.stages[stat]
      attacker.stages[stat] = Math.max(-6, Math.min(6, previous + change))
      const applied = attacker.stages[stat] - previous
      if (!applied) continue
      events.push({ type: 'stage', pokemon: attacker.pokemon.name, stat, change: applied })
      succeeded = true
    }
    return { hit: true, succeeded }
  }

  let succeeded = false
  let hitSubstitute = false
  if (supplemental?.kind === 'fixed-damage') {
    const effectiveness = battleMoveEffectiveness(move, defender)
    if (effectiveness === 0) {
      events.push({ type: 'immune', pokemon: defender.pokemon.name })
      return { hit: false, succeeded: false }
    }
    const damage = fixedMoveDamage(attacker, defender, supplemental.amount)
    if (damage > 0) {
      const applied = applyDirectMoveDamage(defender, damage, 1, false, events)
      hitSubstitute = applied.hitSubstitute
      succeeded = true
    }
  }
  if (move.damageClass !== 'status' && move.power) {
    const effectiveness = battleMoveEffectiveness(move, defender)
    if (effectiveness === 0) {
      events.push({ type: 'immune', pokemon: defender.pokemon.name })
      return { hit: false, succeeded: false }
    }
    const physical = move.damageClass === 'physical'
    const attackerStats = currentBattleStats(attacker)
    const defenderStats = currentBattleStats(defender)
    const attack = attackerStats[physical ? 1 : 3]
    let defense = defenderStats[physical ? 2 : 4]
    if (physical && field.weather === 'snow' && effectiveTypes(defender).includes('ice')) defense *= 1.5
    if (!physical && field.weather === 'sandstorm' && effectiveTypes(defender).includes('rock')) defense *= 1.5
    const stab = battleSameTypeAttackBonus(attacker, move.type)
    const critical = random() < (['razor-wind', 'sky-attack'].includes(move.name) ? 1 / 8 : 1 / 24)
    const variance = 0.85 + random() * 0.15
    const conditionalPower =
      move.power *
      (move.name === 'facade' && attacker.status ? 2 : 1) *
      (move.name === 'wake-up-slap' && defender.status === 'sleep' ? 2 : 1) *
      (move.name === 'smelling-salts' && defender.status === 'paralysis' ? 2 : 1)
    const base = Math.floor(
      (((2 * attacker.member.level) / 5 + 2) * conditionalPower * (attack / Math.max(1, defense))) / 50 + 2,
    )
    const screen =
      !critical &&
      (defendingSide.conditions.auroraVeil > 0 ||
        (physical ? defendingSide.conditions.reflect > 0 : defendingSide.conditions.lightScreen > 0))
        ? 0.5
        : 1
    const damage = Math.max(
      1,
      Math.floor(
        base *
          stab *
          effectiveness *
          (critical ? 1.5 : 1) *
          variance *
          (delayed
            ? fieldPowerModifier(move, attacker, { ...defender, chargingMoveIndex: undefined }, field)
            : fieldPowerModifier(move, attacker, defender, field)) *
          screen,
      ),
    )
    const applied = applyDirectMoveDamage(defender, damage, effectiveness, critical, events)
    hitSubstitute = applied.hitSubstitute
    if (move.drain && !attacker.volatile['heal-block']) {
      const amount = Math.min(
        attacker.maxHp - attacker.hp,
        Math.max(1, Math.floor((applied.amount * Math.abs(move.drain)) / 100)),
      )
      if (move.drain > 0 && amount > 0) {
        attacker.hp += amount
        events.push({ type: 'heal', pokemon: attacker.pokemon.name, amount })
      } else if (move.drain < 0)
        attacker.hp = Math.max(0, attacker.hp - Math.max(1, Math.floor((damage * Math.abs(move.drain)) / 100)))
    }
    succeeded = true
  }

  if (!hitSubstitute && move.name === 'wake-up-slap' && defender.status === 'sleep') {
    defender.status = null
    defender.sleepTurns = 0
    events.push({ type: 'wake', pokemon: defender.pokemon.name })
    succeeded = true
  }
  if (!hitSubstitute && move.name === 'smelling-salts' && defender.status === 'paralysis') {
    defender.status = null
    events.push({ type: 'statusCured', pokemon: defender.pokemon.name, status: 'paralysis' })
    succeeded = true
  }

  if (move.healing > 0 && !attacker.volatile['heal-block']) {
    const amount = Math.min(
      attacker.maxHp - attacker.hp,
      Math.max(1, Math.floor((attacker.maxHp * move.healing) / 100)),
    )
    if (amount > 0) {
      attacker.hp += amount
      events.push({ type: 'heal', pokemon: attacker.pokemon.name, amount })
      succeeded = true
    }
  }

  const selfTarget = changesApplyToUser(move)
  const appliesStatChanges =
    move.statChanges.length > 0 && (move.effectChance === null || random() * 100 < move.effectChance)
  if (appliesStatChanges) {
    for (const change of move.statChanges) {
      const target = selfTarget || (change.change > 0 && !changesApplyToTarget(move)) ? attacker : defender
      if (target === defender && hitSubstitute) continue
      const previous = target.stages[change.stat]
      target.stages[change.stat] = Math.max(-6, Math.min(6, previous + change.change))
      const applied = target.stages[change.stat] - previous
      if (applied) {
        events.push({ type: 'stage', pokemon: target.pokemon.name, stat: change.stat, change: applied })
        succeeded = true
      }
    }
  }

  const statusTarget = selfTarget ? attacker : defender
  if (
    move.ailment &&
    statusTarget.hp > 0 &&
    (!hitSubstitute || statusTarget === attacker) &&
    random() * 100 < move.ailmentChance
  ) {
    if (move.ailment === 'flinch' && statusTarget === defender && !defender.volatile.flinch) {
      defender.volatile.flinch = 1
      events.push({ type: 'status', pokemon: defender.pokemon.name, status: 'flinch' })
      succeeded = true
    }
    const status = (
      {
        burn: 'burn',
        freeze: 'freeze',
        paralysis: 'paralysis',
        poison: badlyPoisoningMoves.has(move.name) ? 'badly-poisoned' : 'poison',
        'badly-poisoned': 'badly-poisoned',
        sleep: 'sleep',
      } as const
    )[move.ailment]
    const volatileStatus = ({ confusion: 'confusion', infatuation: 'attraction', curse: 'curse' } as const)[
      move.ailment
    ]
    if (
      status &&
      !statusTarget.status &&
      !statusPreventedByTerrain(status, statusTarget, field) &&
      !majorStatusImmune(status, statusTarget, attacker, defendingSide, field)
    ) {
      statusTarget.status = status
      // Since Generation V, regular sleep lasts two to four turns.
      if (status === 'sleep') statusTarget.sleepTurns = 2 + Math.floor(random() * 3)
      if (status === 'badly-poisoned') statusTarget.toxicTurns = 0
      events.push({ type: 'status', pokemon: statusTarget.pokemon.name, status })
      succeeded = true
    } else if (volatileStatus && canApplyVolatileStatus(volatileStatus, attacker, statusTarget, defendingSide, field)) {
      if (volatileStatus === 'confusion') statusTarget.confusionTurns = 1 + Math.floor(random() * 4)
      if (volatileStatus === 'attraction') statusTarget.attracted = true
      if (volatileStatus === 'curse') statusTarget.cursed = true
      events.push({ type: 'status', pokemon: statusTarget.pokemon.name, status: volatileStatus })
      succeeded = true
    }
  }
  return { hit: true, succeeded, hitSubstitute }
}

function performChoice(
  own: BattleSide,
  foe: BattleSide,
  field: BattleField,
  choice: BattleChoice,
  side: 'player' | 'opponent',
  random: RandomSource,
  events: BattleEvent[],
) {
  const active = own.roster[own.active]
  if (active.hp > 0 && !own.switchRequested && (active.recharging || active.chargingMoveIndex !== undefined))
    choice = { kind: 'move', index: active.chargingMoveIndex ?? 0 }
  if (choice.kind === 'switch') {
    const replacement = own.roster[choice.index]
    if (!replacement || choice.index === own.active || replacement.hp <= 0) return
    const leaving = own.roster[own.active]
    if (!own.switchRequested && (leaving.volatile.bound || leaving.volatile.ingrain || leaving.volatile.octolock)) {
      events.push({ type: 'failed', pokemon: leaving.pokemon.name })
      return
    }
    const batonPassesCurse =
      own.switchRequested &&
      leaving.hp > 0 &&
      leaving.cursed &&
      leaving.lastMoveIndex !== null &&
      leaving.moves[leaving.lastMoveIndex]?.data.name === 'baton-pass'
    delete leaving.chargingMoveIndex
    delete leaving.recharging
    leaving.stages = emptyStages()
    leaving.encoreTurns = 0
    leaving.encoreMoveIndex = null
    leaving.tauntTurns = 0
    leaving.protectStreak = 0
    leaving.lastMoveIndex = null
    leaving.confusionTurns = 0
    leaving.attracted = false
    leaving.cursed = false
    leaving.substituteHp = 0
    leaving.volatile = {}
    leaving.disabledMoveIndex = null
    // Toxic remains toxic after switching in modern main-series games; only its
    // escalating counter resets.
    if (leaving.status === 'badly-poisoned') leaving.toxicTurns = 0
    foe.roster[foe.active].attracted = false
    if (leaving.ability.name === 'natural-cure' && leaving.status) {
      events.push({ type: 'statusCured', pokemon: leaving.pokemon.name, status: leaving.status })
      leaving.status = null
      leaving.sleepTurns = 0
      leaving.toxicTurns = 0
    }
    own.active = choice.index
    replacement.stages = emptyStages()
    if (batonPassesCurse) replacement.cursed = true
    replacement.hasEnteredBattle = true
    own.switchRequested = false
    events.push({ type: 'switch', side, pokemon: replacement.pokemon.name })
    applyEntryAbility(own, foe, field, events)
    applyEntryHazards(own, replacement, events)
    if (replacement.hp === 0) events.push({ type: 'faint', pokemon: replacement.pokemon.name })
    return
  }
  const attacker = own.roster[own.active]
  const defender = foe.roster[foe.active]
  if (!attacker || !defender || attacker.hp <= 0) return
  if (attacker.recharging) {
    delete attacker.recharging
    events.push({ type: 'recharging', pokemon: attacker.pokemon.name })
    tickMoveRestrictions(attacker)
    return
  }
  const legalMoves = legalBattleMoveIndexes(attacker)
  const selectedMoveIndex = selectedBattleMoveIndex(attacker, choice.index)
  const start = events.length
  if (!legalMoves.includes(selectedMoveIndex)) {
    events.push({ type: 'failed', pokemon: attacker.pokemon.name })
    tickMoveRestrictions(attacker)
    return
  }
  const selectedMove = attacker.moves[selectedMoveIndex]?.data.name
  const outcome = applyMove(attacker, defender, foe, field, selectedMoveIndex, random, events)
  for (let index = start; index < events.length; index += 1) {
    const event = events[index]
    if (event.type === 'move') {
      event.side = side
      if (selectedMove && !attacker.revealedMoves.includes(selectedMove))
        attacker.revealedMoves = [...attacker.revealedMoves, selectedMove].slice(0, 4)
    }
  }
  if (!outcome) return
  let succeeded = outcome.succeeded
  const move = attacker.moves[selectedMoveIndex]?.data
  if (outcome.hit && move) {
    if (outcome.succeeded && rechargeMoves.has(move.name)) attacker.recharging = true
    if (move.name === 'smack-down' && ['fly', 'bounce'].includes(semiInvulnerableMove(defender) ?? ''))
      delete defender.chargingMoveIndex
    const supplemental = supplementalMoveEffect(move.name)
    if (supplemental?.kind === 'encore' && !outcome.hitSubstitute) {
      const repeated = defender.lastMoveIndex
      const repeatedMove = repeated === null ? null : defender.moves[repeated]
      if (repeatedMove && repeatedMove.pp > 0 && repeatedMove.data.name !== 'encore') {
        defender.encoreTurns =
          supplemental.minimumTurns + Math.floor(random() * (supplemental.maximumTurns - supplemental.minimumTurns + 1))
        defender.encoreMoveIndex = repeated
        events.push({
          type: 'encore',
          pokemon: defender.pokemon.name,
          move: repeatedMove.data.name,
          turns: defender.encoreTurns,
        })
        succeeded = true
      }
    }
    if (supplemental?.kind === 'taunt' && !outcome.hitSubstitute && defender.tauntTurns <= 0) {
      defender.tauntTurns = supplemental.turns
      events.push({ type: 'taunt', pokemon: defender.pokemon.name })
      succeeded = true
    }
    if (supplemental?.kind === 'set-volatile') {
      const target = selfVolatileConditions.has(supplemental.condition) ? attacker : defender
      const targetSide = target === attacker ? own : foe
      const blockedBySafeguard = target === defender && targetSide.conditions.safeguard > 0
      const blockedByMisty = target === defender && field.terrain === 'misty' && isGrounded(target)
      const requiresSleepingTarget = supplemental.condition === 'nightmare' && target.status !== 'sleep'
      const grassImmuneToSeed = supplemental.condition === 'leech-seed' && effectiveTypes(target).includes('grass')
      if (
        !blockedBySafeguard &&
        !blockedByMisty &&
        !requiresSleepingTarget &&
        !grassImmuneToSeed &&
        !target.volatile[supplemental.condition] &&
        (target === attacker || !outcome.hitSubstitute)
      ) {
        if (supplemental.condition === 'disable') {
          if (target.lastMoveIndex === null) {
            // A target that has not moved yet has no move that can be disabled.
          } else {
            target.disabledMoveIndex = target.lastMoveIndex
            target.volatile.disable = supplemental.turns ?? 4
            events.push({ type: 'status', pokemon: target.pokemon.name, status: 'disable' })
            succeeded = true
          }
        } else {
          target.volatile[supplemental.condition] = supplemental.turns ?? -1
          events.push({ type: 'status', pokemon: target.pokemon.name, status: supplemental.condition })
          succeeded = true
        }
      }
    }
    if (supplemental?.kind === 'reset-stages') {
      const targets = supplemental.target === 'all' ? [attacker, defender] : [defender]
      for (const target of targets) {
        if (target === defender && outcome.hitSubstitute) continue
        if (Object.values(target.stages).some(Boolean)) {
          target.stages = emptyStages()
          events.push({ type: 'stagesReset', pokemon: target.pokemon.name })
          succeeded = true
        }
      }
    }
    if (supplemental?.kind === 'cure-team-status') {
      const cured = own.roster.some((pokemon) => pokemon.status !== null)
      own.roster.forEach((pokemon) => {
        if (!pokemon.status) return
        pokemon.status = null
        pokemon.sleepTurns = 0
        pokemon.toxicTurns = 0
      })
      if (cured) {
        events.push({ type: 'teamStatusCured', side })
        succeeded = true
      }
    }
    if (supplemental?.kind === 'set-weather') {
      field.weather = supplemental.weather
      field.weatherTurns = supplemental.turns
      events.push({ type: 'fieldSet', field: supplemental.weather, turns: supplemental.turns })
      succeeded = true
    }
    if (supplemental?.kind === 'set-terrain') {
      field.terrain = supplemental.terrain
      field.terrainTurns = supplemental.turns
      events.push({ type: 'fieldSet', field: supplemental.terrain, turns: supplemental.turns })
      succeeded = true
    }
    if (supplemental?.kind === 'clear-terrain' && field.terrain) {
      const terrain = field.terrain
      field.terrain = null
      field.terrainTurns = 0
      events.push({ type: 'fieldEnded', field: terrain })
      succeeded = true
    }
    if (supplemental?.kind === 'set-trick-room') {
      if (field.trickRoomTurns > 0) {
        field.trickRoomTurns = 0
        events.push({ type: 'fieldEnded', field: 'trick-room' })
      } else {
        field.trickRoomTurns = supplemental.turns
        events.push({ type: 'fieldSet', field: 'trick-room', turns: supplemental.turns })
      }
      succeeded = true
    }
    if (supplemental?.kind === 'set-side-condition') {
      const condition = {
        reflect: 'reflect',
        'light-screen': 'lightScreen',
        'aurora-veil': 'auroraVeil',
        tailwind: 'tailwind',
        safeguard: 'safeguard',
        'crafty-shield': 'craftyShield',
      }[supplemental.condition] as keyof BattleSideConditions
      if (!supplemental.requiresWeather || field.weather === supplemental.requiresWeather) {
        own.conditions[condition] = supplemental.turns
        events.push({ type: 'sideConditionSet', side, condition, turns: supplemental.turns })
        succeeded = true
      }
    }
    if (supplemental?.kind === 'clear-target-screens') {
      for (const condition of ['reflect', 'lightScreen', 'auroraVeil'] as const) {
        if (foe.conditions[condition] > 0) {
          foe.conditions[condition] = 0
          events.push({ type: 'sideConditionEnded', side: side === 'player' ? 'opponent' : 'player', condition })
          succeeded = true
        }
      }
    }
    const hazard = hazardMoves[move.name]
    if (hazard && (!afterHitHazardMoves.has(move.name) || outcome.succeeded) && addHazard(foe, hazard)) {
      events.push({ type: 'hazardSet', side: side === 'player' ? 'opponent' : 'player', hazard })
      succeeded = true
    }
    if (ownHazardRemovalMoves.has(move.name) && clearHazards(own)) {
      events.push({ type: 'hazardsCleared', side })
      succeeded = true
    }
    if (move.name === 'defog') {
      const clearedOwn = clearHazards(own)
      const clearedFoe = clearHazards(foe)
      if (clearedOwn) events.push({ type: 'hazardsCleared', side })
      if (clearedFoe) events.push({ type: 'hazardsCleared', side: side === 'player' ? 'opponent' : 'player' })
      succeeded ||= clearedOwn || clearedFoe
      if (field.terrain) {
        const terrain = field.terrain
        field.terrain = null
        field.terrainTurns = 0
        events.push({ type: 'fieldEnded', field: terrain })
        succeeded = true
      }
      for (const condition of ['reflect', 'lightScreen', 'auroraVeil'] as const) {
        if (foe.conditions[condition] > 0) {
          foe.conditions[condition] = 0
          events.push({ type: 'sideConditionEnded', side: side === 'player' ? 'opponent' : 'player', condition })
          succeeded = true
        }
      }
    }
    if (move.name === 'court-change') {
      const hazards = own.hazards
      own.hazards = foe.hazards
      foe.hazards = hazards
      const conditions = own.conditions
      own.conditions = foe.conditions
      foe.conditions = conditions
      succeeded = true
    }
    if (!outcome.hitSubstitute && itemRemovalMoves.has(move.name) && defender.item) {
      const item = defender.item.name
      defender.item = null
      events.push({ type: 'itemRemoved', pokemon: defender.pokemon.name, item })
      succeeded = true
    }
    if (!outcome.hitSubstitute && move.name === 'incinerate' && defender.item?.name.endsWith('-berry')) {
      const item = defender.item.name
      defender.item = null
      events.push({ type: 'itemRemoved', pokemon: defender.pokemon.name, item })
      succeeded = true
    }
    if (pivotMoves.has(move.name) && attacker.hp > 0 && availableSwitch(own) >= 0) {
      own.switchRequested = true
      succeeded = true
    }
    if (!outcome.hitSubstitute && forceSwitchMoves.has(move.name) && defender.hp > 0 && availableSwitch(foe) >= 0) {
      foe.switchRequested = true
      succeeded = true
    }
  }
  tickMoveRestrictions(attacker)
  if (!succeeded && outcome.hit) events.push({ type: 'failed', pokemon: attacker.pokemon.name })
  if (defender.hp === 0 && !events.some((event, index) => index >= start && event.type === 'faint'))
    events.push({ type: 'faint', pokemon: defender.pokemon.name })
}

function choicePriority(side: BattleSide, choice: BattleChoice) {
  const pokemon = side.roster[side.active]
  if (pokemon.recharging) return 0
  if (choice.kind === 'switch' && pokemon.chargingMoveIndex === undefined) return 6
  return pokemon.moves[selectedBattleMoveIndex(pokemon, choice.index)]?.data.priority ?? 0
}

function residual(side: BattleSide, foe: BattleSide, field: BattleField, random: RandomSource, events: BattleEvent[]) {
  const pokemon = side.roster[side.active]
  if (pokemon.hp <= 0) return
  if (pokemon.status && pokemon.ability.name === 'hydration' && field.weather === 'rain') {
    events.push({ type: 'statusCured', pokemon: pokemon.pokemon.name, status: pokemon.status })
    pokemon.status = null
    pokemon.sleepTurns = 0
    pokemon.toxicTurns = 0
  } else if (pokemon.status && pokemon.ability.name === 'shed-skin' && random() < 1 / 3) {
    events.push({ type: 'statusCured', pokemon: pokemon.pokemon.name, status: pokemon.status })
    pokemon.status = null
    pokemon.sleepTurns = 0
    pokemon.toxicTurns = 0
  }
  if (field.terrain === 'grassy' && isGrounded(pokemon) && pokemon.hp < pokemon.maxHp) {
    const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    pokemon.hp += amount
    events.push({ type: 'heal', pokemon: pokemon.pokemon.name, amount })
  }
  if (
    pokemon.ability.name !== 'magic-guard' &&
    field.weather === 'sandstorm' &&
    !effectiveTypes(pokemon).some((type) => ['rock', 'ground', 'steel'].includes(type))
  ) {
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    pokemon.hp -= amount
    events.push({ type: 'weatherDamage', pokemon: pokemon.pokemon.name, weather: 'sandstorm', amount })
  }
  if (pokemon.hp > 0 && isDamagingStatus(pokemon.status) && pokemon.ability.name !== 'magic-guard') {
    const status = pokemon.status
    if (isPoisoned(pokemon) && pokemon.ability.name === 'poison-heal') {
      const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 8)))
      if (amount > 0) {
        pokemon.hp += amount
        events.push({ type: 'heal', pokemon: pokemon.pokemon.name, amount })
      }
    } else {
      const denominator =
        status === 'burn'
          ? pokemon.ability.name === 'heatproof'
            ? 32
            : 16
          : status === 'badly-poisoned'
            ? 16 / (pokemon.toxicTurns + 1)
            : 8
      const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / denominator)))
      pokemon.hp -= amount
      events.push({ type: 'statusDamage', pokemon: pokemon.pokemon.name, status, amount })
      if (status === 'badly-poisoned') pokemon.toxicTurns += 1
    }
  }
  if (pokemon.hp > 0 && pokemon.cursed && pokemon.ability.name !== 'magic-guard') {
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 4)))
    pokemon.hp -= amount
    events.push({ type: 'statusDamage', pokemon: pokemon.pokemon.name, status: 'curse', amount })
  }
  const damageFromVolatile = (condition: BattleVolatileCondition, denominator: number) => {
    if (!pokemon.volatile[condition] || pokemon.hp <= 0 || pokemon.ability.name === 'magic-guard') return
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / denominator)))
    pokemon.hp -= amount
    events.push({ type: 'damage', pokemon: pokemon.pokemon.name, amount, effectiveness: 1, critical: false })
  }
  if (pokemon.volatile.yawn) {
    pokemon.volatile.yawn -= 1
    if (pokemon.volatile.yawn <= 0) {
      delete pokemon.volatile.yawn
      if (
        !pokemon.status &&
        !statusPreventedByTerrain('sleep', pokemon, field) &&
        !majorStatusImmune('sleep', pokemon, pokemon, side, field)
      ) {
        pokemon.status = 'sleep'
        pokemon.sleepTurns = 2 + Math.floor(random() * 3)
        events.push({ type: 'status', pokemon: pokemon.pokemon.name, status: 'sleep' })
      }
    }
  }
  if (pokemon.volatile['aqua-ring'] || pokemon.volatile.ingrain) {
    const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    if (amount > 0) {
      pokemon.hp += amount
      events.push({ type: 'heal', pokemon: pokemon.pokemon.name, amount })
    }
  }
  damageFromVolatile('bound', 8)
  if (pokemon.volatile.nightmare && pokemon.status === 'sleep') damageFromVolatile('nightmare', 4)
  if (pokemon.volatile['leech-seed']) {
    const before = pokemon.hp
    damageFromVolatile('leech-seed', 8)
    const amount = before - pokemon.hp
    const source = foe.roster[foe.active]
    if (amount > 0 && source.hp > 0) {
      const healed = Math.min(source.maxHp - source.hp, amount)
      if (healed > 0) {
        source.hp += healed
        events.push({ type: 'heal', pokemon: source.pokemon.name, amount: healed })
      }
    }
  }
  if (pokemon.volatile['salt-cure'])
    damageFromVolatile(
      'salt-cure',
      effectiveTypes(pokemon).some((type) => type === 'water' || type === 'steel') ? 8 : 16,
    )
  if (pokemon.volatile.syrupy) {
    const previous = pokemon.stages.speed
    pokemon.stages.speed = Math.max(-6, previous - 1)
    if (previous !== pokemon.stages.speed)
      events.push({
        type: 'stage',
        pokemon: pokemon.pokemon.name,
        stat: 'speed',
        change: pokemon.stages.speed - previous,
      })
  }
  if (pokemon.volatile.octolock) {
    for (const stat of ['defense', 'specialDefense'] as const) {
      const previous = pokemon.stages[stat]
      pokemon.stages[stat] = Math.max(-6, previous - 1)
      if (previous !== pokemon.stages[stat])
        events.push({ type: 'stage', pokemon: pokemon.pokemon.name, stat, change: pokemon.stages[stat] - previous })
    }
  }
  if (pokemon.hp === 0) events.push({ type: 'faint', pokemon: pokemon.pokemon.name })
}

function tickField(state: BattleState, events: BattleEvent[]) {
  if (state.field.weather && --state.field.weatherTurns <= 0) {
    events.push({ type: 'fieldEnded', field: state.field.weather })
    state.field.weather = null
    state.field.weatherTurns = 0
  }
  if (state.field.terrain && --state.field.terrainTurns <= 0) {
    events.push({ type: 'fieldEnded', field: state.field.terrain })
    state.field.terrain = null
    state.field.terrainTurns = 0
  }
  if (state.field.trickRoomTurns > 0 && --state.field.trickRoomTurns === 0)
    events.push({ type: 'fieldEnded', field: 'trick-room' })
  const tickSide = (side: BattleSide, sideName: 'player' | 'opponent') => {
    for (const condition of Object.keys(side.conditions) as (keyof BattleSideConditions)[]) {
      if (side.conditions[condition] > 0 && --side.conditions[condition] === 0)
        events.push({ type: 'sideConditionEnded', side: sideName, condition })
    }
  }
  tickSide(state.player, 'player')
  tickSide(state.opponent, 'opponent')
  for (const side of [state.player, state.opponent]) {
    const pokemon = side.roster[side.active]
    for (const [condition, turns] of Object.entries(pokemon.volatile) as [BattleVolatileCondition, number][]) {
      if (condition === 'yawn' || turns < 0) continue
      if (condition === 'flinch' || turns <= 1) {
        delete pokemon.volatile[condition]
        if (condition === 'disable') pokemon.disabledMoveIndex = null
      } else pokemon.volatile[condition] = turns - 1
    }
  }
}

function availableSwitch(side: BattleSide) {
  return side.roster.findIndex((pokemon, index) => index !== side.active && pokemon.hp > 0)
}

function applyTurnTerastallization(
  side: BattleSide,
  choice: BattleChoice,
  sideName: 'player' | 'opponent',
  events: BattleEvent[],
) {
  if (choice.kind !== 'move' || !choice.tera) return
  const pokemon = side.roster[side.active]
  if (!pokemon || pokemon.hp <= 0 || pokemon.terastallized) return
  pokemon.terastallized = true
  events.push({ type: 'tera', side: sideName, pokemon: pokemon.pokemon.name, tera: pokemon.member.tera })
}

function settlePhase(state: BattleState, events: BattleEvent[]) {
  const playerSwitch = availableSwitch(state.player)
  const opponentSwitch = availableSwitch(state.opponent)
  const playerFainted = state.player.roster[state.player.active].hp === 0
  const opponentFainted = state.opponent.roster[state.opponent.active].hp === 0
  if (!playerFainted && playerSwitch < 0) state.player.switchRequested = false
  if (!opponentFainted && opponentSwitch < 0) state.opponent.switchRequested = false
  if (playerFainted && playerSwitch < 0) {
    state.phase = 'lost'
    events.push({ type: 'win', side: 'opponent' })
  } else if (opponentFainted && opponentSwitch < 0) {
    state.phase = 'won'
    events.push({ type: 'win', side: 'player' })
  } else if (playerFainted || state.player.switchRequested) state.phase = 'player-switch'
  else if (opponentFainted || state.opponent.switchRequested) state.phase = 'opponent-switch'
  else state.phase = 'choice'
}

export function chooseOpponentAction(
  state: BattleState,
  random: RandomSource = Math.random,
  difficulty: BattleDifficulty = 'medium',
): BattleChoice {
  return chooseBattleOpponentAction(state, difficulty, random)
}

export function resolveBattleTurnSteps(
  current: BattleState,
  playerChoice: BattleChoice,
  opponentChoice: BattleChoice,
  random: RandomSource = Math.random,
): BattleTurnStep[] {
  const state = cloneState(current)
  const events: BattleEvent[] = [{ type: 'turn', turn: state.turn }]
  const steps: BattleTurnStep[] = []
  const performStep = (own: BattleSide, foe: BattleSide, choice: BattleChoice, side: 'player' | 'opponent') => {
    const eventStart = events.length
    const move =
      choice.kind === 'move' &&
      !own.roster[own.active]?.recharging &&
      own.roster[own.active]?.hp > 0 &&
      foe.roster[foe.active]?.hp > 0
        ? (own.roster[own.active].moves[selectedBattleMoveIndex(own.roster[own.active], choice.index)]?.data.name ??
          null)
        : null
    performChoice(own, foe, state.field, choice, side, random, events)
    if (events.length > eventStart || move) {
      steps.push({ state: cloneState(state), events: events.slice(eventStart), action: { side, move } })
    }
  }
  if (state.phase === 'player-switch') {
    performStep(state.player, state.opponent, playerChoice, 'player')
    if (state.opponent.roster[state.opponent.active].hp === 0)
      performStep(state.opponent, state.player, opponentChoice, 'opponent')
    const finalEventStart = events.length
    settlePhase(state, events)
    const finalEvents = events.slice(finalEventStart)
    if (steps.length) {
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        state: cloneState(state),
        events: [...steps[steps.length - 1].events, ...finalEvents],
      }
    } else {
      steps.push({ state: cloneState(state), events: events.slice(1), action: null })
    }
    if (steps.length && events[0]?.type === 'turn') steps[0].events.unshift(events[0])
    return steps
  }
  if (state.phase === 'opponent-switch') {
    performStep(state.opponent, state.player, opponentChoice, 'opponent')
    const finalEventStart = events.length
    settlePhase(state, events)
    const finalEvents = events.slice(finalEventStart)
    if (steps.length) {
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        state: cloneState(state),
        events: [...steps[steps.length - 1].events, ...finalEvents],
      }
    } else {
      steps.push({ state: cloneState(state), events: events.slice(1), action: null })
    }
    if (steps.length && events[0]?.type === 'turn') steps[0].events.unshift(events[0])
    return steps
  }

  const lockedChoice = (side: BattleSide, choice: BattleChoice): BattleChoice => {
    const pokemon = side.roster[side.active]
    return pokemon.hp > 0 && (pokemon.recharging || pokemon.chargingMoveIndex !== undefined)
      ? { kind: 'move', index: pokemon.chargingMoveIndex ?? 0 }
      : choice
  }
  playerChoice = lockedChoice(state.player, playerChoice)
  opponentChoice = lockedChoice(state.opponent, opponentChoice)
  const playerPriority = choicePriority(state.player, playerChoice)
  const opponentPriority = choicePriority(state.opponent, opponentChoice)
  const playerSpeed = speed(state.player)
  const opponentSpeed = speed(state.opponent)
  const playerWinsSpeed = state.field.trickRoomTurns > 0 ? playerSpeed < opponentSpeed : playerSpeed > opponentSpeed
  const playerFirst =
    playerPriority > opponentPriority ||
    (playerPriority === opponentPriority && (playerWinsSpeed || (playerSpeed === opponentSpeed && random() < 0.5)))
  const actions = playerFirst
    ? [
        () => performStep(state.player, state.opponent, playerChoice, 'player'),
        () => performStep(state.opponent, state.player, opponentChoice, 'opponent'),
      ]
    : [
        () => performStep(state.opponent, state.player, opponentChoice, 'opponent'),
        () => performStep(state.player, state.opponent, playerChoice, 'player'),
      ]
  actions.forEach((action) => action())
  const finalEventStart = events.length
  residual(state.player, state.opponent, state.field, random, events)
  residual(state.opponent, state.player, state.field, random, events)
  for (const side of [state.player, state.opponent]) {
    const pending = side.futureSight
    if (!pending || --pending.turns > 0) continue
    delete side.futureSight
    const target = side.roster[side.active]
    if (target.hp <= 0) continue
    const source = { ...pending.attacker, hp: Math.max(1, pending.attacker.hp), moves: [{ data: pending.move, pp: 1 }] }
    const start = events.length
    applyMove(source, target, side, state.field, 0, random, events, true, true)
    for (const event of events.slice(start)) {
      if (event.type === 'move') event.side = side === state.player ? 'opponent' : 'player'
    }
    if (target.hp === 0) events.push({ type: 'faint', pokemon: target.pokemon.name })
  }
  tickField(state, events)
  applyTurnTerastallization(state.player, playerChoice, 'player', events)
  applyTurnTerastallization(state.opponent, opponentChoice, 'opponent', events)
  settlePhase(state, events)
  state.turn += 1
  const finalEvents = events.slice(finalEventStart)
  if (steps.length) {
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      state: cloneState(state),
      events: [...steps[steps.length - 1].events, ...finalEvents],
    }
  } else {
    steps.push({ state: cloneState(state), events: events.slice(1), action: null })
  }
  if (steps.length && events[0]?.type === 'turn') steps[0].events.unshift(events[0])
  return steps
}

export function resolveBattleTurn(
  current: BattleState,
  playerChoice: BattleChoice,
  opponentChoice: BattleChoice,
  random: RandomSource = Math.random,
) {
  const steps = resolveBattleTurnSteps(current, playerChoice, opponentChoice, random)
  const final = steps.at(-1)
  return {
    state: final?.state ?? cloneState(current),
    events: steps.flatMap((step) => step.events),
  }
}
