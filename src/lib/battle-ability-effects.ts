import type { BattleStatus, BattleTerrain, BattleWeather } from './battle'
import type { BattleType } from './type-chart'

export type AbilityMoveImmunity = {
  type: BattleType
  healFraction?: number
  boost?: { stat: 'attack' | 'defense' | 'specialAttack' | 'speed'; stages: number }
  activatesPowerBoost?: boolean
}

/**
 * Structured ability facts that PokéAPI exposes only as prose. These rules are
 * intentionally narrow: the ability audit reports every behavior that still
 * needs an engine hook instead of treating absent structured data as no effect.
 */
export const supplementalAbilityMoveImmunities: Readonly<Record<string, AbilityMoveImmunity>> = {
  'volt-absorb': { type: 'electric', healFraction: 1 / 4 },
  'water-absorb': { type: 'water', healFraction: 1 / 4 },
  'dry-skin': { type: 'water', healFraction: 1 / 4 },
  'earth-eater': { type: 'ground', healFraction: 1 / 4 },
  levitate: { type: 'ground' },
  'lightning-rod': { type: 'electric', boost: { stat: 'specialAttack', stages: 1 } },
  'motor-drive': { type: 'electric', boost: { stat: 'speed', stages: 1 } },
  'storm-drain': { type: 'water', boost: { stat: 'specialAttack', stages: 1 } },
  'sap-sipper': { type: 'grass', boost: { stat: 'attack', stages: 1 } },
  'flash-fire': { type: 'fire', activatesPowerBoost: true },
  'well-baked-body': { type: 'fire', boost: { stat: 'defense', stages: 2 } },
}

export const supplementalAbilityStatusImmunities: Readonly<
  Partial<Record<Exclude<BattleStatus, null>, readonly string[]>>
> = {
  burn: ['water-veil', 'water-bubble', 'thermal-exchange'],
  freeze: ['magma-armor'],
  paralysis: ['limber'],
  poison: ['immunity', 'poison-heal', 'pastel-veil'],
  'badly-poisoned': ['immunity', 'poison-heal', 'pastel-veil'],
  sleep: ['insomnia', 'vital-spirit', 'sweet-veil'],
}

export type SupplementalAbilityWeather = {
  weather: BattleWeather
  setOnEntry?: true
  speedMultiplier?: number
  healFraction?: number
  damageFraction?: number
  statusCure?: true
}

export const supplementalAbilityWeather: Readonly<Record<string, readonly SupplementalAbilityWeather[]>> = {
  drizzle: [{ weather: 'rain', setOnEntry: true }],
  drought: [{ weather: 'sun', setOnEntry: true }],
  'sand-stream': [{ weather: 'sandstorm', setOnEntry: true }],
  'snow-warning': [{ weather: 'snow', setOnEntry: true }],
  'orichalcum-pulse': [{ weather: 'sun', setOnEntry: true }],
  'swift-swim': [{ weather: 'rain', speedMultiplier: 2 }],
  chlorophyll: [{ weather: 'sun', speedMultiplier: 2 }],
  'sand-rush': [{ weather: 'sandstorm', speedMultiplier: 2 }],
  'slush-rush': [{ weather: 'snow', speedMultiplier: 2 }],
  'rain-dish': [{ weather: 'rain', healFraction: 1 / 16 }],
  'ice-body': [{ weather: 'snow', healFraction: 1 / 16 }],
  'dry-skin': [
    { weather: 'rain', healFraction: 1 / 8 },
    { weather: 'sun', damageFraction: 1 / 8 },
  ],
  'solar-power': [{ weather: 'sun', damageFraction: 1 / 8 }],
  hydration: [{ weather: 'rain', statusCure: true }],
}

export type SupplementalAbilityTerrain = {
  terrain: BattleTerrain
  setOnEntry?: true
  speedMultiplier?: number
}

export const supplementalAbilityTerrain: Readonly<Record<string, SupplementalAbilityTerrain>> = {
  'electric-surge': { terrain: 'electric', setOnEntry: true },
  'grassy-surge': { terrain: 'grassy', setOnEntry: true },
  'misty-surge': { terrain: 'misty', setOnEntry: true },
  'psychic-surge': { terrain: 'psychic', setOnEntry: true },
  'hadron-engine': { terrain: 'electric', setOnEntry: true },
  'surge-surfer': { terrain: 'electric', speedMultiplier: 2 },
}

/** Abilities whose only documented effect cannot affect this local singles format. */
export const singlesInapplicableAbilities = new Set([
  'run-away',
  'illuminate',
  'honey-gather',
  'friend-guard',
  'healer',
  'telepathy',
  'symbiosis',
  'battery',
  'receiver',
  'power-of-alchemy',
  'ball-fetch',
  'commander',
  'costar',
  'hospitality',
])
