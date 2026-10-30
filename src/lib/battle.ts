import {
  abilityMemory,
  abilityName,
  abilityTypes,
  abilityGrounded,
  abilityBypassed,
  effectiveWeather,
  abilityEntry,
  abilityBeforeEntry,
  abilityExit,
  synchronizeAbilities,
  abilityStatMultiplier,
  abilityMovePriority,
  abilityMoveOrder,
  abilityAccuracy,
  abilityModifyMove,
  abilityBlocksMove,
  abilityPowerMultiplier,
  abilityAbsorbsHit,
  abilityAfterHit,
  abilityAfterMove,
  abilityResidual,
  abilityStage,
  abilityStatus,
  abilityConsumedItem,
  abilityTraps,
  abilityTera,
  abilitySpecialMove,
  abilityWeight,
  moveHasFlag,
  moveMakesContact,
  moveHasSecondary,
  abilityDamage,
  revealAbility,
  heldBattleItem,
  battlePokemonName,
  abilityObserveBoosts,
  abilityNotifyFaint,
  type AbilityMemory,
} from './battle-abilities'
import { chooseBattleOpponentAction, type BattleDifficulty } from './battle-ai'
import { getDamageMultiplier, type BattleType } from './type-chart'
import { calculatedCoreStats, calculatedStats, type Stats, type Team, type TeamMember, type TeamPokemon } from './teams'
import { supplementalMoveDamage, supplementalMoveEffect, supplementalMoveTimings } from './battle-move-effects'
import {
  supplementalAbilityMoveImmunities,
  supplementalAbilityStatusImmunities,
  supplementalAbilityWeather,
} from './battle-ability-effects'

export type BattleMove = {
  name: string
  type: BattleType
  damageClass: 'physical' | 'special' | 'status'
  bypassesSubstitute?: boolean
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
  statChanges: { stat: keyof BattleStages; change: number; target?: 'user' | 'target' }[]
  multiAccuracy?: boolean
  minHits?: number
  maxHits?: number
  critRate?: number
  flinchChance?: number
  statChance?: number | null
  descriptions?: { language: string; text: string }[]
}

// A virtual slot keeps the fallback out of learned moves and their PP.
export const STRUGGLE_INDEX = -1
export const STRUGGLE_MOVE: BattleMove = {
  name: 'struggle',
  type: 'normal',
  damageClass: 'physical',
  power: 50,
  accuracy: null,
  priority: 0,
  pp: 1,
  target: 'random-opponent',
  healing: 0,
  drain: 0,
  ailment: null,
  ailmentChance: 0,
  effectChance: null,
  statChanges: [],
}

export function battleMoveSlot(pokemon: BattlePokemon, index: number) {
  return index === STRUGGLE_INDEX ? { data: STRUGGLE_MOVE, pp: 1 } : pokemon.moves[index]
}

export type BattleStages = {
  accuracy: number
  evasion: number
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
  abilityMemory?: AbilityMemory
  abilitySuppressed?: boolean
  gorillaMoveIndex?: number
  skyDropTargetId?: string
  skyDropSourceId?: string
  previousMoveExecution?: { name: string; turn: number; succeeded: boolean }
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
  weatherSuppressed?: boolean
  primalWeather?: 'primordial-sea' | 'desolate-land' | 'delta-stream'
  weather: BattleWeather | null
  weatherTurns: number
  terrain: BattleTerrain | null
  terrainTurns: number
  trickRoomTurns: number
}
export type BattleSide = {
  totalFainted?: number
  team: Team
  roster: BattlePokemon[]
  active: number
  hazards: BattleHazards
  conditions: BattleSideConditions
  futureSight?: { turns: number; attacker: BattlePokemon; move: BattleMove }
  wish?: { turns: number; amount: number }
  switchRequested: boolean
}
export type BattlePhase = 'choice' | 'player-switch' | 'opponent-switch' | 'won' | 'lost'
export type BattleState = {
  turn: number
  player: BattleSide
  opponent: BattleSide
  field: BattleField
  phase: BattlePhase
  pendingTurn?: { side: 'player' | 'opponent'; choice: BattleChoice; memberId: string }[]
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
  | { type: 'damage'; pokemon: string; amount: number; effectiveness: number; critical: boolean; percentage?: number }
  | { type: 'hazardSet'; side: 'player' | 'opponent'; hazard: BattleHazard }
  | { type: 'hazardDamage'; pokemon: string; hazard: BattleHazard; amount: number; percentage?: number }
  | { type: 'hazardsCleared'; side: 'player' | 'opponent' }
  | { type: 'heal'; pokemon: string; amount: number; percentage?: number }
  | { type: 'substituteSet'; pokemon: string; hp: number }
  | { type: 'substituteDamage'; pokemon: string; amount: number; broken: boolean }
  | { type: 'itemRemoved'; pokemon: string; item: string }
  | { type: 'itemActivated'; pokemon: string; item: string; consumed: boolean }
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
  | {
      type: 'statusDamage'
      pokemon: string
      status: 'burn' | 'poison' | 'badly-poisoned' | 'curse'
      amount: number
      percentage?: number
    }
  | { type: 'weatherDamage'; pokemon: string; weather: 'sandstorm'; amount: number; percentage?: number }
  | { type: 'asleep'; pokemon: string; move?: string }
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
  | { type: 'failed'; pokemon: string; reason?: 'freeze' | 'paralysis'; move?: string }
  | { type: 'faint'; pokemon: string }
  | { type: 'win'; side: 'player' | 'opponent' }

type RandomSource = () => number
type BattleHazard = 'stealth-rock' | 'spikes' | 'toxic-spikes' | 'sticky-web'
type MoveOutcome = { hit: boolean; succeeded: boolean; hitSubstitute?: boolean } | null

const emptyStages = (): BattleStages => ({
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
  accuracy: 0,
  evasion: 0,
})
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
const hpPercentage = (amount: number, maxHp: number) => Math.round((amount / Math.max(1, maxHp)) * 1000) / 10
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

const typeBoostingItems: Partial<Record<BattleType, Set<string>>> = {
  normal: new Set(['silk-scarf']),
  fire: new Set(['charcoal', 'flame-plate']),
  water: new Set(['mystic-water', 'sea-incense', 'splash-plate', 'wave-incense']),
  electric: new Set(['magnet', 'zap-plate']),
  grass: new Set(['meadow-plate', 'miracle-seed', 'rose-incense']),
  ice: new Set(['icicle-plate', 'never-melt-ice']),
  fighting: new Set(['black-belt', 'fist-plate']),
  poison: new Set(['poison-barb', 'toxic-plate']),
  ground: new Set(['earth-plate', 'soft-sand']),
  flying: new Set(['sharp-beak', 'sky-plate']),
  psychic: new Set(['mind-plate', 'odd-incense', 'twisted-spoon']),
  bug: new Set(['insect-plate', 'silver-powder']),
  rock: new Set(['hard-stone', 'rock-incense', 'stone-plate']),
  ghost: new Set(['spooky-plate', 'spell-tag']),
  dragon: new Set(['draco-plate', 'dragon-fang']),
  dark: new Set(['black-glasses', 'dread-plate']),
  steel: new Set(['iron-plate', 'metal-coat']),
  fairy: new Set(['fairy-feather', 'pixie-plate']),
}

function activateItem(pokemon: BattlePokemon, events: BattleEvent[], consumed = false) {
  if (!pokemon.item) return
  const consumedResource = pokemon.item
  const item = pokemon.item.name
  const alreadyRevealed = pokemon.member.itemActive
  pokemon.member.itemActive = true
  if (consumed || !alreadyRevealed)
    events.push({ type: 'itemActivated', pokemon: battlePokemonName(pokemon), item, consumed })
  if (consumed) {
    pokemon.item = null
    abilityConsumedItem(pokemon, consumedResource, events)
  }
}

function applyWhiteHerb(pokemon: BattlePokemon, events: BattleEvent[]) {
  if (heldBattleItem(pokemon) !== 'white-herb' || !Object.values(pokemon.stages).some((stage) => stage < 0)) return
  activateItem(pokemon, events, true)
  for (const stat of Object.keys(pokemon.stages) as (keyof BattleStages)[]) {
    if (pokemon.stages[stat] < 0) pokemon.stages[stat] = 0
  }
  events.push({ type: 'stagesReset', pokemon: battlePokemonName(pokemon) })
}

function applyHpThresholdItem(pokemon: BattlePokemon, events: BattleEvent[]) {
  const item = pokemon.abilityMemory?.itemBlocked ? undefined : heldBattleItem(pokemon)
  if (!item || pokemon.abilityMemory?.berryBlocked || pokemon.hp <= 0 || pokemon.volatile['heal-block']) return
  const pinch = [
    'figy-berry',
    'wiki-berry',
    'mago-berry',
    'aguav-berry',
    'iapapa-berry',
    'liechi-berry',
    'ganlon-berry',
    'petaya-berry',
    'apicot-berry',
    'salac-berry',
  ].includes(item)
  const threshold = pinch && abilityName(pokemon) !== 'gluttony' ? 4 : 2
  if (pokemon.hp * threshold > pokemon.maxHp) return
  const berryStat = (
    {
      'liechi-berry': 'attack',
      'ganlon-berry': 'defense',
      'petaya-berry': 'specialAttack',
      'apicot-berry': 'specialDefense',
      'salac-berry': 'speed',
    } as const
  )[item]
  if (berryStat) {
    activateItem(pokemon, events, true)
    abilityStage(pokemon, berryStat, abilityName(pokemon) === 'ripen' ? 2 : 1, events)
    return
  }
  const amount =
    (item === 'sitrus-berry'
      ? Math.floor(pokemon.maxHp / 4)
      : item === 'oran-berry'
        ? 10
        : pinch
          ? Math.floor(pokemon.maxHp / 3)
          : 0) * (abilityName(pokemon) === 'ripen' ? 2 : 1)
  if (!amount || pokemon.hp >= pokemon.maxHp) return
  const healed = Math.min(pokemon.maxHp - pokemon.hp, amount)
  activateItem(pokemon, events, true)
  pokemon.hp += healed
  events.push({
    type: 'heal',
    pokemon: battlePokemonName(pokemon),
    amount: healed,
    percentage: hpPercentage(healed, pokemon.maxHp),
  })
}

function applyStatusHealingItem(pokemon: BattlePokemon, events: BattleEvent[]) {
  if (pokemon.abilityMemory?.itemBlocked || pokemon.abilityMemory?.berryBlocked) return
  const item = heldBattleItem(pokemon)
  const curesStatus =
    item === 'lum-berry' ||
    (item === 'cheri-berry' && pokemon.status === 'paralysis') ||
    (item === 'chesto-berry' && pokemon.status === 'sleep') ||
    (item === 'pecha-berry' && isPoisoned(pokemon)) ||
    (item === 'rawst-berry' && pokemon.status === 'burn') ||
    (item === 'aspear-berry' && pokemon.status === 'freeze')
  if (pokemon.status && curesStatus) {
    const status = pokemon.status
    activateItem(pokemon, events, true)
    pokemon.status = null
    pokemon.sleepTurns = 0
    pokemon.toxicTurns = 0
    events.push({ type: 'statusCured', pokemon: battlePokemonName(pokemon), status })
  } else if (item === 'lum-berry' && pokemon.confusionTurns > 0) {
    activateItem(pokemon, events, true)
    pokemon.confusionTurns = 0
    events.push({ type: 'statusCured', pokemon: battlePokemonName(pokemon), status: 'confusion' })
  }
}

function heldItemStatMultiplier(pokemon: BattlePokemon, index: number) {
  if (pokemon.abilityMemory?.itemBlocked) return 1
  const item = heldBattleItem(pokemon)
  if (!item) return 1
  if (item === 'choice-band' && index === 1) return 1.5
  if (item === 'choice-specs' && index === 3) return 1.5
  if (item === 'choice-scarf' && index === 5) return 1.5
  if (item === 'assault-vest' && index === 4) return 1.5
  if (item === 'iron-ball' || item === 'macho-brace' || /^power-(weight|bracer|belt|lens|band|anklet)$/.test(item))
    return index === 5 ? 0.5 : 1
  if (item === 'deep-sea-tooth' && pokemon.pokemon.species === 'clamperl' && index === 3) return 2
  if (item === 'deep-sea-scale' && pokemon.pokemon.species === 'clamperl' && index === 4) return 2
  if (item === 'light-ball' && pokemon.pokemon.species === 'pikachu' && (index === 1 || index === 3)) return 2
  if (item === 'thick-club' && ['cubone', 'marowak'].includes(pokemon.pokemon.species) && index === 1) return 2
  if (item === 'quick-powder' && pokemon.pokemon.name === 'ditto' && index === 5) return 2
  if (item === 'metal-powder' && pokemon.pokemon.name === 'ditto' && index === 2) return 2
  if (item === 'eviolite' && pokemon.member.itemActive && (index === 2 || index === 4)) return 1.5
  return 1
}

function heldItemPowerModifier(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: BattleMove,
  effectiveness: number,
  events: BattleEvent[],
) {
  const item = attacker.abilityMemory?.itemBlocked ? undefined : heldBattleItem(attacker)
  if (move.name === 'knock-off' && defender.item) return 1.5
  if (!item) return 1
  if (item === 'life-orb') return 1.3
  if (item === 'expert-belt' && effectiveness > 1) return 1.2
  if (item === 'muscle-band' && move.damageClass === 'physical') return 1.1
  if (item === 'wise-glasses' && move.damageClass === 'special') return 1.1
  if (move.name === 'struggle') return 1
  if (typeBoostingItems[move.type]?.has(item)) return 1.2
  if (item === `${move.type}-gem`) {
    activateItem(attacker, events, true)
    return 1.3
  }
  return 1
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
  // Battle conditions are resolved by live ability hooks; team-editor preview toggles
  // must not pre-activate conditional boosts.
  const stats = calculatedStats(pokemon, {
    ...member,
    item: '',
    itemActive: false,
    abilityActive: false,
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
  for (const side of [state.player, state.opponent]) abilityMemory(side.roster[0]).activeTurns = 1
  const entryEvents: BattleEvent[] = []
  const entryOrder = [state.player, state.opponent].sort(
    (left, right) => currentBattleStats(right.roster[0])[5] - currentBattleStats(left.roster[0])[5],
  )
  for (const side of entryOrder) {
    const foe = side === state.player ? state.opponent : state.player
    applyEntryAbility(side, foe, state.field, entryEvents, side === state.player ? 'player' : 'opponent')
    applyWhiteHerb(side.roster[0], entryEvents)
    applyWhiteHerb(foe.roster[0], entryEvents)
  }
  for (const side of [state.player, state.opponent]) abilityMemory(side.roster[0]).activeTurns = 1
  synchronizeAbilities(state.player, state.opponent, state.field, entryEvents)
  return state
}

function cloneState(state: BattleState): BattleState {
  const cloneSide = (side: BattleSide): BattleSide => ({
    ...side,
    futureSight: side.futureSight ? { ...side.futureSight } : undefined,
    wish: side.wish ? { ...side.wish } : undefined,
    hazards: { ...side.hazards },
    conditions: { ...side.conditions },
    roster: side.roster.map((pokemon) => ({
      ...pokemon,
      member: { ...pokemon.member },
      abilityMemory: pokemon.abilityMemory
        ? {
            ...pokemon.abilityMemory,
            types: pokemon.abilityMemory.types ? [...pokemon.abilityMemory.types] : undefined,
            originalMoves: pokemon.abilityMemory.originalMoves?.map((slot) => ({
              ...slot,
              data: { ...slot.data, statChanges: [...slot.data.statChanges] },
            })),
          }
        : undefined,
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
  return abilityTypes(pokemon)
}

function isGrounded(pokemon: BattlePokemon) {
  return abilityGrounded(pokemon)
}

export function battleMoveEffectiveness(move: BattleMove, defender: BattlePokemon, attacker?: BattlePokemon) {
  if (move.name === 'struggle') return 1
  const immunity = supplementalAbilityMoveImmunities[abilityName(defender)]
  const bypassesAbility = attacker && abilityBypassed(attacker, defender, move)
  if (
    !bypassesAbility &&
    immunity?.type === move.type &&
    !(['levitate', 'eelevate'].includes(abilityName(defender)) && isGrounded(defender))
  )
    return 0
  const typeEffectiveness = effectiveTypes(defender).reduce(
    (value, type) =>
      value *
      (type === 'ghost' &&
      ['normal', 'fighting'].includes(move.type) &&
      attacker &&
      ['scrappy', 'minds-eye'].includes(abilityName(attacker))
        ? 1
        : getDamageMultiplier(move.type, type as BattleType)),
    1,
  )
  if (
    !bypassesAbility &&
    abilityName(defender) === 'tera-shell' &&
    defender.hp === defender.maxHp &&
    move.damageClass !== 'status'
  )
    return typeEffectiveness === 0 ? 0 : 0.5
  const effectiveness = typeEffectiveness * (move.type === 'fire' && defender.volatile['tar-shot'] ? 2 : 1)
  return !bypassesAbility && abilityName(defender) === 'wonder-guard' && effectiveness <= 1 ? 0 : effectiveness
}

export function battleSameTypeAttackBonus(attacker: BattlePokemon, moveType: BattleType) {
  const matchesOriginalType = (attacker.abilityMemory?.types ?? attacker.pokemon.types).includes(moveType)
  const matchesTeraType = attacker.terastallized && attacker.member.tera === moveType
  const adaptability = abilityName(attacker) === 'adaptability'
  if (matchesTeraType) return matchesOriginalType ? (adaptability ? 2.25 : 2) : adaptability ? 2 : 1.5
  return matchesOriginalType ? (adaptability ? 2 : 1.5) : 1
}

/** Returns the current stats used by the battle after stage and status modifiers. */
export function currentBattleStats(pokemon: BattlePokemon, field?: BattleField, foe?: BattlePokemon): Stats {
  const ability = abilityName(pokemon)
  const hasStatus = pokemon.status !== null
  const statusAbilityMultiplier = (matches: boolean, factor: number) => (hasStatus && matches ? factor : 1)
  const attack =
    pokemon.stats[1] *
    statusAbilityMultiplier(ability === 'guts' || (ability === 'toxic-boost' && isPoisoned(pokemon)), 1.5) *
    (pokemon.status === 'burn' && ability !== 'guts' ? 0.5 : 1)
  const defense = pokemon.stats[2] * statusAbilityMultiplier(ability === 'marvel-scale', 1.5)
  const specialAttack =
    pokemon.stats[3] * statusAbilityMultiplier(ability === 'flare-boost' && pokemon.status === 'burn', 1.5)
  const speedMultiplier = statusAbilityMultiplier(ability === 'quick-feet', 1.5)
  const values: Stats = [
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
  return values.map((value, index) =>
    Math.floor(value * heldItemStatMultiplier(pokemon, index) * abilityStatMultiplier(pokemon, index, field, foe)),
  ) as Stats
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
  if (abilityName(pokemon) === 'magic-guard' || heldBattleItem(pokemon) === 'heavy-duty-boots') return
  const damage = (hazard: BattleHazard, amount: number) => {
    if (amount <= 0 || pokemon.hp <= 0) return
    const applied = Math.min(pokemon.hp, amount)
    pokemon.hp -= applied
    events.push({
      type: 'hazardDamage',
      pokemon: battlePokemonName(pokemon),
      hazard,
      amount: applied,
      percentage: hpPercentage(applied, pokemon.maxHp),
    })
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
    else if (
      !effectiveTypes(pokemon).includes('steel') &&
      !pokemon.status &&
      !majorStatusImmune('poison', pokemon, pokemon, side)
    ) {
      pokemon.status = side.hazards.toxicSpikes >= 2 ? 'badly-poisoned' : 'poison'
      pokemon.toxicTurns = 0
      events.push({ type: 'status', pokemon: battlePokemonName(pokemon), status: pokemon.status })
    }
  }
  if (side.hazards.stickyWeb && isGrounded(pokemon)) {
    abilityStage(pokemon, 'speed', -1, events, { ...pokemon })
  }
}

function speed(side: BattleSide, field: BattleField, foe?: BattlePokemon) {
  const pokemon = side.roster[side.active]
  const weatherSpeed = supplementalAbilityWeather[abilityName(pokemon)]?.find(
    (rule) => rule.weather === effectiveWeather(field) && rule.speedMultiplier,
  )?.speedMultiplier
  return (
    currentBattleStats(pokemon, field, foe)[5] *
    (weatherSpeed ?? 1) *
    (abilityName(pokemon) === 'surge-surfer' && field.terrain === 'electric' ? 2 : 1) *
    (side.conditions.tailwind > 0 ? 2 : 1)
  )
}

function confusionDamage(pokemon: BattlePokemon) {
  const stats = currentBattleStats(pokemon)
  const base = Math.floor((((2 * pokemon.member.level) / 5 + 2) * 40 * (stats[1] / Math.max(1, stats[2]))) / 50 + 2)
  return Math.max(1, base)
}

function canAct(pokemon: BattlePokemon, move: BattleMove, random: RandomSource, events: BattleEvent[]) {
  if (pokemon.volatile.flinch && abilityName(pokemon) !== 'inner-focus') {
    if (abilityName(pokemon) === 'steadfast') abilityStage(pokemon, 'speed', 1, events)
    delete pokemon.volatile.flinch
    events.push({ type: 'failed', pokemon: battlePokemonName(pokemon) })
    return false
  }
  if (pokemon.status === 'sleep') {
    if (pokemon.sleepTurns > 0) {
      pokemon.sleepTurns = Math.max(0, pokemon.sleepTurns - (abilityName(pokemon) === 'early-bird' ? 2 : 1))
      if (abilityName(pokemon) !== 'early-bird' || pokemon.sleepTurns > 0) {
        if (sleepUsableMoves.has(move.name)) {
          events.push({ type: 'asleep', pokemon: battlePokemonName(pokemon) })
          return true
        }
        events.push({ type: 'asleep', pokemon: battlePokemonName(pokemon), move: move.name })
        return false
      }
    }
    pokemon.status = null
    events.push({ type: 'wake', pokemon: battlePokemonName(pokemon) })
  }
  if (pokemon.status === 'paralysis' && random() < 0.25) {
    events.push({ type: 'failed', pokemon: battlePokemonName(pokemon), reason: 'paralysis', move: move.name })
    return false
  }
  if (pokemon.status === 'freeze') {
    if (freezeThawingMoves.has(move.name)) {
      pokemon.status = null
      events.push({ type: 'thaw', pokemon: battlePokemonName(pokemon) })
    } else if (random() >= 0.2) {
      events.push({ type: 'failed', pokemon: battlePokemonName(pokemon), reason: 'freeze', move: move.name })
      return false
    } else {
      pokemon.status = null
      events.push({ type: 'thaw', pokemon: battlePokemonName(pokemon) })
    }
  }
  if (abilityName(pokemon) === 'truant') {
    const loaf = abilityMemory(pokemon).truant
    abilityMemory(pokemon).truant = !loaf
    if (loaf) {
      revealAbility(pokemon, events)
      events.push({ type: 'failed', pokemon: battlePokemonName(pokemon) })
      return false
    }
  }
  if (pokemon.confusionTurns > 0) {
    pokemon.confusionTurns -= 1
    if (random() < 1 / 3) {
      const amount = Math.min(pokemon.hp, confusionDamage(pokemon))
      pokemon.hp -= amount
      events.push({
        type: 'damage',
        pokemon: battlePokemonName(pokemon),
        amount,
        effectiveness: 1,
        critical: false,
        percentage: hpPercentage(amount, pokemon.maxHp),
      })
      if (pokemon.hp === 0) events.push({ type: 'faint', pokemon: battlePokemonName(pokemon) })
      if (pokemon.confusionTurns === 0)
        events.push({ type: 'statusCured', pokemon: battlePokemonName(pokemon), status: 'confusion' })
      return false
    }
    if (pokemon.confusionTurns === 0)
      events.push({ type: 'statusCured', pokemon: battlePokemonName(pokemon), status: 'confusion' })
  }
  if (pokemon.attracted && random() < 0.5) {
    events.push({ type: 'failed', pokemon: battlePokemonName(pokemon) })
    return false
  }
  return true
}

function applyEntryAbility(
  own: BattleSide,
  foe: BattleSide,
  field: BattleField,
  events: BattleEvent[],
  side: 'player' | 'opponent' = 'player',
  resuming = false,
) {
  abilityEntry(own, foe, field, events, side, resuming)
  const pokemon = own.roster[own.active]
  if (!pokemon || pokemon.hp <= 0) return
  const ability = abilityName(pokemon)
  const stage = entryStageAbilities[ability]
  const weather = entryWeatherAbilities[ability]
  const terrain = entryTerrainAbilities[ability]
  const activates = Boolean(
    (stage && !abilityMemory(pokemon).entered) || weather || terrain || ability === 'intimidate',
  )
  if (!activates) return

  events.push({ type: 'ability', pokemon: battlePokemonName(pokemon), ability })
  if (stage && !abilityMemory(pokemon).entered) {
    abilityMemory(pokemon).entered = true
    abilityStage(pokemon, stage, 1, events)
  }
  if (weather && !field.primalWeather) {
    field.weather = weather
    const weatherRock = {
      rain: 'damp-rock',
      sun: 'heat-rock',
      sandstorm: 'smooth-rock',
      snow: 'icy-rock',
    }[weather]
    field.weatherTurns = heldBattleItem(pokemon) === weatherRock ? 8 : 5
    if (field.weatherTurns === 8) activateItem(pokemon, events)
    events.push({ type: 'fieldSet', field: weather, turns: field.weatherTurns })
  }
  if (terrain) {
    field.terrain = terrain
    field.terrainTurns = heldBattleItem(pokemon) === 'terrain-extender' ? 8 : 5
    if (field.terrainTurns === 8) activateItem(pokemon, events)
    events.push({ type: 'fieldSet', field: terrain, turns: field.terrainTurns })
  }
  if (ability === 'intimidate') {
    const target = foe.roster[foe.active]
    if (!target || target.hp <= 0 || target.substituteHp > 0) return
    const immune = ['inner-focus', 'oblivious', 'own-tempo', 'scrappy'].includes(abilityName(target))
    if (abilityName(target) === 'guard-dog') abilityStage(target, 'attack', 1, events)
    else if (!immune) abilityStage(target, 'attack', -1, events, pokemon)
    if (abilityName(target) === 'rattled') abilityStage(target, 'speed', 1, events)
  }
}

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
  const legal = pokemon.moves.flatMap((move, index) => {
    if (move.pp <= 0) return []
    if (
      abilityName(pokemon) === 'gorilla-tactics' &&
      pokemon.gorillaMoveIndex !== undefined &&
      pokemon.gorillaMoveIndex !== index
    )
      return []
    if (pokemon.encoreTurns > 0 && pokemon.encoreMoveIndex !== index) return []
    if (pokemon.tauntTurns > 0 && move.data.damageClass === 'status') return []
    if (
      !pokemon.abilityMemory?.itemBlocked &&
      pokemon.item?.name === 'assault-vest' &&
      move.data.damageClass === 'status'
    )
      return []
    if (pokemon.disabledMoveIndex === index && pokemon.volatile.disable) return []
    if (pokemon.volatile.torment && pokemon.lastMoveIndex === index) return []
    if (pokemon.volatile['throat-chop'] && soundMoves.has(move.data.name)) return []
    if (
      !pokemon.abilityMemory?.itemBlocked &&
      pokemon.item?.name.startsWith('choice-') &&
      pokemon.lastMoveIndex !== null &&
      pokemon.lastMoveIndex !== index
    )
      return []
    return [index]
  })
  return legal.length ? legal : [STRUGGLE_INDEX]
}

function selectedBattleMoveIndex(pokemon: BattlePokemon, requestedIndex: number) {
  if (legalBattleMoveIndexes(pokemon).includes(STRUGGLE_INDEX)) return STRUGGLE_INDEX
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
  attacker?: BattlePokemon,
  move?: BattleMove,
) {
  if (defender.substituteHp > 0 && !move?.bypassesSubstitute) {
    const amount = Math.min(defender.substituteHp, damage)
    defender.substituteHp -= amount
    events.push({
      type: 'substituteDamage',
      pokemon: battlePokemonName(defender),
      amount,
      broken: defender.substituteHp === 0,
    })
    return { amount, hitSubstitute: true }
  }
  if (
    abilityName(defender) === 'sturdy' &&
    (!attacker || !abilityBypassed(attacker, defender, move)) &&
    defender.hp === defender.maxHp &&
    damage >= defender.hp
  ) {
    damage = Math.max(0, defender.hp - 1)
    revealAbility(defender, events)
  }
  if (
    !defender.abilityMemory?.itemBlocked &&
    heldBattleItem(defender) === 'focus-sash' &&
    defender.hp === defender.maxHp &&
    damage >= defender.hp
  ) {
    activateItem(defender, events, true)
    damage = Math.max(0, defender.hp - 1)
  }
  const amount = Math.min(defender.hp, damage)
  defender.hp -= amount
  events.push({
    type: 'damage',
    pokemon: battlePokemonName(defender),
    amount,
    effectiveness,
    critical,
    percentage: hpPercentage(amount, defender.maxHp),
  })
  if (effectiveness > 1 && defender.hp > 0 && heldBattleItem(defender) === 'weakness-policy') {
    activateItem(defender, events, true)
    for (const stat of ['attack', 'specialAttack'] as const) {
      abilityStage(defender, stat, 2, events)
    }
  }
  applyHpThresholdItem(defender, events)
  return { amount, hitSubstitute: false }
}

function solarMoveHasSun(attacker: BattlePokemon, defender: BattlePokemon, field: BattleField) {
  return (
    effectiveWeather(field) === 'sun' ||
    abilityName(attacker) === 'mega-sol' ||
    abilityName(attacker) === 'desolate-land' ||
    abilityName(defender) === 'desolate-land'
  )
}

function fieldPowerModifier(move: BattleMove, attacker: BattlePokemon, defender: BattlePokemon, field: BattleField) {
  const semiInvulnerable = semiInvulnerableMultiplier(defender, move)
  let modifier =
    semiInvulnerable === 0 && [abilityName(attacker), abilityName(defender)].includes('no-guard') ? 1 : semiInvulnerable
  if (['solar-beam', 'solar-blade'].includes(move.name) && field.weather && !solarMoveHasSun(attacker, defender, field))
    modifier *= 0.5
  const moveWeather = abilityName(attacker) === 'mega-sol' ? 'sun' : effectiveWeather(field)
  if (moveWeather === 'rain') modifier *= move.type === 'water' ? 1.5 : move.type === 'fire' ? 0.5 : 1
  if (moveWeather === 'sun') modifier *= move.type === 'fire' ? 1.5 : move.type === 'water' ? 0.5 : 1
  if (abilityName(attacker) === 'flash-fire' && attacker.member.abilityActive && move.type === 'fire') modifier *= 1.5
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

/** Accuracy and evasion are separate ratios, as defined by the battle rules. */
export function battleHitProbability(
  move: BattleMove,
  attacker: BattlePokemon,
  defender: BattlePokemon,
  field: BattleField,
) {
  const ability = abilityAccuracy(move, attacker, defender, field)
  if (ability.always || move.accuracy === null || defender.volatile.telekinesis) return 1
  const multiplier = (value: number) => {
    const stage = Math.max(-6, Math.min(6, value))
    return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage)
  }
  let probability =
    ((move.accuracy / 100) * multiplier(attacker.stages.accuracy)) /
    multiplier(ability.ignoreEvasion ? 0 : defender.stages.evasion)
  if (!defender.abilityMemory?.itemBlocked && defender.item?.name === 'bright-powder') probability *= 0.9
  if (
    (abilityName(defender) === 'snow-cloak' && effectiveWeather(field) === 'snow') ||
    (abilityName(defender) === 'sand-veil' && effectiveWeather(field) === 'sandstorm')
  )
    probability /= 1.25
  return Math.max(0, Math.min(1, probability * ability.modifier))
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
  move?: BattleMove,
) {
  const ability = abilityBypassed(attacker, target, move) ? '' : abilityName(target)
  if (
    (targetSide?.conditions.safeguard && abilityName(attacker) !== 'infiltrator') ||
    ability === 'comatose' ||
    ability === 'purifying-salt' ||
    (ability === 'shields-down' && !target.pokemon.name.includes('core')) ||
    (ability === 'flower-veil' && effectiveTypes(target).includes('grass'))
  )
    return true
  if (ability === 'leaf-guard' && field?.weather === 'sun') return true
  if (status === 'burn')
    return (
      effectiveTypes(target).includes('fire') || supplementalAbilityStatusImmunities.burn?.includes(ability) === true
    )
  if (status === 'freeze')
    return (
      effectiveTypes(target).includes('ice') || supplementalAbilityStatusImmunities.freeze?.includes(ability) === true
    )
  if (status === 'paralysis')
    return (
      effectiveTypes(target).includes('electric') ||
      supplementalAbilityStatusImmunities.paralysis?.includes(ability) === true
    )
  if (isPoisonStatus(status))
    return (
      supplementalAbilityStatusImmunities[status]?.includes(ability) === true ||
      ((effectiveTypes(target).includes('poison') || effectiveTypes(target).includes('steel')) &&
        abilityName(attacker) !== 'corrosion')
    )
  return supplementalAbilityStatusImmunities.sleep?.includes(ability) === true
}

function applyAbilityMoveImmunity(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: BattleMove,
  events: BattleEvent[],
) {
  if (move.name === 'struggle') return false
  if (abilityBypassed(attacker, defender, move)) return false
  const rule = supplementalAbilityMoveImmunities[abilityName(defender)]
  if (
    !rule ||
    rule.type !== move.type ||
    (['levitate', 'eelevate'].includes(abilityName(defender)) && isGrounded(defender))
  )
    return false
  events.push({ type: 'ability', pokemon: battlePokemonName(defender), ability: abilityName(defender) })
  events.push({ type: 'immune', pokemon: battlePokemonName(defender) })
  if (rule.healFraction && defender.hp < defender.maxHp && !defender.volatile['heal-block']) {
    const amount = Math.min(defender.maxHp - defender.hp, Math.max(1, Math.floor(defender.maxHp * rule.healFraction)))
    defender.hp += amount
    events.push({
      type: 'heal',
      pokemon: battlePokemonName(defender),
      amount,
      percentage: hpPercentage(amount, defender.maxHp),
    })
  }
  if (rule.boost) {
    abilityStage(defender, rule.boost.stat, rule.boost.stages, events)
  }
  if (rule.activatesPowerBoost) defender.member.abilityActive = true
  return true
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
  move?: BattleMove,
) {
  const ability = abilityBypassed(attacker, target, move) ? '' : abilityName(target)
  if (
    (targetSide.conditions.safeguard && abilityName(attacker) !== 'infiltrator') ||
    (field.terrain === 'misty' && isGrounded(target))
  )
    return false
  if (status === 'confusion') return target.confusionTurns === 0 && ability !== 'own-tempo'
  if (status === 'attraction')
    return (
      !target.attracted &&
      !['oblivious', 'aroma-veil'].includes(ability) &&
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
  blockedByRepeat = false,
  attackingSide?: BattleSide,
  calledMove?: BattleMove,
  moveSide: 'player' | 'opponent' = 'player',
): MoveOutcome {
  const slot = calledMove ? { data: calledMove, pp: 1 } : battleMoveSlot(attacker, moveSlot)
  const releasing = attacker.chargingMoveIndex === moveSlot
  if (!slot || (!releasing && slot.pp <= 0) || attacker.hp <= 0 || defender.hp <= 0) return null
  if (!calledMove && !releasing && moveSlot !== STRUGGLE_INDEX) {
    const targetsOpponent = [
      'selected-pokemon',
      'all-opponents',
      'all-other-pokemon',
      'random-opponent',
      'all-pokemon',
    ].includes(slot.data.target)
    const pressure = targetsOpponent && abilityName(defender) === 'pressure'
    slot.pp = Math.max(0, slot.pp - (pressure ? 2 : 1))
    if (pressure) events.push({ type: 'ability', pokemon: battlePokemonName(defender), ability: 'pressure' })
  }
  const timing = supplementalMoveTimings[slot.data.name]
  const boost = timing?.chargeBoost
  const move = { ...slot.data, statChanges: boost ? [] : [...slot.data.statChanges] }
  if (move.name === 'geomancy')
    move.statChanges = (['specialAttack', 'specialDefense', 'speed'] as const).map((stat) => ({
      stat,
      change: 2,
    }))
  const secondary = ({ bounce: 'paralysis', 'freeze-shock': 'paralysis', 'ice-burn': 'burn' } as const)[move.name]
  if (move.name === 'sky-attack' && !move.flinchChance) move.flinchChance = move.effectChance ?? 30
  if (secondary) {
    move.ailment = secondary
    move.ailmentChance = move.effectChance ?? 30
  }
  const releasingCarry = releasing && timing?.carriesTarget
  const carriedTargetMatches =
    defender.member.id === attacker.skyDropTargetId && defender.skyDropSourceId === attacker.member.id
  if (releasingCarry) {
    delete attacker.skyDropTargetId
    for (const target of defendingSide.roster) {
      if (target.skyDropSourceId === attacker.member.id) delete target.skyDropSourceId
    }
  }
  delete attacker.chargingMoveIndex
  const curse = supplementalMoveEffect(move.name)?.kind === 'curse'
  const ghostCurse = curse && effectiveTypes(attacker).includes('ghost')
  if (!calledMove && moveSlot !== STRUGGLE_INDEX) attacker.lastMoveIndex = moveSlot
  if (!skipActionCheck && !canAct(attacker, move, random, events)) return { hit: false, succeeded: false }
  events.push({ type: 'move', side: moveSide, pokemon: battlePokemonName(attacker), move: move.name })
  const abilityMovePower = abilityModifyMove(attacker, defender, move, field, events)
  if (abilityBlocksMove(attacker, defender, move, field, events)) return { hit: false, succeeded: false }
  if (blockedByRepeat || (releasingCarry && !carriedTargetMatches)) return { hit: true, succeeded: false }
  const blessing = supplementalMoveEffect(move.name)
  if (blessing?.kind === 'revive-ally') return { hit: true, succeeded: false }
  if (blessing?.kind === 'lunar-blessing') {
    if (attacker.volatile['heal-block']) return { hit: true, succeeded: false }
    let succeeded = false
    if (attacker.status) {
      events.push({ type: 'statusCured', pokemon: battlePokemonName(attacker), status: attacker.status })
      attacker.status = null
      attacker.sleepTurns = 0
      attacker.toxicTurns = 0
      succeeded = true
    }
    const amount = Math.min(attacker.maxHp - attacker.hp, Math.max(1, Math.floor(attacker.maxHp / 2)))
    if (amount > 0) {
      attacker.hp += amount
      events.push({
        type: 'heal',
        pokemon: battlePokemonName(attacker),
        amount,
        percentage: hpPercentage(amount, attacker.maxHp),
      })
      succeeded = true
    }
    if (abilityStage(attacker, 'evasion', 1, events)) succeeded = true
    return { hit: true, succeeded }
  }
  if (!delayed && move.name === 'future-sight') {
    if (defendingSide.futureSight) return { hit: true, succeeded: false }
    defendingSide.futureSight = {
      turns: 3,
      attacker: { ...attacker, stages: { ...attacker.stages }, moves: attacker.moves.map((slot) => ({ ...slot })) },
      move,
    }
    events.push({ type: 'futureSight', pokemon: battlePokemonName(defender) })
    return { hit: false, succeeded: true }
  }
  if (!releasing && timing?.chargeTurns && !timing.carriesTarget) {
    if (boost) {
      abilityStage(attacker, boost, 1, events)
    }
    const naturallyInstant =
      (timing.instantWeather === 'sun' && solarMoveHasSun(attacker, defender, field)) ||
      (timing.instantWeather === 'rain' && effectiveWeather(field) === 'rain')
    const usesPowerHerb = attacker.item?.name === 'power-herb' && !naturallyInstant
    const instant = usesPowerHerb || naturallyInstant
    if (usesPowerHerb) activateItem(attacker, events, true)
    if (!instant) {
      attacker.chargingMoveIndex = moveSlot
      events.push({ type: 'charging', pokemon: battlePokemonName(attacker) })
      return { hit: false, succeeded: true }
    }
  }
  if (sleepUsableMoves.has(move.name) && attacker.status !== 'sleep' && abilityName(attacker) !== 'comatose')
    return { hit: true, succeeded: false }
  if (move.name === 'sleep-talk') {
    const choices = attacker.moves.flatMap((candidate, index) =>
      index !== moveSlot && candidate.data.name !== 'sleep-talk' && candidate.pp > 0 ? [index] : [],
    )
    const selected = choices[Math.floor(random() * choices.length)]
    return selected === undefined
      ? { hit: true, succeeded: false }
      : applyMove(
          attacker,
          defender,
          defendingSide,
          field,
          selected,
          random,
          events,
          true,
          false,
          false,
          attackingSide,
          undefined,
          moveSide,
        )
  }
  if (!['protect', 'detect'].includes(move.name)) attacker.protectStreak = 0
  if (
    [
      'protect',
      'detect',
      'kings-shield',
      'spiky-shield',
      'baneful-bunker',
      'silk-trap',
      'burning-bulwark',
      'obstruct',
    ].includes(move.name)
  ) {
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
  if (['low-kick', 'grass-knot'].includes(move.name)) {
    const w = abilityWeight(defender)
    move.power = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20
  }
  if (['heavy-slam', 'heat-crash'].includes(move.name)) {
    const r = abilityWeight(attacker) / abilityWeight(defender)
    move.power = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40
  }
  if (
    abilityName(defender) === 'magic-bounce' &&
    !abilityBypassed(attacker, defender, move) &&
    moveHasFlag(move, 'reflectable') &&
    !skipActionCheck
  ) {
    revealAbility(defender, events)
    return applyMove(
      defender,
      attacker,
      attackingSide ?? defendingSide,
      field,
      0,
      random,
      events,
      true,
      false,
      false,
      defendingSide,
      move,
      moveSide === 'player' ? 'opponent' : 'player',
    )
  }
  if (move.name === 'steel-roller' && !field.terrain) return { hit: true, succeeded: false }
  if (
    !delayed &&
    ['selected-pokemon', 'all-opponents', 'all-other-pokemon', 'random-opponent'].includes(move.target) &&
    semiInvulnerableMultiplier(defender, move) === 0 &&
    ![abilityName(attacker), abilityName(defender)].includes('no-guard')
  ) {
    events.push({ type: 'miss', pokemon: battlePokemonName(defender) })
    return { hit: false, succeeded: false }
  }
  if (
    !releasingCarry &&
    move.accuracy !== null &&
    !defender.volatile.telekinesis &&
    random() >= battleHitProbability(move, attacker, defender, field)
  ) {
    events.push({ type: 'miss', pokemon: battlePokemonName(defender) })
    return { hit: false, succeeded: false }
  }

  if (
    field.terrain === 'psychic' &&
    isGrounded(defender) &&
    abilityMovePriority(attacker, move) > 0 &&
    move.target !== 'user'
  ) {
    events.push({ type: 'fieldBlocked', pokemon: battlePokemonName(defender), field: 'psychic' })
    return { hit: false, succeeded: false }
  }

  if (['phantom-force', 'shadow-force'].includes(move.name)) delete defender.volatile.protect
  const contactBypass =
    moveMakesContact(move, attacker) && ['unseen-fist', 'piercing-drill'].includes(abilityName(attacker))
  if (
    !delayed &&
    defender.volatile.protect &&
    !contactBypass &&
    move.target !== 'user' &&
    move.name !== 'protect' &&
    !curse
  ) {
    events.push({ type: 'protected', pokemon: battlePokemonName(defender) })
    return { hit: false, succeeded: false }
  }

  if (
    defendingSide.conditions.craftyShield > 0 &&
    (ghostCurse || (move.damageClass === 'status' && move.target !== 'user'))
  ) {
    events.push({ type: 'protected', pokemon: battlePokemonName(attacker) })
    return { hit: false, succeeded: false }
  }

  if (move.target !== 'user' && applyAbilityMoveImmunity(attacker, defender, move, events))
    return { hit: false, succeeded: true }

  const specialAbilityMove = abilitySpecialMove(attacker, defender, move, events)
  if (specialAbilityMove !== null && move.damageClass === 'status')
    return { hit: specialAbilityMove, succeeded: specialAbilityMove }

  if (!releasing && timing?.carriesTarget) {
    if (defender.substituteHp > 0 || battleMoveEffectiveness(move, defender, attacker) === 0)
      return { hit: true, succeeded: false }
    attacker.chargingMoveIndex = moveSlot
    attacker.skyDropTargetId = defender.member.id
    defender.skyDropSourceId = attacker.member.id
    events.push({ type: 'charging', pokemon: battlePokemonName(attacker) })
    return { hit: false, succeeded: true }
  }

  if (defender.status === 'freeze' && (move.type === 'fire' || freezeThawingMoves.has(move.name))) {
    defender.status = null
    events.push({ type: 'thaw', pokemon: battlePokemonName(defender) })
  }

  const supplemental = supplementalMoveEffect(move.name)
  if (
    move.damageClass === 'status' &&
    move.target === 'selected-pokemon' &&
    defender.substituteHp > 0 &&
    !move.bypassesSubstitute
  )
    return { hit: true, succeeded: false, hitSubstitute: true }

  if (supplemental?.kind === 'substitute') {
    const hp = Math.floor(attacker.maxHp / 4)
    if (attacker.substituteHp > 0 || attacker.hp <= hp) return { hit: true, succeeded: false }
    attacker.hp -= hp
    attacker.substituteHp = hp
    events.push({ type: 'substituteSet', pokemon: battlePokemonName(attacker), hp })
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
      if (type === 'heal')
        events.push({
          type,
          pokemon: change.pokemon.pokemon.name,
          amount,
          percentage: hpPercentage(amount, change.pokemon.maxHp),
        })
      else
        events.push({
          type,
          pokemon: change.pokemon.pokemon.name,
          amount,
          effectiveness: 1,
          critical: false,
          percentage: hpPercentage(amount, change.pokemon.maxHp),
        })
    }
    return { hit: true, succeeded }
  }

  if (move.name === 'rest') {
    if (majorStatusImmune('sleep', attacker, attacker, attackingSide, field)) return { hit: true, succeeded: false }
    if (attacker.volatile['heal-block']) return { hit: true, succeeded: false }
    const needsRest = attacker.hp < attacker.maxHp || attacker.status !== null
    if (!needsRest) return { hit: true, succeeded: false }
    const amount = attacker.maxHp - attacker.hp
    attacker.hp = attacker.maxHp
    attacker.status = 'sleep'
    // The user cannot act on its next two turns, then wakes before acting.
    attacker.sleepTurns = 2
    attacker.toxicTurns = 0
    if (amount > 0)
      events.push({
        type: 'heal',
        pokemon: battlePokemonName(attacker),
        amount,
        percentage: hpPercentage(amount, attacker.maxHp),
      })
    events.push({ type: 'status', pokemon: battlePokemonName(attacker), status: 'sleep' })
    return { hit: true, succeeded: true }
  }

  if (ghostCurse) {
    if (defender.cursed) return { hit: true, succeeded: false }
    const amount = Math.min(attacker.hp, Math.floor(attacker.maxHp / 2))
    if (amount > 0) {
      attacker.hp -= amount
      events.push({
        type: 'damage',
        pokemon: battlePokemonName(attacker),
        amount,
        effectiveness: 1,
        critical: false,
        percentage: hpPercentage(amount, attacker.maxHp),
      })
    }
    defender.cursed = true
    events.push({ type: 'status', pokemon: battlePokemonName(defender), status: 'curse' })
    if (attacker.hp === 0) events.push({ type: 'faint', pokemon: battlePokemonName(attacker) })
    return { hit: true, succeeded: true }
  }

  if (curse) {
    let succeeded = false
    for (const [stat, change] of [
      ['speed', -1],
      ['attack', 1],
      ['defense', 1],
    ] as const) {
      if (abilityStage(attacker, stat, change, events)) succeeded = true
    }
    return { hit: true, succeeded }
  }

  if (move.name === 'fillet-away') {
    const cost = Math.max(1, Math.floor(attacker.maxHp / 2))
    if (
      attacker.hp <= cost ||
      ['attack', 'specialAttack', 'speed'].every((stat) => attacker.stages[stat as keyof BattleStages] >= 6)
    )
      return { hit: true, succeeded: false }
    attacker.hp -= cost
    events.push({
      type: 'damage',
      pokemon: battlePokemonName(attacker),
      amount: cost,
      effectiveness: 1,
      critical: false,
    })
  }

  let succeeded = false
  let hitSubstitute = false
  if (supplemental?.kind === 'fixed-damage') {
    let effectiveness = battleMoveEffectiveness(move, defender, attacker)
    if (
      field.primalWeather === 'delta-stream' &&
      !field.weatherSuppressed &&
      effectiveTypes(defender).includes('flying') &&
      getDamageMultiplier(move.type, 'flying') > 1
    )
      effectiveness /= 2
    if (effectiveness === 0) {
      events.push({ type: 'immune', pokemon: battlePokemonName(defender) })
      return { hit: false, succeeded: false }
    }
    const damage = fixedMoveDamage(attacker, defender, supplemental.amount)
    if (damage > 0) {
      const beforeHp = defender.hp
      if (abilityAbsorbsHit(defender, attacker, move, events)) return { hit: true, succeeded: true }
      const applied = applyDirectMoveDamage(defender, damage, 1, false, events, attacker, move)
      if (!applied.hitSubstitute)
        abilityAfterHit(
          defender,
          attacker,
          move,
          applied.amount,
          beforeHp,
          false,
          field,
          attackingSide,
          defendingSide,
          random,
          events,
        )
      hitSubstitute = applied.hitSubstitute
      succeeded = true
    }
  }
  const damageRule = supplementalMoveDamage[move.name]
  if (damageRule?.ohko) {
    if (abilityName(defender) === 'sturdy' && !abilityBypassed(attacker, defender, move))
      return { hit: false, succeeded: false }
    if (battleMoveEffectiveness(move, defender, attacker) === 0) {
      events.push({ type: 'immune', pokemon: battlePokemonName(defender) })
      return { hit: false, succeeded: false }
    }
    if (defender.substituteHp > 0) {
      const applied = applyDirectMoveDamage(defender, defender.substituteHp, 1, false, events)
      return { hit: true, succeeded: true, hitSubstitute: applied.hitSubstitute }
    }
    const amount = defender.hp
    defender.hp = 0
    events.push({
      type: 'damage',
      pokemon: battlePokemonName(defender),
      amount,
      effectiveness: 1,
      critical: false,
      percentage: hpPercentage(amount, defender.maxHp),
    })
    abilityAfterHit(
      defender,
      attacker,
      move,
      amount,
      amount,
      false,
      field,
      attackingSide,
      defendingSide,
      random,
      events,
    )
    return { hit: true, succeeded: true }
  }
  if (damageRule?.fixedDamage !== undefined) {
    if (battleMoveEffectiveness(move, defender, attacker) === 0) {
      events.push({ type: 'immune', pokemon: battlePokemonName(defender) })
      return { hit: false, succeeded: false }
    }
    const damage = damageRule.fixedDamage === 'user-hp' ? attacker.hp : damageRule.fixedDamage
    const beforeHp = defender.hp
    if (abilityAbsorbsHit(defender, attacker, move, events)) return { hit: true, succeeded: true }
    const applied = applyDirectMoveDamage(defender, damage, 1, false, events, attacker, move)
    if (!applied.hitSubstitute)
      abilityAfterHit(
        defender,
        attacker,
        move,
        applied.amount,
        beforeHp,
        false,
        field,
        attackingSide,
        defendingSide,
        random,
        events,
      )
    hitSubstitute = applied.hitSubstitute
    if (move.name === 'final-gambit') attacker.hp = 0
    succeeded = applied.amount > 0
  }
  if (damageRule?.powerRule) {
    const userSpeed = Math.max(1, currentBattleStats(attacker)[5])
    const targetSpeed = Math.max(1, currentBattleStats(defender)[5])
    switch (damageRule.powerRule) {
      case 'friendship':
        move.power = Math.max(1, Math.floor(((attacker.member.friendship ?? 255) * 2) / 5))
        break
      case 'frustration':
        move.power = Math.max(1, Math.floor(((255 - (attacker.member.friendship ?? 255)) * 2) / 5))
        break
      case 'user-hp':
        move.power = Math.max(1, Math.floor((150 * attacker.hp) / attacker.maxHp))
        break
      case 'target-hp':
        move.power = Math.max(1, Math.floor(((move.name === 'hard-press' ? 100 : 120) * defender.hp) / defender.maxHp))
        break
      case 'positive-stages':
        move.power = 20 * (1 + Object.values(attacker.stages).reduce((sum, stage) => sum + Math.max(0, stage), 0))
        break
      case 'speed-ratio': {
        const ratio = userSpeed / targetSpeed
        move.power = ratio >= 4 ? 150 : ratio >= 3 ? 120 : ratio >= 2 ? 80 : ratio >= 1 ? 60 : 40
        break
      }
      case 'inverse-speed-ratio':
        move.power = Math.min(150, Math.floor((25 * targetSpeed) / userSpeed) + 1)
        break
    }
  }
  if (
    move.damageClass !== 'status' &&
    move.power &&
    !damageRule?.fixedDamage &&
    supplemental?.kind !== 'fixed-damage'
  ) {
    let effectiveness = battleMoveEffectiveness(move, defender, attacker)
    if (
      field.primalWeather === 'delta-stream' &&
      !field.weatherSuppressed &&
      effectiveTypes(defender).includes('flying') &&
      getDamageMultiplier(move.type, 'flying') > 1
    )
      effectiveness /= 2
    if (effectiveness === 0) {
      events.push({ type: 'immune', pokemon: battlePokemonName(defender) })
      return { hit: false, succeeded: false }
    }
    const heldItem = heldBattleItem(attacker)
    const minimumHits = move.minHits ?? 1
    const maximumHits = Math.max(minimumHits, move.maxHits ?? minimumHits)
    let hits = minimumHits
    if (maximumHits > minimumHits) {
      if (abilityName(attacker) === 'skill-link') hits = maximumHits
      else if (minimumHits === 2 && maximumHits === 5) {
        const roll = random()
        hits =
          attacker.item?.name === 'loaded-dice'
            ? roll < 0.5
              ? 4
              : 5
            : roll < 0.35
              ? 2
              : roll < 0.7
                ? 3
                : roll < 0.85
                  ? 4
                  : 5
      } else hits += Math.floor(random() * (maximumHits - minimumHits + 1))
    }
    const parentalBond = abilityName(attacker) === 'parental-bond' && hits === 1 && !timing?.chargeTurns
    if (parentalBond) hits = 2
    const applied = { amount: 0 }
    for (let hitIndex = 0; hitIndex < hits && defender.hp > 0 && attacker.hp > 0; hitIndex += 1) {
      if (
        hitIndex > 0 &&
        move.multiAccuracy &&
        move.accuracy !== null &&
        random() >= battleHitProbability(move, attacker, defender, field)
      )
        break
      const physical = move.damageClass === 'physical'
      const attackerStats = currentBattleStats(attacker, field, defender)
      const defenderStats = currentBattleStats(defender, field, attacker)
      let attack = attackerStats[physical ? 1 : 3]
      let defense = defenderStats[physical ? 2 : 4]
      if (abilityName(defender) === 'unaware' && !abilityBypassed(attacker, defender, move))
        attack /= stageMultiplier(attacker.stages[physical ? 'attack' : 'specialAttack'])
      if (abilityName(attacker) === 'unaware')
        defense /= stageMultiplier(defender.stages[physical ? 'defense' : 'specialDefense'])
      if (physical && effectiveWeather(field) === 'snow' && effectiveTypes(defender).includes('ice')) defense *= 1.5
      if (!physical && effectiveWeather(field) === 'sandstorm' && effectiveTypes(defender).includes('rock'))
        defense *= 1.5
      const stab = move.name === 'struggle' ? 1 : battleSameTypeAttackBonus(attacker, move.type)
      const criticalStage = Math.min(
        3,
        (move.critRate ?? (['razor-wind', 'sky-attack'].includes(move.name) ? 1 : 0)) +
          (['scope-lens', 'razor-claw'].includes(attacker.item?.name ?? '') ? 1 : 0) +
          (abilityName(attacker) === 'super-luck' ? 1 : 0),
      )
      const critical =
        (!['battle-armor', 'shell-armor'].includes(abilityName(defender)) ||
          abilityBypassed(attacker, defender, move)) &&
        (damageRule?.alwaysCritical === true ||
          (abilityName(attacker) === 'merciless' && isPoisoned(defender)) ||
          random() < [1 / 24, 1 / 8, 1 / 2, 1][criticalStage])
      if (critical) {
        const attackStage = attacker.stages[physical ? 'attack' : 'specialAttack']
        const defenseStage = defender.stages[physical ? 'defense' : 'specialDefense']
        if (attackStage < 0 && (abilityName(defender) !== 'unaware' || abilityBypassed(attacker, defender, move)))
          attack /= stageMultiplier(attackStage)
        if (defenseStage > 0 && abilityName(attacker) !== 'unaware') defense /= stageMultiplier(defenseStage)
      }
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
        abilityName(attacker) !== 'infiltrator' &&
        (defendingSide.conditions.auroraVeil > 0 ||
          (physical ? defendingSide.conditions.reflect > 0 : defendingSide.conditions.lightScreen > 0))
          ? 0.5
          : 1
      const itemModifier = heldItemPowerModifier(attacker, defender, move, effectiveness, events)
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
            itemModifier *
            abilityMovePower *
            abilityPowerMultiplier(attacker, defender, move, field, effectiveness, critical, attackingSide) *
            (hitIndex === 1 && parentalBond ? 0.25 : 1) *
            (contactBypass && defender.volatile.protect && abilityName(attacker) === 'piercing-drill' ? 0.25 : 1) *
            screen,
        ),
      )
      const beforeHp = defender.hp
      if (abilityAbsorbsHit(defender, attacker, move, events)) continue
      const hit = applyDirectMoveDamage(defender, damage, effectiveness, critical, events, attacker, move)
      if (!hit.hitSubstitute)
        abilityAfterHit(
          defender,
          attacker,
          move,
          hit.amount,
          beforeHp,
          critical,
          field,
          attackingSide,
          defendingSide,
          random,
          events,
        )
      applied.amount += hit.amount
      hitSubstitute = hit.hitSubstitute
    }
    if (
      heldItem === 'life-orb' &&
      attacker.hp > 0 &&
      abilityName(attacker) !== 'magic-guard' &&
      !(abilityName(attacker) === 'sheer-force' && moveHasSecondary(slot.data))
    ) {
      activateItem(attacker, events)
      const amount = Math.min(attacker.hp, Math.max(1, Math.floor(attacker.maxHp / 10)))
      attacker.hp -= amount
      events.push({
        type: 'damage',
        pokemon: battlePokemonName(attacker),
        amount,
        effectiveness: 1,
        critical: false,
        percentage: hpPercentage(amount, attacker.maxHp),
      })
    }
    if (heldItem === 'shell-bell' && attacker.hp > 0 && !attacker.volatile['heal-block']) {
      const amount = Math.min(attacker.maxHp - attacker.hp, Math.max(1, Math.floor(applied.amount / 8)))
      if (amount > 0) {
        activateItem(attacker, events)
        attacker.hp += amount
        events.push({
          type: 'heal',
          pokemon: battlePokemonName(attacker),
          amount,
          percentage: hpPercentage(amount, attacker.maxHp),
        })
      }
    }
    if (move.name === 'struggle' && applied.amount > 0) {
      const amount = Math.min(attacker.hp, Math.max(1, Math.round(attacker.maxHp / 4)))
      attacker.hp -= amount
      events.push({
        type: 'damage',
        pokemon: battlePokemonName(attacker),
        amount,
        effectiveness: 1,
        critical: false,
        percentage: hpPercentage(amount, attacker.maxHp),
      })
    }
    if (
      move.drain &&
      (move.drain < 0 || !attacker.volatile['heal-block']) &&
      !(move.drain < 0 && ['rock-head', 'magic-guard'].includes(abilityName(attacker)))
    ) {
      const amount = Math.min(
        attacker.maxHp - attacker.hp,
        Math.max(1, Math.floor((applied.amount * Math.abs(move.drain)) / 100)),
      )
      if (move.drain > 0 && abilityName(defender) === 'liquid-ooze')
        abilityDamage(attacker, Math.max(1, Math.floor((applied.amount * move.drain) / 100)), events)
      else if (move.drain > 0 && amount > 0) {
        attacker.hp += amount
        events.push({
          type: 'heal',
          pokemon: battlePokemonName(attacker),
          amount,
          percentage: hpPercentage(amount, attacker.maxHp),
        })
      } else if (move.drain < 0)
        attacker.hp = Math.max(0, attacker.hp - Math.max(1, Math.floor((applied.amount * Math.abs(move.drain)) / 100)))
    }
    succeeded = true
  }

  if (!hitSubstitute && move.name === 'wake-up-slap' && defender.status === 'sleep') {
    defender.status = null
    defender.sleepTurns = 0
    events.push({ type: 'wake', pokemon: battlePokemonName(defender) })
    succeeded = true
  }
  if (!hitSubstitute && move.name === 'smelling-salts' && defender.status === 'paralysis') {
    defender.status = null
    events.push({ type: 'statusCured', pokemon: battlePokemonName(defender), status: 'paralysis' })
    succeeded = true
  }

  if (move.healing > 0 && !attacker.volatile['heal-block']) {
    const amount = Math.min(
      attacker.maxHp - attacker.hp,
      Math.max(1, Math.floor((attacker.maxHp * move.healing) / 100)),
    )
    if (amount > 0) {
      attacker.hp += amount
      events.push({
        type: 'heal',
        pokemon: battlePokemonName(attacker),
        amount,
        percentage: hpPercentage(amount, attacker.maxHp),
      })
      succeeded = true
    }
  }

  if (
    !hitSubstitute &&
    defender.hp > 0 &&
    (move.flinchChance ?? 0) > 0 &&
    abilityName(defender) !== 'inner-focus' &&
    random() * 100 < (move.flinchChance ?? 0)
  ) {
    defender.volatile.flinch = 1
    events.push({ type: 'status', pokemon: battlePokemonName(defender), status: 'flinch' })
  }

  const selfTarget = changesApplyToUser(move)
  const appliesStatChanges =
    move.statChanges.length > 0 &&
    ((move.statChance ?? move.effectChance) === null || random() * 100 < (move.statChance ?? move.effectChance ?? 100))
  if (appliesStatChanges) {
    for (const change of move.statChanges) {
      const target = change.target
        ? change.target === 'user'
          ? attacker
          : defender
        : selfTarget || (change.change > 0 && !changesApplyToTarget(move))
          ? attacker
          : defender
      if (target === defender && hitSubstitute) continue
      const applied = abilityStage(target, change.stat, change.change, events, attacker, false, move)
      if (applied) succeeded = true
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
      events.push({ type: 'status', pokemon: battlePokemonName(defender), status: 'flinch' })
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
      !majorStatusImmune(status, statusTarget, attacker, defendingSide, field, move)
    ) {
      if (abilityStatus(statusTarget, status, attacker, field, events, false, move)) {
        if (status === 'sleep') statusTarget.sleepTurns = 2 + Math.floor(random() * 3)
        succeeded = true
      }
    } else if (
      volatileStatus &&
      canApplyVolatileStatus(volatileStatus, attacker, statusTarget, defendingSide, field, move)
    ) {
      if (volatileStatus === 'confusion') statusTarget.confusionTurns = 1 + Math.floor(random() * 4)
      if (volatileStatus === 'attraction') statusTarget.attracted = true
      if (volatileStatus === 'curse') statusTarget.cursed = true
      events.push({ type: 'status', pokemon: statusTarget.pokemon.name, status: volatileStatus })
      succeeded = true
    }
  }
  return { hit: true, succeeded, hitSubstitute }
}

function refreshAbilityEffects(
  own: BattleSide,
  foe: BattleSide,
  field: BattleField,
  events: BattleEvent[],
  side: 'player' | 'opponent',
) {
  synchronizeAbilities(own, foe, field, events)
  for (const s of [own, foe]) {
    const p = s.roster[s.active]
    if (abilityMemory(p).pendingStart) {
      delete abilityMemory(p).pendingStart
      applyEntryAbility(
        s,
        s === own ? foe : own,
        field,
        events,
        s === own ? side : side === 'player' ? 'opponent' : 'player',
        true,
      )
    }
  }
}

function performChoice(
  own: BattleSide,
  foe: BattleSide,
  field: BattleField,
  choice: BattleChoice,
  side: 'player' | 'opponent',
  random: RandomSource,
  events: BattleEvent[],
  turn: number,
) {
  refreshAbilityEffects(own, foe, field, events, side)
  const active = own.roster[own.active]
  if (
    active.hp > 0 &&
    !active.skyDropSourceId &&
    !own.switchRequested &&
    (active.recharging || active.chargingMoveIndex !== undefined)
  )
    choice = { kind: 'move', index: active.chargingMoveIndex ?? 0 }
  if (choice.kind === 'switch') {
    const replacement = own.roster[choice.index]
    if (!replacement || choice.index === own.active || replacement.hp <= 0) return
    const leaving = own.roster[own.active]
    if (
      leaving.hp > 0 &&
      !own.switchRequested &&
      (leaving.volatile.bound ||
        leaving.volatile.ingrain ||
        leaving.volatile.octolock ||
        abilityTraps(leaving, foe.roster[foe.active]))
    ) {
      events.push({ type: 'failed', pokemon: battlePokemonName(leaving) })
      return
    }
    abilityExit(leaving, events)
    leaving.member.abilityActive = false
    delete leaving.gorillaMoveIndex
    delete leaving.abilitySuppressed
    const batonPassesCurse =
      own.switchRequested &&
      leaving.hp > 0 &&
      leaving.cursed &&
      leaving.lastMoveIndex !== null &&
      leaving.moves[leaving.lastMoveIndex]?.data.name === 'baton-pass'
    delete leaving.skyDropSourceId
    delete leaving.skyDropTargetId
    delete leaving.previousMoveExecution
    for (const target of foe.roster) {
      if (target.skyDropSourceId === leaving.member.id) delete target.skyDropSourceId
    }
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

    own.active = choice.index
    replacement.stages = emptyStages()
    if (batonPassesCurse) replacement.cursed = true
    replacement.hasEnteredBattle = true
    own.switchRequested = false
    const switchEvent: Extract<BattleEvent, { type: 'switch' }> = {
      type: 'switch',
      side,
      pokemon: battlePokemonName(replacement),
    }
    events.push(switchEvent)
    refreshAbilityEffects(own, foe, field, events, side)
    abilityBeforeEntry(replacement, events)
    applyEntryHazards(own, replacement, events)
    if (replacement.hp > 0) applyEntryAbility(own, foe, field, events, side)
    switchEvent.pokemon = battlePokemonName(replacement)
    applyWhiteHerb(replacement, events)
    applyWhiteHerb(foe.roster[foe.active], events)
    applyHpThresholdItem(replacement, events)
    if (replacement.hp === 0) events.push({ type: 'faint', pokemon: battlePokemonName(replacement) })
    return
  }
  const attacker = own.roster[own.active]
  const defender = foe.roster[foe.active]
  if (!attacker || !defender || attacker.hp <= 0) return
  if (attacker.skyDropSourceId && defender.skyDropTargetId === attacker.member.id && defender.hp > 0) {
    events.push({ type: 'failed', pokemon: battlePokemonName(attacker) })
    tickMoveRestrictions(attacker)
    return
  }
  if (attacker.recharging) {
    delete attacker.recharging
    events.push({ type: 'recharging', pokemon: battlePokemonName(attacker) })
    tickMoveRestrictions(attacker)
    return
  }
  const legalMoves = legalBattleMoveIndexes(attacker)
  const selectedMoveIndex = selectedBattleMoveIndex(attacker, choice.index)
  const start = events.length
  if (!legalMoves.includes(selectedMoveIndex)) {
    events.push({ type: 'failed', pokemon: battlePokemonName(attacker) })
    tickMoveRestrictions(attacker)
    return
  }
  const selectedMove = battleMoveSlot(attacker, selectedMoveIndex)?.data.name
  const previous = attacker.previousMoveExecution
  const blockedByRepeat = Boolean(
    selectedMove &&
    supplementalMoveTimings[selectedMove]?.preventsConsecutiveUse &&
    previous?.name === selectedMove &&
    previous.turn === turn - 1 &&
    previous.succeeded,
  )
  const abilityBeforeHp = defender.hp
  const previousToxicSpikes = own.hazards.toxicSpikes
  const outcome = applyMove(
    attacker,
    defender,
    foe,
    field,
    selectedMoveIndex,
    random,
    events,
    false,
    false,
    blockedByRepeat,
    own,
    undefined,
    side,
  )
  if (own.hazards.toxicSpikes > previousToxicSpikes) events.push({ type: 'hazardSet', side, hazard: 'toxic-spikes' })
  abilityMemory(attacker).moved = true
  const abilityUsedMove = battleMoveSlot(attacker, selectedMoveIndex)?.data
  if (
    outcome?.succeeded &&
    abilityUsedMove &&
    moveHasFlag(abilityUsedMove, 'dance') &&
    abilityName(defender) === 'dancer' &&
    defender.hp > 0
  ) {
    revealAbility(defender, events)
    const copied = applyMove(
      defender,
      attacker,
      own,
      field,
      0,
      random,
      events,
      true,
      false,
      false,
      foe,
      abilityUsedMove,
      side === 'player' ? 'opponent' : 'player',
    )
    if (copied?.hit) abilityMemory(defender).moved = true
  }
  if (outcome?.hit && abilityUsedMove)
    abilityAfterMove(attacker, defender, abilityUsedMove, abilityBeforeHp, own, foe, events)
  applyStatusHealingItem(attacker, events)
  applyStatusHealingItem(defender, events)
  for (let index = start; index < events.length; index += 1) {
    const event = events[index]
    if (event.type === 'move') {
      if (event.side === side && selectedMove && !attacker.revealedMoves.includes(selectedMove))
        attacker.revealedMoves = [...attacker.revealedMoves, selectedMove].slice(0, 4)
    }
  }
  if (abilityUsedMove?.type === 'electric' && outcome) abilityMemory(attacker).charged = false
  if (!outcome) return
  let succeeded = outcome.succeeded
  const move = battleMoveSlot(attacker, selectedMoveIndex)?.data
  if (outcome.hit && move) {
    if (outcome.succeeded && supplementalMoveTimings[move.name]?.rechargeTurns) attacker.recharging = true
    if (move.name === 'smack-down' && ['fly', 'bounce'].includes(semiInvulnerableMove(defender) ?? ''))
      delete defender.chargingMoveIndex
    const supplemental = supplementalMoveEffect(move.name)
    if (supplemental?.kind === 'revive-ally' && !attacker.volatile['heal-block']) {
      const target = own.roster.find((pokemon) => pokemon.hp === 0)
      if (target) {
        target.hp = Math.max(1, Math.floor(target.maxHp / 2))
        delete abilityMemory(target).faintedNotified
        target.status = null
        target.sleepTurns = 0
        target.toxicTurns = 0
        events.push({
          type: 'heal',
          pokemon: battlePokemonName(target),
          amount: target.hp,
          percentage: hpPercentage(target.hp, target.maxHp),
        })
        succeeded = true
      }
    }
    if (supplemental?.kind === 'encore' && !outcome.hitSubstitute) {
      const repeated = defender.lastMoveIndex
      const repeatedMove = repeated === null ? null : defender.moves[repeated]
      if (repeatedMove && repeatedMove.pp > 0 && repeatedMove.data.name !== 'encore') {
        defender.encoreTurns =
          supplemental.minimumTurns + Math.floor(random() * (supplemental.maximumTurns - supplemental.minimumTurns + 1))
        defender.encoreMoveIndex = repeated
        events.push({
          type: 'encore',
          pokemon: battlePokemonName(defender),
          move: repeatedMove.data.name,
          turns: defender.encoreTurns,
        })
        succeeded = true
      }
    }
    if (supplemental?.kind === 'taunt' && !outcome.hitSubstitute && defender.tauntTurns <= 0) {
      defender.tauntTurns = supplemental.turns
      events.push({ type: 'taunt', pokemon: battlePokemonName(defender) })
      succeeded = true
    }
    if (supplemental?.kind === 'wish') {
      own.wish = { turns: 2, amount: Math.floor(attacker.maxHp / 2) }
      succeeded = true
    }
    if (supplemental?.kind === 'set-volatile') {
      const target = selfVolatileConditions.has(supplemental.condition) ? attacker : defender
      const targetSide = target === attacker ? own : foe
      const blockedBySafeguard =
        target === defender && targetSide.conditions.safeguard > 0 && abilityName(attacker) !== 'infiltrator'
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
            events.push({ type: 'status', pokemon: battlePokemonName(target), status: 'disable' })
            succeeded = true
          }
        } else {
          target.volatile[supplemental.condition] = supplemental.turns ?? -1
          events.push({ type: 'status', pokemon: battlePokemonName(target), status: supplemental.condition })
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
          events.push({ type: 'stagesReset', pokemon: battlePokemonName(target) })
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
    if (supplemental?.kind === 'set-weather' && !field.primalWeather) {
      field.weather = supplemental.weather
      const weatherRock = {
        rain: 'damp-rock',
        sun: 'heat-rock',
        sandstorm: 'smooth-rock',
        snow: 'icy-rock',
      }[supplemental.weather]
      field.weatherTurns = attacker.item?.name === weatherRock ? 8 : supplemental.turns
      if (field.weatherTurns === 8 && attacker.item?.name === weatherRock) activateItem(attacker, events)
      events.push({ type: 'fieldSet', field: supplemental.weather, turns: field.weatherTurns })
      succeeded = true
    }
    if (supplemental?.kind === 'set-terrain') {
      field.terrain = supplemental.terrain
      field.terrainTurns = attacker.item?.name === 'terrain-extender' ? 8 : supplemental.turns
      if (field.terrainTurns === 8 && attacker.item?.name === 'terrain-extender') activateItem(attacker, events)
      events.push({ type: 'fieldSet', field: supplemental.terrain, turns: field.terrainTurns })
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
      if (!supplemental.requiresWeather || effectiveWeather(field) === supplemental.requiresWeather) {
        const turns = attacker.item?.name === 'light-clay' ? 8 : supplemental.turns
        if (condition === 'tailwind' && own.conditions.tailwind <= 0 && abilityName(attacker) === 'wind-power')
          abilityMemory(attacker).charged = true
        if (condition === 'tailwind' && own.conditions.tailwind <= 0 && abilityName(attacker) === 'wind-rider')
          abilityStage(attacker, 'attack', 1, events)
        own.conditions[condition] = turns
        if (turns === 8 && attacker.item?.name === 'light-clay') activateItem(attacker, events)
        events.push({ type: 'sideConditionSet', side, condition, turns })
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
    if (
      !outcome.hitSubstitute &&
      itemRemovalMoves.has(move.name) &&
      defender.item &&
      (abilityName(defender) !== 'sticky-hold' || abilityBypassed(attacker, defender, move) || defender.hp === 0)
    ) {
      const item = defender.item.name
      defender.item = null
      abilityMemory(defender).unburden = true
      events.push({ type: 'itemRemoved', pokemon: battlePokemonName(defender), item })
      succeeded = true
    }
    if (!outcome.hitSubstitute && move.name === 'incinerate' && defender.item?.name.endsWith('-berry')) {
      const item = defender.item.name
      defender.item = null
      abilityMemory(defender).unburden = true
      events.push({ type: 'itemRemoved', pokemon: battlePokemonName(defender), item })
      succeeded = true
    }
    if (pivotMoves.has(move.name) && attacker.hp > 0 && availableSwitch(own) >= 0) {
      own.switchRequested = true
      succeeded = true
    }
    if (
      !outcome.hitSubstitute &&
      forceSwitchMoves.has(move.name) &&
      (!['suction-cups', 'guard-dog'].includes(abilityName(defender)) || abilityBypassed(attacker, defender, move)) &&
      defender.hp > 0 &&
      availableSwitch(foe) >= 0
    ) {
      foe.switchRequested = true
      succeeded = true
    }
  }
  if (selectedMove) attacker.previousMoveExecution = { name: selectedMove, turn, succeeded }
  applyWhiteHerb(attacker, events)
  applyWhiteHerb(defender, events)
  tickMoveRestrictions(attacker)
  if (!succeeded && outcome.hit) events.push({ type: 'failed', pokemon: battlePokemonName(attacker) })
  if (defender.hp === 0 && !events.some((event, index) => index >= start && event.type === 'faint'))
    events.push({ type: 'faint', pokemon: battlePokemonName(defender) })
  if (
    attacker.hp === 0 &&
    !events.some((event, index) => index >= start && event.type === 'faint' && event.pokemon === attacker.pokemon.name)
  )
    events.push({ type: 'faint', pokemon: battlePokemonName(attacker) })
}

function choicePriority(side: BattleSide, choice: BattleChoice) {
  const pokemon = side.roster[side.active]
  if (choice.kind === 'switch' && pokemon.skyDropSourceId) return 6
  if (pokemon.recharging) return 0
  if (choice.kind === 'switch' && pokemon.chargingMoveIndex === undefined) return 6
  const move = battleMoveSlot(pokemon, selectedBattleMoveIndex(pokemon, choice.index))?.data
  return move ? abilityMovePriority(pokemon, move) : 0
}

function residual(side: BattleSide, foe: BattleSide, field: BattleField, random: RandomSource, events: BattleEvent[]) {
  synchronizeAbilities(side, foe, field, events)
  const pokemon = side.roster[side.active]
  if (pokemon.hp <= 0) return
  if (pokemon.status && abilityName(pokemon) === 'hydration' && effectiveWeather(field) === 'rain') {
    events.push({ type: 'statusCured', pokemon: battlePokemonName(pokemon), status: pokemon.status })
    pokemon.status = null
    pokemon.sleepTurns = 0
    pokemon.toxicTurns = 0
  } else if (pokemon.status && abilityName(pokemon) === 'shed-skin' && random() < 1 / 3) {
    events.push({ type: 'statusCured', pokemon: battlePokemonName(pokemon), status: pokemon.status })
    pokemon.status = null
    pokemon.sleepTurns = 0
    pokemon.toxicTurns = 0
  }
  const weatherRule = supplementalAbilityWeather[abilityName(pokemon)]?.find(
    (rule) => rule.weather === effectiveWeather(field),
  )
  if (
    pokemon.hp > 0 &&
    weatherRule?.weather === field.weather &&
    weatherRule.healFraction &&
    pokemon.hp < pokemon.maxHp &&
    !pokemon.volatile['heal-block']
  ) {
    const amount = Math.min(
      pokemon.maxHp - pokemon.hp,
      Math.max(1, Math.floor(pokemon.maxHp * weatherRule.healFraction)),
    )
    pokemon.hp += amount
    events.push({
      type: 'heal',
      pokemon: battlePokemonName(pokemon),
      amount,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
  }
  if (pokemon.hp > 0 && weatherRule?.damageFraction && abilityName(pokemon) !== 'magic-guard') {
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp * weatherRule.damageFraction)))
    pokemon.hp -= amount
    events.push({
      type: 'damage',
      pokemon: battlePokemonName(pokemon),
      amount,
      effectiveness: 1,
      critical: false,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
  }
  if (field.terrain === 'grassy' && isGrounded(pokemon) && pokemon.hp < pokemon.maxHp) {
    const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    pokemon.hp += amount
    events.push({
      type: 'heal',
      pokemon: battlePokemonName(pokemon),
      amount,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
  }
  if (
    abilityName(pokemon) !== 'magic-guard' &&
    effectiveWeather(field) === 'sandstorm' &&
    !['sand-veil', 'sand-rush', 'sand-force', 'overcoat'].includes(abilityName(pokemon)) &&
    !effectiveTypes(pokemon).some((type) => ['rock', 'ground', 'steel'].includes(type))
  ) {
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    pokemon.hp -= amount
    events.push({
      type: 'weatherDamage',
      pokemon: battlePokemonName(pokemon),
      weather: 'sandstorm',
      amount,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
  }
  if (pokemon.hp > 0 && isDamagingStatus(pokemon.status) && abilityName(pokemon) !== 'magic-guard') {
    const status = pokemon.status
    if (isPoisoned(pokemon) && abilityName(pokemon) === 'poison-heal') {
      const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 8)))
      if (amount > 0) {
        pokemon.hp += amount
        events.push({
          type: 'heal',
          pokemon: battlePokemonName(pokemon),
          amount,
          percentage: hpPercentage(amount, pokemon.maxHp),
        })
      }
    } else {
      const denominator =
        status === 'burn'
          ? abilityName(pokemon) === 'heatproof'
            ? 32
            : 16
          : status === 'badly-poisoned'
            ? 16 / (pokemon.toxicTurns + 1)
            : 8
      const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / denominator)))
      pokemon.hp -= amount
      events.push({
        type: 'statusDamage',
        pokemon: battlePokemonName(pokemon),
        status,
        amount,
        percentage: hpPercentage(amount, pokemon.maxHp),
      })
      if (status === 'badly-poisoned') pokemon.toxicTurns += 1
    }
  }
  if (pokemon.hp > 0 && pokemon.cursed && abilityName(pokemon) !== 'magic-guard') {
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 4)))
    pokemon.hp -= amount
    events.push({
      type: 'statusDamage',
      pokemon: battlePokemonName(pokemon),
      status: 'curse',
      amount,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
  }
  const damageFromVolatile = (condition: BattleVolatileCondition, denominator: number) => {
    if (!pokemon.volatile[condition] || pokemon.hp <= 0 || abilityName(pokemon) === 'magic-guard') return
    const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / denominator)))
    pokemon.hp -= amount
    events.push({
      type: 'damage',
      pokemon: battlePokemonName(pokemon),
      amount,
      effectiveness: 1,
      critical: false,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
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
        events.push({ type: 'status', pokemon: battlePokemonName(pokemon), status: 'sleep' })
      }
    }
  }
  if (pokemon.volatile['aqua-ring'] || pokemon.volatile.ingrain) {
    const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    if (amount > 0) {
      pokemon.hp += amount
      events.push({
        type: 'heal',
        pokemon: battlePokemonName(pokemon),
        amount,
        percentage: hpPercentage(amount, pokemon.maxHp),
      })
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
        events.push({
          type: 'heal',
          pokemon: battlePokemonName(source),
          amount: healed,
          percentage: hpPercentage(healed, source.maxHp),
        })
      }
    }
  }
  if (pokemon.volatile['salt-cure'])
    damageFromVolatile(
      'salt-cure',
      effectiveTypes(pokemon).some((type) => type === 'water' || type === 'steel') ? 8 : 16,
    )
  if (pokemon.volatile.syrupy) abilityStage(pokemon, 'speed', -1, events, foe.roster[foe.active])
  if (pokemon.volatile.octolock)
    for (const stat of ['defense', 'specialDefense'] as const)
      abilityStage(pokemon, stat, -1, events, foe.roster[foe.active])
  if (
    pokemon.hp > 0 &&
    heldBattleItem(pokemon) === 'leftovers' &&
    pokemon.hp < pokemon.maxHp &&
    !pokemon.volatile['heal-block']
  ) {
    const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
    activateItem(pokemon, events)
    pokemon.hp += amount
    events.push({
      type: 'heal',
      pokemon: battlePokemonName(pokemon),
      amount,
      percentage: hpPercentage(amount, pokemon.maxHp),
    })
  }
  if (pokemon.hp > 0 && heldBattleItem(pokemon) === 'black-sludge') {
    if (effectiveTypes(pokemon).includes('poison') && pokemon.hp < pokemon.maxHp && !pokemon.volatile['heal-block']) {
      const amount = Math.min(pokemon.maxHp - pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 16)))
      activateItem(pokemon, events)
      pokemon.hp += amount
      events.push({
        type: 'heal',
        pokemon: battlePokemonName(pokemon),
        amount,
        percentage: hpPercentage(amount, pokemon.maxHp),
      })
    } else if (!effectiveTypes(pokemon).includes('poison') && abilityName(pokemon) !== 'magic-guard') {
      const amount = Math.min(pokemon.hp, Math.max(1, Math.floor(pokemon.maxHp / 8)))
      activateItem(pokemon, events)
      pokemon.hp -= amount
      events.push({
        type: 'damage',
        pokemon: battlePokemonName(pokemon),
        amount,
        effectiveness: 1,
        critical: false,
        percentage: hpPercentage(amount, pokemon.maxHp),
      })
    }
  }
  if (
    pokemon.hp > 0 &&
    !pokemon.status &&
    (heldBattleItem(pokemon) === 'flame-orb' || heldBattleItem(pokemon) === 'toxic-orb')
  ) {
    const status = heldBattleItem(pokemon) === 'flame-orb' ? 'burn' : 'badly-poisoned'
    if (
      !statusPreventedByTerrain(status, pokemon, field) &&
      !majorStatusImmune(status, pokemon, pokemon, side, field)
    ) {
      activateItem(pokemon, events)
      pokemon.status = status
      pokemon.toxicTurns = 0
      events.push({ type: 'status', pokemon: battlePokemonName(pokemon), status })
    }
  }
  applyStatusHealingItem(pokemon, events)
  applyHpThresholdItem(pokemon, events)
  applyWhiteHerb(pokemon, events)
  abilityResidual(side, foe, field, random, events)
  if (pokemon.hp === 0) events.push({ type: 'faint', pokemon: battlePokemonName(pokemon) })
}

function resolveWish(side: BattleSide, events: BattleEvent[]) {
  if (!side.wish || --side.wish.turns > 0) return
  const wish = side.wish
  delete side.wish
  const pokemon = side.roster[side.active]
  if (!pokemon || pokemon.hp <= 0 || pokemon.volatile['heal-block']) return
  const amount = Math.min(pokemon.maxHp - pokemon.hp, wish.amount)
  if (amount <= 0) return
  pokemon.hp += amount
  events.push({
    type: 'heal',
    pokemon: battlePokemonName(pokemon),
    amount,
    percentage: hpPercentage(amount, pokemon.maxHp),
  })
}

function tickField(state: BattleState, events: BattleEvent[]) {
  if (state.field.weather && !state.field.primalWeather && --state.field.weatherTurns <= 0) {
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
  field: BattleField,
) {
  if (choice.kind !== 'move' || !choice.tera) return
  const pokemon = side.roster[side.active]
  if (!pokemon || pokemon.hp <= 0 || pokemon.terastallized) return
  pokemon.terastallized = true
  abilityTera(pokemon, field, events)
  events.push({ type: 'tera', side: sideName, pokemon: battlePokemonName(pokemon), tera: pokemon.member.tera })
}

function settlePhase(state: BattleState, events: BattleEvent[]) {
  for (const [own, foe] of [
    [state.player, state.opponent],
    [state.opponent, state.player],
  ]) {
    for (const pokemon of own.roster) {
      const carrier = foe.roster[foe.active]
      if (
        pokemon.skyDropSourceId &&
        (carrier.hp <= 0 ||
          carrier.member.id !== pokemon.skyDropSourceId ||
          carrier.skyDropTargetId !== pokemon.member.id)
      )
        delete pokemon.skyDropSourceId
    }
  }
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
  return state.phase
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
        ? (battleMoveSlot(own.roster[own.active], selectedBattleMoveIndex(own.roster[own.active], choice.index))?.data
            .name ?? null)
        : null
    performChoice(own, foe, state.field, choice, side, random, events, state.turn)
    abilityObserveBoosts(foe.roster[foe.active], own.roster[own.active], events, eventStart)
    if (own.roster[own.active].hp === 0 && !own.roster[own.active].abilityMemory?.faintedNotified)
      own.totalFainted = (own.totalFainted ?? 0) + 1
    if (foe.roster[foe.active].hp === 0 && !foe.roster[foe.active].abilityMemory?.faintedNotified)
      foe.totalFainted = (foe.totalFainted ?? 0) + 1
    abilityNotifyFaint(own.roster[own.active], foe.roster[foe.active], events)
    abilityNotifyFaint(foe.roster[foe.active], own.roster[own.active], events)
    if (events.length > eventStart || move) {
      steps.push({ state: cloneState(state), events: events.slice(eventStart), action: { side, move } })
    }
  }
  const finishSteps = (eventStart: number) => {
    const finalEvents = events.slice(eventStart)
    if (steps.length) {
      const last = steps[steps.length - 1]
      steps[steps.length - 1] = { ...last, state: cloneState(state), events: [...last.events, ...finalEvents] }
    } else steps.push({ state: cloneState(state), events: events.slice(1), action: null })
    if (events[0]?.type === 'turn' && !current.pendingTurn) steps[0].events.unshift(events[0])
    return steps
  }
  if (state.phase === 'player-switch' || state.phase === 'opponent-switch') {
    const side = state.phase === 'player-switch' ? 'player' : 'opponent'
    const other = side === 'player' ? 'opponent' : 'player'
    performStep(state[side], state[other], side === 'player' ? playerChoice : opponentChoice, side)
    if (side === 'player' && state.opponent.roster[state.opponent.active].hp === 0)
      performStep(state.opponent, state.player, opponentChoice, 'opponent')
    const eventStart = events.length
    const phase = settlePhase(state, events)
    if (!state.pendingTurn || phase !== 'choice') return finishSteps(eventStart)
  }

  let actions = state.pendingTurn
  delete state.pendingTurn
  if (!actions) {
    const lockedChoice = (side: BattleSide, choice: BattleChoice): BattleChoice => {
      const pokemon = side.roster[side.active]
      return pokemon.hp > 0 &&
        !pokemon.skyDropSourceId &&
        (pokemon.recharging || pokemon.chargingMoveIndex !== undefined)
        ? { kind: 'move', index: pokemon.chargingMoveIndex ?? 0 }
        : choice
    }
    playerChoice = lockedChoice(state.player, playerChoice)
    opponentChoice = lockedChoice(state.opponent, opponentChoice)
    const teraEventStart = events.length
    applyTurnTerastallization(state.player, playerChoice, 'player', events, state.field)
    applyTurnTerastallization(state.opponent, opponentChoice, 'opponent', events, state.field)
    if (events.length > teraEventStart) {
      steps.push({ state: cloneState(state), events: events.slice(0), action: null })
      events.length = 0
    }
    for (const s of [state.player, state.opponent]) {
      abilityMemory(s.roster[s.active]).moved = false
      abilityMemory(s.roster[s.active]).harvestedThisTurn = false
      delete abilityMemory(s.roster[s.active]).lastConsumed
    }
    synchronizeAbilities(state.player, state.opponent, state.field, events)
    const playerPriority = choicePriority(state.player, playerChoice)
    const opponentPriority = choicePriority(state.opponent, opponentChoice)
    const actionOrder = (side: BattleSide, choice: BattleChoice) => {
      const p = side.roster[side.active]
      const move = choice.kind === 'move' ? battleMoveSlot(p, choice.index)?.data : undefined
      return move ? abilityMoveOrder(p, move, random) : 0
    }
    const playerOrder = actionOrder(state.player, playerChoice)
    const opponentOrder = actionOrder(state.opponent, opponentChoice)
    const playerSpeed = speed(state.player, state.field, state.opponent.roster[state.opponent.active])
    const opponentSpeed = speed(state.opponent, state.field, state.player.roster[state.player.active])
    const playerWinsSpeed = state.field.trickRoomTurns > 0 ? playerSpeed < opponentSpeed : playerSpeed > opponentSpeed
    const playerFirst =
      playerPriority > opponentPriority ||
      (playerPriority === opponentPriority &&
        (playerOrder > opponentOrder ||
          (playerOrder === opponentOrder && (playerWinsSpeed || (playerSpeed === opponentSpeed && random() < 0.5)))))
    const playerAction = {
      side: 'player' as const,
      choice: playerChoice,
      memberId: state.player.roster[state.player.active].member.id,
    }
    const opponentAction = {
      side: 'opponent' as const,
      choice: opponentChoice,
      memberId: state.opponent.roster[state.opponent.active].member.id,
    }
    actions = playerFirst ? [playerAction, opponentAction] : [opponentAction, playerAction]
  }
  for (const [index, action] of actions.entries()) {
    const own = state[action.side]
    const other = action.side === 'player' ? 'opponent' : 'player'
    if (own.roster[own.active].member.id === action.memberId) performStep(own, state[other], action.choice, action.side)
    if (state.player.switchRequested || state.opponent.switchRequested) {
      const eventStart = events.length
      state.pendingTurn = actions.slice(index + 1)
      settlePhase(state, events)
      return finishSteps(eventStart)
    }
  }
  const finalEventStart = events.length
  residual(state.player, state.opponent, state.field, random, events)
  residual(state.opponent, state.player, state.field, random, events)
  resolveWish(state.player, events)
  resolveWish(state.opponent, events)
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
    if (target.hp === 0) events.push({ type: 'faint', pokemon: battlePokemonName(target) })
  }
  for (const side of [state.player, state.opponent])
    if (side.roster[side.active].hp === 0 && !side.roster[side.active].abilityMemory?.faintedNotified)
      side.totalFainted = (side.totalFainted ?? 0) + 1
  abilityNotifyFaint(state.player.roster[state.player.active], state.opponent.roster[state.opponent.active], events)
  abilityNotifyFaint(state.opponent.roster[state.opponent.active], state.player.roster[state.player.active], events)
  tickField(state, events)
  settlePhase(state, events)
  state.turn += 1
  return finishSteps(finalEventStart)
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
