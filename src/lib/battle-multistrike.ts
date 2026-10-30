/** Latest turn-based main-series rules (Generation IX), including legacy moves. */
export type MultistrikeRule = {
  hits: readonly [number, number]
  accuracyPerHit?: boolean
  escalatingPower?: number
  partyDependent?: boolean
}

export const multistrikeMoves: Readonly<Record<string, MultistrikeRule>> = {
  'double-slap': { hits: [2, 5] },
  'comet-punch': { hits: [2, 5] },
  'double-kick': { hits: [2, 2] },
  'fury-attack': { hits: [2, 5] },
  twineedle: { hits: [2, 2] },
  'pin-missile': { hits: [2, 5] },
  'spike-cannon': { hits: [2, 5] },
  barrage: { hits: [2, 5] },
  'fury-swipes': { hits: [2, 5] },
  bonemerang: { hits: [2, 2] },
  'triple-kick': { hits: [3, 3], accuracyPerHit: true, escalatingPower: 10 },
  'bone-rush': { hits: [2, 5] },
  'beat-up': { hits: [1, 6], partyDependent: true },
  'arm-thrust': { hits: [2, 5] },
  'bullet-seed': { hits: [2, 5] },
  'icicle-spear': { hits: [2, 5] },
  'rock-blast': { hits: [2, 5] },
  'double-hit': { hits: [2, 2] },
  'dual-chop': { hits: [2, 2] },
  'tail-slap': { hits: [2, 5] },
  'gear-grind': { hits: [2, 2] },
  'water-shuriken': { hits: [2, 5] },
  'double-iron-bash': { hits: [2, 2] },
  'dragon-darts': { hits: [2, 2] },
  'scale-shot': { hits: [2, 5] },
  'triple-axel': { hits: [3, 3], accuracyPerHit: true, escalatingPower: 20 },
  'dual-wingbeat': { hits: [2, 2] },
  'surging-strikes': { hits: [3, 3] },
  'population-bomb': { hits: [10, 10], accuracyPerHit: true },
  'triple-dive': { hits: [3, 3] },
  'twin-beam': { hits: [2, 2] },
  'tachyon-cutter': { hits: [2, 2] },
}
