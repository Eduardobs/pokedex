import { getDamageMultiplier, type BattleType } from './type-chart'
import { calculatedStats, type Stats, type Team, type TeamMember, type TeamPokemon } from './teams'

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
export type BattleStatus = 'burn' | 'paralysis' | 'poison' | 'sleep' | null
export type BattlePokemon = {
  member: TeamMember
  pokemon: TeamPokemon
  stats: Stats
  ability: BattleResource
  item: BattleResource | null
  maxHp: number
  hp: number
  moves: { data: BattleMove; pp: number }[]
  stages: BattleStages
  status: BattleStatus
  sleepTurns: number
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
export type BattleSide = {
  team: Team
  roster: BattlePokemon[]
  active: number
  hazards: BattleHazards
  switchRequested: boolean
}
export type BattlePhase = 'choice' | 'player-switch' | 'opponent-switch' | 'won' | 'lost'
export type BattleState = { turn: number; player: BattleSide; opponent: BattleSide; phase: BattlePhase }
export type BattleChoice = { kind: 'move'; index: number; tera?: boolean } | { kind: 'switch'; index: number }
export type BattleEvent =
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
  | { type: 'status'; pokemon: string; status: Exclude<BattleStatus, null> }
  | { type: 'statusDamage'; pokemon: string; status: 'burn' | 'poison'; amount: number }
  | { type: 'asleep'; pokemon: string }
  | { type: 'wake'; pokemon: string }
  | { type: 'stage'; pokemon: string; stat: keyof BattleStages; change: number }
  | { type: 'failed'; pokemon: string }
  | { type: 'faint'; pokemon: string }
  | { type: 'win'; side: 'player' | 'opponent' }

type RandomSource = () => number
type BattleHazard = 'stealth-rock' | 'spikes' | 'toxic-spikes' | 'sticky-web'
type MoveOutcome = { hit: boolean; succeeded: boolean } | null

const emptyStages = (): BattleStages => ({ attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 })
const emptyHazards = (): BattleHazards => ({ stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false })
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
  const stats = calculatedStats(pokemon, member)
  const ability = pokemon.abilities.includes(member.ability) ? member.ability : pokemon.abilities[0]
  return {
    member,
    pokemon,
    stats,
    ability: details.ability ?? fallbackResource(ability),
    item: details.item ?? (member.item ? fallbackResource(member.item) : null),
    maxHp: stats[0],
    hp: stats[0],
    moves: moves.map((data) => ({ data, pp: data.pp })),
    stages: emptyStages(),
    status: null,
    sleepTurns: 0,
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
  return {
    turn: 1,
    player: {
      team: playerTeam,
      roster: player.map((pokemon, index) => ({ ...pokemon, hasEnteredBattle: index === 0 })),
      active: 0,
      hazards: emptyHazards(),
      switchRequested: false,
    },
    opponent: {
      team: opponentTeam,
      roster: opponent.map((pokemon, index) => ({ ...pokemon, hasEnteredBattle: index === 0 })),
      active: 0,
      hazards: emptyHazards(),
      switchRequested: false,
    },
    phase: 'choice',
  }
}

function cloneState(state: BattleState): BattleState {
  const cloneSide = (side: BattleSide): BattleSide => ({
    ...side,
    hazards: { ...side.hazards },
    roster: side.roster.map((pokemon) => ({
      ...pokemon,
      member: { ...pokemon.member },
      moves: pokemon.moves.map((move) => ({
        ...move,
        data: { ...move.data, statChanges: [...move.data.statChanges] },
      })),
      stages: { ...pokemon.stages },
    })),
  })
  return { ...state, player: cloneSide(state.player), opponent: cloneSide(state.opponent) }
}

function effectiveTypes(pokemon: BattlePokemon) {
  return pokemon.terastallized ? [pokemon.member.tera] : pokemon.pokemon.types
}

function isGrounded(pokemon: BattlePokemon) {
  return !effectiveTypes(pokemon).includes('flying')
}

export function battleMoveEffectiveness(move: BattleMove, defender: BattlePokemon) {
  return effectiveTypes(defender).reduce((value, type) => value * getDamageMultiplier(move.type, type as BattleType), 1)
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
      pokemon.status = 'poison'
      events.push({ type: 'status', pokemon: pokemon.pokemon.name, status: 'poison' })
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

function speed(pokemon: BattlePokemon) {
  const paralysis = pokemon.status === 'paralysis' ? 0.5 : 1
  return pokemon.stats[5] * stageMultiplier(pokemon.stages.speed) * paralysis
}

function canAct(pokemon: BattlePokemon, random: RandomSource, events: BattleEvent[]) {
  if (pokemon.status === 'sleep') {
    if (pokemon.sleepTurns > 0) {
      pokemon.sleepTurns -= 1
      events.push({ type: 'asleep', pokemon: pokemon.pokemon.name })
      return false
    }
    pokemon.status = null
    events.push({ type: 'wake', pokemon: pokemon.pokemon.name })
  }
  if (pokemon.status === 'paralysis' && random() < 0.25) {
    events.push({ type: 'failed', pokemon: pokemon.pokemon.name })
    return false
  }
  return true
}

function applyMove(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  moveSlot: number,
  random: RandomSource,
  events: BattleEvent[],
): MoveOutcome {
  const slot = attacker.moves[moveSlot]
  if (!slot || slot.pp <= 0 || attacker.hp <= 0 || defender.hp <= 0) return null
  slot.pp -= 1
  const move = slot.data
  events.push({ type: 'move', side: 'player', pokemon: attacker.pokemon.name, move: move.name })
  if (!canAct(attacker, random, events)) return { hit: false, succeeded: false }
  if (move.accuracy !== null && random() * 100 >= move.accuracy) {
    events.push({ type: 'miss', pokemon: defender.pokemon.name })
    return { hit: false, succeeded: false }
  }

  let succeeded = false
  if (move.damageClass !== 'status' && move.power) {
    const effectiveness = battleMoveEffectiveness(move, defender)
    if (effectiveness === 0) {
      events.push({ type: 'immune', pokemon: defender.pokemon.name })
      return { hit: false, succeeded: false }
    }
    const physical = move.damageClass === 'physical'
    const attack =
      attacker.stats[physical ? 1 : 3] * stageMultiplier(attacker.stages[physical ? 'attack' : 'specialAttack'])
    const defense =
      defender.stats[physical ? 2 : 4] * stageMultiplier(defender.stages[physical ? 'defense' : 'specialDefense'])
    const originalStab = attacker.pokemon.types.includes(move.type)
    const teraStab = attacker.terastallized && attacker.member.tera === move.type
    const stab = teraStab ? (originalStab ? 2 : 1.5) : originalStab ? 1.5 : 1
    const critical = random() < 1 / 24
    const burn = physical && attacker.status === 'burn' ? 0.5 : 1
    const variance = 0.85 + random() * 0.15
    const base = Math.floor(
      (((2 * attacker.member.level) / 5 + 2) * move.power * (attack / Math.max(1, defense))) / 50 + 2,
    )
    const damage = Math.max(1, Math.floor(base * stab * effectiveness * (critical ? 1.5 : 1) * burn * variance))
    defender.hp = Math.max(0, defender.hp - damage)
    events.push({ type: 'damage', pokemon: defender.pokemon.name, amount: damage, effectiveness, critical })
    if (move.drain) {
      const amount = Math.min(
        attacker.maxHp - attacker.hp,
        Math.max(1, Math.floor((damage * Math.abs(move.drain)) / 100)),
      )
      if (move.drain > 0 && amount > 0) {
        attacker.hp += amount
        events.push({ type: 'heal', pokemon: attacker.pokemon.name, amount })
      } else if (move.drain < 0)
        attacker.hp = Math.max(0, attacker.hp - Math.max(1, Math.floor((damage * Math.abs(move.drain)) / 100)))
    }
    succeeded = true
  }

  if (move.healing > 0) {
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

  const selfTarget = move.target === 'user'
  for (const change of move.statChanges) {
    const target = selfTarget || change.change > 0 ? attacker : defender
    const previous = target.stages[change.stat]
    target.stages[change.stat] = Math.max(-6, Math.min(6, previous + change.change))
    const applied = target.stages[change.stat] - previous
    if (applied) {
      events.push({ type: 'stage', pokemon: target.pokemon.name, stat: change.stat, change: applied })
      succeeded = true
    }
  }

  const statusTarget = selfTarget ? attacker : defender
  if (move.ailment && !statusTarget.status && statusTarget.hp > 0 && random() * 100 < move.ailmentChance) {
    const status = ({ burn: 'burn', paralysis: 'paralysis', poison: 'poison', sleep: 'sleep' } as const)[move.ailment]
    if (status) {
      statusTarget.status = status
      if (status === 'sleep') statusTarget.sleepTurns = 1 + Math.floor(random() * 3)
      events.push({ type: 'status', pokemon: statusTarget.pokemon.name, status })
      succeeded = true
    }
  }
  return { hit: true, succeeded }
}

function performChoice(
  own: BattleSide,
  foe: BattleSide,
  choice: BattleChoice,
  side: 'player' | 'opponent',
  random: RandomSource,
  events: BattleEvent[],
) {
  if (choice.kind === 'switch') {
    const replacement = own.roster[choice.index]
    if (!replacement || choice.index === own.active || replacement.hp <= 0) return
    own.roster[own.active].stages = emptyStages()
    own.active = choice.index
    replacement.stages = emptyStages()
    replacement.hasEnteredBattle = true
    own.switchRequested = false
    events.push({ type: 'switch', side, pokemon: replacement.pokemon.name })
    applyEntryHazards(own, replacement, events)
    if (replacement.hp === 0) events.push({ type: 'faint', pokemon: replacement.pokemon.name })
    return
  }
  const attacker = own.roster[own.active]
  const defender = foe.roster[foe.active]
  if (!attacker || !defender || attacker.hp <= 0) return
  const start = events.length
  const outcome = applyMove(attacker, defender, choice.index, random, events)
  for (let index = start; index < events.length; index += 1) {
    const event = events[index]
    if (event.type === 'move') event.side = side
  }
  if (!outcome) return
  let succeeded = outcome.succeeded
  const move = attacker.moves[choice.index]?.data
  if (outcome.hit && move) {
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
    }
    if (move.name === 'court-change') {
      const hazards = own.hazards
      own.hazards = foe.hazards
      foe.hazards = hazards
      succeeded = true
    }
    if (pivotMoves.has(move.name) && attacker.hp > 0 && availableSwitch(own) >= 0) {
      own.switchRequested = true
      succeeded = true
    }
    if (forceSwitchMoves.has(move.name) && defender.hp > 0 && availableSwitch(foe) >= 0) {
      foe.switchRequested = true
      succeeded = true
    }
  }
  if (!succeeded && outcome.hit) events.push({ type: 'failed', pokemon: attacker.pokemon.name })
  if (defender.hp === 0 && !events.some((event, index) => index >= start && event.type === 'faint'))
    events.push({ type: 'faint', pokemon: defender.pokemon.name })
}

function choicePriority(side: BattleSide, choice: BattleChoice) {
  if (choice.kind === 'switch') return 6
  return side.roster[side.active].moves[choice.index]?.data.priority ?? 0
}

function residual(side: BattleSide, events: BattleEvent[]) {
  const pokemon = side.roster[side.active]
  if (pokemon.hp <= 0 || (pokemon.status !== 'burn' && pokemon.status !== 'poison')) return
  const amount = Math.max(1, Math.floor(pokemon.maxHp / (pokemon.status === 'burn' ? 16 : 8)))
  pokemon.hp = Math.max(0, pokemon.hp - amount)
  events.push({ type: 'statusDamage', pokemon: pokemon.pokemon.name, status: pokemon.status, amount })
  if (pokemon.hp === 0) events.push({ type: 'faint', pokemon: pokemon.pokemon.name })
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

export function chooseOpponentAction(state: BattleState, random: RandomSource = Math.random): BattleChoice {
  const side = state.opponent
  if (state.phase === 'opponent-switch' || side.roster[side.active].hp === 0) {
    const choices = side.roster.flatMap((pokemon, index) => (index !== side.active && pokemon.hp > 0 ? [index] : []))
    return { kind: 'switch', index: choices[Math.floor(random() * choices.length)] }
  }
  const moves = side.roster[side.active].moves.flatMap((move, index) => (move.pp > 0 ? [index] : []))
  return {
    kind: 'move',
    index: moves[Math.floor(random() * moves.length)] ?? 0,
    tera: !side.roster[side.active].terastallized && random() < 0.12,
  }
}

export function resolveBattleTurn(
  current: BattleState,
  playerChoice: BattleChoice,
  opponentChoice: BattleChoice,
  random: RandomSource = Math.random,
) {
  const state = cloneState(current)
  const events: BattleEvent[] = [{ type: 'turn', turn: state.turn }]
  if (state.phase === 'player-switch') {
    performChoice(state.player, state.opponent, playerChoice, 'player', random, events)
    if (state.opponent.roster[state.opponent.active].hp === 0)
      performChoice(state.opponent, state.player, opponentChoice, 'opponent', random, events)
    settlePhase(state, events)
    return { state, events }
  }
  if (state.phase === 'opponent-switch') {
    performChoice(state.opponent, state.player, opponentChoice, 'opponent', random, events)
    settlePhase(state, events)
    return { state, events }
  }

  const playerPriority = choicePriority(state.player, playerChoice)
  const opponentPriority = choicePriority(state.opponent, opponentChoice)
  const playerSpeed = speed(state.player.roster[state.player.active])
  const opponentSpeed = speed(state.opponent.roster[state.opponent.active])
  const playerFirst =
    playerPriority > opponentPriority ||
    (playerPriority === opponentPriority &&
      (playerSpeed > opponentSpeed || (playerSpeed === opponentSpeed && random() < 0.5)))
  const actions = playerFirst
    ? [
        () => performChoice(state.player, state.opponent, playerChoice, 'player', random, events),
        () => performChoice(state.opponent, state.player, opponentChoice, 'opponent', random, events),
      ]
    : [
        () => performChoice(state.opponent, state.player, opponentChoice, 'opponent', random, events),
        () => performChoice(state.player, state.opponent, playerChoice, 'player', random, events),
      ]
  actions.forEach((action) => action())
  residual(state.player, events)
  residual(state.opponent, events)
  applyTurnTerastallization(state.player, playerChoice, 'player', events)
  applyTurnTerastallization(state.opponent, opponentChoice, 'opponent', events)
  settlePhase(state, events)
  state.turn += 1
  return { state, events }
}
