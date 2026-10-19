import { expect, it } from 'vitest'
import { isTeamPokemonEligible } from './team-pokemon-eligibility'

it.each([
  'koraidon-limited-build',
  'koraidon-sprinting-build',
  'koraidon-swimming-build',
  'koraidon-gliding-build',
  'miraidon-low-power-mode',
  'miraidon-drive-mode',
  'miraidon-aquatic-mode',
  'miraidon-glide-mode',
  'eternatus-eternamax',
])('excludes the non-playable form %s', (name) => {
  expect(isTeamPokemonEligible(name)).toBe(false)
})

it.each([
  'koraidon',
  'miraidon',
  'eternatus',
  'charizard-mega-x',
  'mewtwo-mega-y',
  'venusaur-mega',
  'charizard-gmax',
  'raichu-alola',
  'slowbro-galar',
  'zoroark-hisui',
  'tauros-paldea-aqua-breed',
  'rotom-wash',
  'deoxys-attack',
  'aegislash-blade',
  'palafin-hero',
  'groudon-primal',
])('allows the battle form %s', (name) => {
  expect(isTeamPokemonEligible(name)).toBe(true)
})
