import type { BattleMove } from './battle'
import singlesExclusions from '../data/third-party/battle-move-singles-exclusions.json'

/** These moves remain selectable, but cannot resolve an effect in this format. */
export function moveFailsInSingles(moveName: string) {
  return Object.hasOwn(singlesExclusions, moveName)
}

export type SupplementalMoveEffect =
  | { kind: 'revive-ally' }
  | { kind: 'lunar-blessing' }
  | { kind: 'wish' }
  | { kind: 'encore'; minimumTurns: number; maximumTurns: number }
  | { kind: 'taunt'; turns: number }
  | { kind: 'fixed-damage'; amount: 'level' | 'half-current-hp' | 'hp-difference' }
  | { kind: 'equalize-hp' }
  | { kind: 'substitute' }
  | { kind: 'curse' }
  | { kind: 'reset-stages'; target: 'target' | 'all' }
  | { kind: 'cure-team-status' }
  | { kind: 'set-weather'; weather: 'rain' | 'sun' | 'sandstorm' | 'snow'; turns: number }
  | { kind: 'set-terrain'; terrain: 'electric' | 'grassy' | 'misty' | 'psychic'; turns: number }
  | { kind: 'clear-terrain' }
  | { kind: 'set-trick-room'; turns: number }
  | { kind: 'clear-target-screens' }
  | {
      kind: 'set-volatile'
      condition:
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
      turns?: number
    }
  | {
      kind: 'set-side-condition'
      condition: 'reflect' | 'light-screen' | 'aurora-veil' | 'tailwind' | 'safeguard' | 'crafty-shield'
      turns: number
      requiresWeather?: 'snow'
    }

/** Structured battle behavior that PokéAPI does not expose in its move payload. */
const supplementalMoveEffects: Readonly<Record<string, SupplementalMoveEffect>> = {
  'revival-blessing': { kind: 'revive-ally' },
  'lunar-blessing': { kind: 'lunar-blessing' },
  wish: { kind: 'wish' },
  encore: { kind: 'encore', minimumTurns: 3, maximumTurns: 3 },
  taunt: { kind: 'taunt', turns: 3 },
  'seismic-toss': { kind: 'fixed-damage', amount: 'level' },
  'night-shade': { kind: 'fixed-damage', amount: 'level' },
  'super-fang': { kind: 'fixed-damage', amount: 'half-current-hp' },
  ruination: { kind: 'fixed-damage', amount: 'half-current-hp' },
  endeavor: { kind: 'fixed-damage', amount: 'hp-difference' },
  'pain-split': { kind: 'equalize-hp' },
  substitute: { kind: 'substitute' },
  curse: { kind: 'curse' },
  haze: { kind: 'reset-stages', target: 'all' },
  'clear-smog': { kind: 'reset-stages', target: 'target' },
  'heal-bell': { kind: 'cure-team-status' },
  aromatherapy: { kind: 'cure-team-status' },
  'rain-dance': { kind: 'set-weather', weather: 'rain', turns: 5 },
  'sunny-day': { kind: 'set-weather', weather: 'sun', turns: 5 },
  sandstorm: { kind: 'set-weather', weather: 'sandstorm', turns: 5 },
  snowscape: { kind: 'set-weather', weather: 'snow', turns: 5 },
  'chilly-reception': { kind: 'set-weather', weather: 'snow', turns: 5 },
  'electric-terrain': { kind: 'set-terrain', terrain: 'electric', turns: 5 },
  'grassy-terrain': { kind: 'set-terrain', terrain: 'grassy', turns: 5 },
  'misty-terrain': { kind: 'set-terrain', terrain: 'misty', turns: 5 },
  'psychic-terrain': { kind: 'set-terrain', terrain: 'psychic', turns: 5 },
  'ice-spinner': { kind: 'clear-terrain' },
  'steel-roller': { kind: 'clear-terrain' },
  'trick-room': { kind: 'set-trick-room', turns: 5 },
  reflect: { kind: 'set-side-condition', condition: 'reflect', turns: 5 },
  'light-screen': { kind: 'set-side-condition', condition: 'light-screen', turns: 5 },
  'aurora-veil': {
    kind: 'set-side-condition',
    condition: 'aurora-veil',
    turns: 5,
    requiresWeather: 'snow',
  },
  tailwind: { kind: 'set-side-condition', condition: 'tailwind', turns: 4 },
  safeguard: { kind: 'set-side-condition', condition: 'safeguard', turns: 5 },
  'crafty-shield': { kind: 'set-side-condition', condition: 'crafty-shield', turns: 1 },
  'brick-break': { kind: 'clear-target-screens' },
  'psychic-fangs': { kind: 'clear-target-screens' },
  'raging-bull': { kind: 'clear-target-screens' },
  'aqua-ring': { kind: 'set-volatile', condition: 'aqua-ring' },
  ingrain: { kind: 'set-volatile', condition: 'ingrain' },
  'magnet-rise': { kind: 'set-volatile', condition: 'magnet-rise', turns: 5 },
  bind: { kind: 'set-volatile', condition: 'bound', turns: 5 },
  clamp: { kind: 'set-volatile', condition: 'bound', turns: 5 },
  'fire-spin': { kind: 'set-volatile', condition: 'bound', turns: 5 },
  infestation: { kind: 'set-volatile', condition: 'bound', turns: 5 },
  'magma-storm': { kind: 'set-volatile', condition: 'bound', turns: 5 },
  'sand-tomb': { kind: 'set-volatile', condition: 'bound', turns: 5 },
  'snap-trap': { kind: 'set-volatile', condition: 'bound', turns: 5 },
  'thunder-cage': { kind: 'set-volatile', condition: 'bound', turns: 5 },
  whirlpool: { kind: 'set-volatile', condition: 'bound', turns: 5 },
  yawn: { kind: 'set-volatile', condition: 'yawn', turns: 2 },
  'heal-block': { kind: 'set-volatile', condition: 'heal-block', turns: 5 },
  disable: { kind: 'set-volatile', condition: 'disable', turns: 4 },
  nightmare: { kind: 'set-volatile', condition: 'nightmare' },
  'leech-seed': { kind: 'set-volatile', condition: 'leech-seed' },
  octolock: { kind: 'set-volatile', condition: 'octolock' },
  'salt-cure': { kind: 'set-volatile', condition: 'salt-cure' },
  'syrup-bomb': { kind: 'set-volatile', condition: 'syrupy', turns: 3 },
  'tar-shot': { kind: 'set-volatile', condition: 'tar-shot' },
  telekinesis: { kind: 'set-volatile', condition: 'telekinesis', turns: 3 },
  'throat-chop': { kind: 'set-volatile', condition: 'throat-chop', turns: 2 },
  'psychic-noise': { kind: 'set-volatile', condition: 'heal-block', turns: 2 },
  torment: { kind: 'set-volatile', condition: 'torment' },
  'smack-down': { kind: 'set-volatile', condition: 'smack-down' },
  'thousand-arrows': { kind: 'set-volatile', condition: 'smack-down' },
}

export function supplementalMoveEffect(moveName: string) {
  return supplementalMoveEffects[moveName] ?? null
}

/** Timing is independent of the post-hit effect: a move may have both. */
export type SupplementalMoveTiming = {
  chargeTurns?: number
  preventsConsecutiveUse?: boolean
  carriesTarget?: boolean
  rechargeTurns?: number
  chargeBoost?: 'defense' | 'specialAttack'
  instantWeather?: 'sun' | 'rain'
}

export const supplementalMoveTimings: Readonly<Record<string, SupplementalMoveTiming>> = {
  'sky-drop': { chargeTurns: 1, carriesTarget: true },
  'gigaton-hammer': { preventsConsecutiveUse: true },
  'blood-moon': { preventsConsecutiveUse: true },
  fly: { chargeTurns: 1 },
  dig: { chargeTurns: 1 },
  dive: { chargeTurns: 1 },
  bounce: { chargeTurns: 1 },
  'phantom-force': { chargeTurns: 1 },
  'shadow-force': { chargeTurns: 1 },
  'solar-beam': { chargeTurns: 1, instantWeather: 'sun' },
  'solar-blade': { chargeTurns: 1, instantWeather: 'sun' },
  'meteor-beam': { chargeTurns: 1, chargeBoost: 'specialAttack' },
  'electro-shot': { chargeTurns: 1, chargeBoost: 'specialAttack', instantWeather: 'rain' },
  geomancy: { chargeTurns: 1 },
  'skull-bash': { chargeTurns: 1, chargeBoost: 'defense' },
  'razor-wind': { chargeTurns: 1 },
  'sky-attack': { chargeTurns: 1 },
  'freeze-shock': { chargeTurns: 1 },
  'ice-burn': { chargeTurns: 1 },
  'hyper-beam': { rechargeTurns: 1 },
  'giga-impact': { rechargeTurns: 1 },
  'blast-burn': { rechargeTurns: 1 },
  'hydro-cannon': { rechargeTurns: 1 },
  'frenzy-plant': { rechargeTurns: 1 },
  'rock-wrecker': { rechargeTurns: 1 },
  'roar-of-time': { rechargeTurns: 1 },
  'meteor-assault': { rechargeTurns: 1 },
  'prismatic-laser': { rechargeTurns: 1 },
  eternabeam: { rechargeTurns: 1 },
}

/** Damage rules absent from PokéAPI's structured power and metadata. */
export const supplementalMoveDamage: Readonly<
  Record<
    string,
    {
      ohko?: boolean
      fixedDamage?: number | 'user-hp'
      alwaysCritical?: boolean
      powerRule?:
        | 'friendship'
        | 'frustration'
        | 'user-hp'
        | 'target-hp'
        | 'positive-stages'
        | 'speed-ratio'
        | 'inverse-speed-ratio'
    }
  >
> = {
  guillotine: { ohko: true },
  'horn-drill': { ohko: true },
  fissure: { ohko: true },
  'sheer-cold': { ohko: true },
  'sonic-boom': { fixedDamage: 20 },
  'dragon-rage': { fixedDamage: 40 },
  'final-gambit': { fixedDamage: 'user-hp' },
  'frost-breath': { alwaysCritical: true },
  'storm-throw': { alwaysCritical: true },
  'wicked-blow': { alwaysCritical: true },
  'surging-strikes': { alwaysCritical: true },
  'flower-trick': { alwaysCritical: true },
  return: { powerRule: 'friendship' },
  frustration: { powerRule: 'frustration' },
  eruption: { powerRule: 'user-hp' },
  'water-spout': { powerRule: 'user-hp' },
  'dragon-energy': { powerRule: 'user-hp' },
  'wring-out': { powerRule: 'target-hp' },
  'crush-grip': { powerRule: 'target-hp' },
  'hard-press': { powerRule: 'target-hp' },
  'stored-power': { powerRule: 'positive-stages' },
  'power-trip': { powerRule: 'positive-stages' },
  'electro-ball': { powerRule: 'speed-ratio' },
  'gyro-ball': { powerRule: 'inverse-speed-ratio' },
}

/** Explicit fallbacks for moves whose PokéAPI meta is null; sourced from the pinned reference snapshot. */
export const supplementalMoveMetadata: Readonly<Record<string, Partial<BattleMove>>> = {
  'psyshield-bash': { statChanges: [{ stat: 'defense', change: 1, target: 'user' }], statChance: 100 },
  'springtide-storm': { statChanges: [{ stat: 'attack', change: -1, target: 'target' }], statChance: 30 },
  'mystical-power': { statChanges: [{ stat: 'specialAttack', change: 1, target: 'user' }], statChance: 100 },
  'mountain-gale': { flinchChance: 30 },
  'victory-dance': {
    statChanges: [
      { stat: 'attack', change: 1, target: 'user' },
      { stat: 'defense', change: 1, target: 'user' },
      { stat: 'speed', change: 1, target: 'user' },
    ],
    statChance: 100,
  },
  'headlong-rush': {
    statChanges: [
      { stat: 'defense', change: -1, target: 'user' },
      { stat: 'specialDefense', change: -1, target: 'user' },
    ],
    statChance: 100,
  },
  'barb-barrage': { ailment: 'poison', ailmentChance: 50 },
  'esper-wing': { critRate: 1, statChanges: [{ stat: 'speed', change: 1, target: 'user' }], statChance: 100 },
  'bitter-malice': { statChanges: [{ stat: 'attack', change: -1, target: 'target' }], statChance: 100 },
  shelter: { statChanges: [{ stat: 'defense', change: 2, target: 'user' }], statChance: 100 },
  'triple-arrows': { critRate: 1 },
  'infernal-parade': { ailment: 'burn', ailmentChance: 30 },
  'bleakwind-storm': { statChanges: [{ stat: 'speed', change: -1, target: 'target' }], statChance: 30 },
  'wildbolt-storm': { ailment: 'paralysis', ailmentChance: 20 },
  'sandsear-storm': { ailment: 'burn', ailmentChance: 20 },
  'axe-kick': { ailment: 'confusion', ailmentChance: 30 },
  'lumina-crash': { statChanges: [{ stat: 'specialDefense', change: -2, target: 'target' }], statChance: 100 },
  'spicy-extract': {
    statChanges: [
      { stat: 'attack', change: 2, target: 'target' },
      { stat: 'defense', change: -2, target: 'target' },
    ],
    statChance: 100,
  },
  'spin-out': { statChanges: [{ stat: 'speed', change: -2, target: 'user' }], statChance: 100 },
  'population-bomb': { minHits: 10, maxHits: 10, multiAccuracy: true },
  'triple-dive': { minHits: 3, maxHits: 3 },
  'mortal-spin': { ailment: 'poison', ailmentChance: 100 },
  'fillet-away': {
    statChanges: [
      { stat: 'attack', change: 2, target: 'user' },
      { stat: 'specialAttack', change: 2, target: 'user' },
      { stat: 'speed', change: 2, target: 'user' },
    ],
    statChance: 100,
  },
  'flower-trick': { critRate: 3 },
  'torch-song': { statChanges: [{ stat: 'specialAttack', change: 1, target: 'user' }], statChance: 100 },
  'aqua-step': { statChanges: [{ stat: 'speed', change: 1, target: 'user' }], statChance: 100 },
  'make-it-rain': { statChanges: [{ stat: 'specialAttack', change: -1, target: 'user' }], statChance: 100 },
  pounce: { statChanges: [{ stat: 'speed', change: -1, target: 'target' }], statChance: 100 },
  trailblaze: { statChanges: [{ stat: 'speed', change: 1, target: 'user' }], statChance: 100 },
  'chilling-water': { statChanges: [{ stat: 'attack', change: -1, target: 'target' }], statChance: 100 },
  'twin-beam': { minHits: 2, maxHits: 2 },
  'armor-cannon': {
    statChanges: [
      { stat: 'defense', change: -1, target: 'user' },
      { stat: 'specialDefense', change: -1, target: 'user' },
    ],
    statChance: 100,
  },
  'bitter-blade': { drain: 50 },
  'aqua-cutter': { critRate: 1 },
  'blazing-torque': { ailment: 'burn', ailmentChance: 30 },
  'wicked-torque': { ailment: 'sleep', ailmentChance: 10 },
  'noxious-torque': { ailment: 'poison', ailmentChance: 30 },
  'combat-torque': { ailment: 'paralysis', ailmentChance: 30 },
  'magical-torque': { ailment: 'confusion', ailmentChance: 30 },
  'matcha-gotcha': { ailment: 'burn', ailmentChance: 20, drain: 50 },
  'ivy-cudgel': { critRate: 1 },
  'tachyon-cutter': { minHits: 2, maxHits: 2 },
  'upper-hand': { flinchChance: 100 },
  'malignant-chain': { ailment: 'badly-poisoned', ailmentChance: 50 },
}
