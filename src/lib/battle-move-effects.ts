export type SupplementalMoveEffect =
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
  wish: { kind: 'wish' },
  encore: { kind: 'encore', minimumTurns: 2, maximumTurns: 6 },
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
  torment: { kind: 'set-volatile', condition: 'torment' },
  'smack-down': { kind: 'set-volatile', condition: 'smack-down' },
  'thousand-arrows': { kind: 'set-volatile', condition: 'smack-down' },
}

export function supplementalMoveEffect(moveName: string) {
  return supplementalMoveEffects[moveName] ?? null
}
