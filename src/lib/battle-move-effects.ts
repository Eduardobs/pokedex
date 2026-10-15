export type SupplementalMoveEffect =
  | { kind: 'encore'; minimumTurns: number; maximumTurns: number }
  | { kind: 'taunt'; turns: number }
  | { kind: 'fixed-damage'; amount: 'level' | 'half-current-hp' | 'hp-difference' }
  | { kind: 'reset-stages'; target: 'target' | 'all' }
  | { kind: 'cure-team-status' }
  | { kind: 'set-weather'; weather: 'rain' | 'sun' | 'sandstorm' | 'snow'; turns: number }
  | { kind: 'set-terrain'; terrain: 'electric' | 'grassy' | 'misty' | 'psychic'; turns: number }
  | { kind: 'clear-terrain' }
  | { kind: 'set-trick-room'; turns: number }
  | { kind: 'clear-target-screens' }
  | {
      kind: 'set-side-condition'
      condition: 'reflect' | 'light-screen' | 'aurora-veil' | 'tailwind'
      turns: number
      requiresWeather?: 'snow'
    }

/** Structured battle behavior that PokéAPI does not expose in its move payload. */
const supplementalMoveEffects: Readonly<Record<string, SupplementalMoveEffect>> = {
  encore: { kind: 'encore', minimumTurns: 2, maximumTurns: 6 },
  taunt: { kind: 'taunt', turns: 3 },
  'seismic-toss': { kind: 'fixed-damage', amount: 'level' },
  'night-shade': { kind: 'fixed-damage', amount: 'level' },
  'super-fang': { kind: 'fixed-damage', amount: 'half-current-hp' },
  ruination: { kind: 'fixed-damage', amount: 'half-current-hp' },
  endeavor: { kind: 'fixed-damage', amount: 'hp-difference' },
  haze: { kind: 'reset-stages', target: 'all' },
  'clear-smog': { kind: 'reset-stages', target: 'target' },
  'heal-bell': { kind: 'cure-team-status' },
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
  'brick-break': { kind: 'clear-target-screens' },
  'psychic-fangs': { kind: 'clear-target-screens' },
  'raging-bull': { kind: 'clear-target-screens' },
}

export function supplementalMoveEffect(moveName: string) {
  return supplementalMoveEffects[moveName] ?? null
}
