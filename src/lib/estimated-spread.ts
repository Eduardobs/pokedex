import { invalidData, record, reference } from './resource-data'
import { natureModifiers, natureNames, statNames, type Stats, type TeamMember, type TeamPokemon } from './teams'

type BattleStat = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
type NonHpBattleStat = Exclude<BattleStat, 'hp'>
type MoveCategory = 'physical' | 'special' | 'status'
type Role =
  | 'bulkyBand'
  | 'fastBand'
  | 'bulkySpecs'
  | 'fastSpecs'
  | 'physicalScarf'
  | 'specialScarf'
  | 'physicalMixedScarf'
  | 'specialMixedScarf'
  | 'fastPhysicalSweeper'
  | 'fastSpecialSweeper'
  | 'bulkyPhysicalSweeper'
  | 'bulkySpecialSweeper'
  | 'fastBulkySupport'
  | 'physicallyDefensive'
  | 'speciallyDefensive'

export type EstimatedMove = {
  name: string
  category: MoveCategory
  selfTarget: boolean
  healing: boolean
}

export type EstimatedSpread = {
  role: Role
  evs: Stats
  nature: string
  plusStat: NonHpBattleStat
  minusStat: NonHpBattleStat
}

type MoveProfile = {
  physical: number
  special: number
  physicalAttacks: number
  specialAttacks: number
  physicalSetup: number
  specialSetup: number
  support: number
  setup: number
  restoration: number
  offense: number
  stall: number
  specialStall: number
  physicalStall: number
  ultrafast: number
  fast: boolean
  bulk: number
  physicalBulk: number
  specialBulk: number
  moves: Set<string>
}

const battleStats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const
const battleToTeamIndex: Record<BattleStat, number> = { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 }
const battleToTeamName: Record<NonHpBattleStat, (typeof statNames)[number]> = {
  atk: 'attack',
  def: 'defense',
  spa: 'special-attack',
  spd: 'special-defense',
  spe: 'speed',
}
const roleStats: Record<Role, [NonHpBattleStat, BattleStat]> = {
  bulkyBand: ['atk', 'hp'],
  fastBand: ['spe', 'atk'],
  bulkySpecs: ['spa', 'hp'],
  fastSpecs: ['spe', 'spa'],
  physicalScarf: ['spe', 'atk'],
  specialScarf: ['spe', 'spa'],
  physicalMixedScarf: ['spe', 'atk'],
  specialMixedScarf: ['spe', 'spa'],
  fastPhysicalSweeper: ['spe', 'atk'],
  fastSpecialSweeper: ['spe', 'spa'],
  bulkyPhysicalSweeper: ['atk', 'hp'],
  bulkySpecialSweeper: ['spa', 'hp'],
  fastBulkySupport: ['spe', 'hp'],
  physicallyDefensive: ['def', 'hp'],
  speciallyDefensive: ['spd', 'hp'],
}

const id = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')
const has = (profile: MoveProfile, ...moves: string[]) => moves.some((move) => profile.moves.has(move))

export function parseEstimatedMove(value: unknown): EstimatedMove {
  const data = record(value)
  const damageClass = reference(data.damage_class)?.name
  const target = reference(data.target)?.name
  const meta = record(data.meta)
  if (
    typeof data.name !== 'string' ||
    !/^[a-z0-9-]{1,100}$/.test(data.name) ||
    !['physical', 'special', 'status'].includes(String(damageClass)) ||
    typeof target !== 'string' ||
    target.length > 100 ||
    (meta.healing !== undefined &&
      (!Number.isInteger(meta.healing) || Number(meta.healing) < 0 || Number(meta.healing) > 100))
  )
    return invalidData()
  return {
    name: data.name,
    category: damageClass as MoveCategory,
    selfTarget: target === 'user',
    healing: Number(meta.healing) > 0,
  }
}

export function hasEnoughMoves(pokemon: string, moves: string[]) {
  const selected = moves.filter(Boolean)
  if (!selected.length) return false
  return (
    ['ditto', 'unown'].includes(id(pokemon)) ||
    selected.some((move) => id(move) === 'lastresort') ||
    selected.length === 4
  )
}

function profileMoves(pokemon: TeamPokemon, member: TeamMember, moves: EstimatedMove[]): MoveProfile {
  const profile: MoveProfile = {
    physical: 0,
    special: 0,
    physicalAttacks: 0,
    specialAttacks: 0,
    physicalSetup: 0,
    specialSetup: 0,
    support: 0,
    setup: 0,
    restoration: 0,
    offense: 0,
    stall: 0,
    specialStall: 0,
    physicalStall: 0,
    ultrafast: 0,
    fast: false,
    bulk: 0,
    physicalBulk: 0,
    specialBulk: 0,
    moves: new Set(moves.map((move) => id(move.name))),
  }
  for (const move of moves) {
    const moveId = id(move.name)
    if (move.category === 'status') {
      if (['batonpass', 'healingwish', 'lunardance'].includes(moveId)) {
        profile.support += 1
      } else if (['metronome', 'assist', 'copycat', 'mefirst', 'photongeyser', 'shellsidearm'].includes(moveId)) {
        profile.physical += 0.5
        profile.special += 0.5
      } else if (moveId === 'naturepower') {
        profile.special += 1
      } else if (['protect', 'detect', 'spikyshield', 'kingsshield'].includes(moveId)) {
        profile.stall += 1
      } else if (moveId === 'wish') {
        profile.restoration += 1
        profile.stall += 1
        profile.support += 1
      } else if (move.healing) {
        profile.restoration += 1
        profile.stall += 1
      } else if (move.selfTarget) {
        if (['agility', 'rockpolish', 'shellsmash', 'growth', 'workup'].includes(moveId)) {
          profile.physicalSetup += 1
          profile.specialSetup += 1
        } else if (['dragondance', 'swordsdance', 'coil', 'bulkup', 'curse', 'bellydrum'].includes(moveId)) {
          profile.physicalSetup += 1
        } else if (['nastyplot', 'tailglow', 'quiverdance', 'calmmind', 'geomancy'].includes(moveId)) {
          profile.specialSetup += 1
        }
        if (moveId === 'substitute') profile.stall += 1
        profile.setup += 1
      } else {
        if (['toxic', 'leechseed', 'willowisp'].includes(moveId)) profile.stall += 1
        profile.support += 1
      }
    } else if (['counter', 'endeavor', 'metalburst', 'mirrorcoat', 'rapidspin'].includes(moveId)) {
      profile.support += 1
    } else if (
      [
        'nightshade',
        'seismictoss',
        'psywave',
        'superfang',
        'naturesmadness',
        'foulplay',
        'finalgambit',
        'bodypress',
      ].includes(moveId)
    ) {
      profile.offense += 1
    } else if (moveId === 'fellstinger') {
      profile.physicalSetup += 1
      profile.setup += 1
    } else {
      profile[move.category] += 1
      profile.offense += 1
      if (moveId === 'knockoff') profile.support += 1
      if (['scald', 'voltswitch', 'uturn', 'flipturn'].includes(moveId)) profile[move.category] -= 0.2
    }
  }

  if (has(profile, 'batonpass')) profile.support += profile.setup
  profile.physicalAttacks = profile.physical
  profile.specialAttacks = profile.special
  profile.physical += profile.physicalSetup
  profile.special += profile.specialSetup
  if (has(profile, 'dragondance', 'quiverdance')) profile.ultrafast = 1

  const ability = id(member.ability)
  const item = id(member.item)
  let fast = pokemon.stats[5] >= 80
  let physicalBulk = (pokemon.stats[0] + 75) * (pokemon.stats[2] + 87)
  let specialBulk = (pokemon.stats[0] + 75) * (pokemon.stats[4] + 87)

  if (has(profile, 'willowisp', 'acidarmor', 'irondefense', 'cottonguard')) {
    physicalBulk *= 1.6
    profile.physicalStall += 1
  } else if (has(profile, 'scald', 'bulkup', 'coil', 'cosmicpower')) {
    physicalBulk *= 1.3
    if (has(profile, 'scald')) profile.specialStall += 1
    else profile.physicalStall += 1
  }
  if (ability === 'flamebody') physicalBulk *= 1.1
  if (has(profile, 'calmmind', 'quiverdance', 'geomancy')) {
    specialBulk *= 1.3
    profile.specialStall += 1
  }
  if (ability === 'sandstream' && pokemon.types.includes('rock')) specialBulk *= 1.5
  if (has(profile, 'bellydrum')) {
    physicalBulk *= 0.6
    specialBulk *= 0.6
  }
  if (profile.restoration) {
    physicalBulk *= 1.5
    specialBulk *= 1.5
  } else if (has(profile, 'painsplit') && has(profile, 'substitute')) {
    profile.stall -= 1
  } else if (has(profile, 'painsplit', 'rest')) {
    physicalBulk *= 1.4
    specialBulk *= 1.4
  }
  if ((has(profile, 'bodyslam', 'thunder') && ability === 'serenegrace') || has(profile, 'thunderwave')) {
    physicalBulk *= 1.1
    specialBulk *= 1.1
  }
  if (has(profile, 'ironhead', 'airslash') && ability === 'serenegrace') {
    physicalBulk *= 1.1
    specialBulk *= 1.1
  }
  if (has(profile, 'gigadrain', 'drainpunch', 'hornleech')) {
    physicalBulk *= 1.15
    specialBulk *= 1.15
  }
  if (['leftovers', 'blacksludge'].includes(item) || has(profile, 'leechseed')) {
    const multiplier = 1 + 0.1 * (1 + profile.stall / 1.5)
    physicalBulk *= multiplier
    specialBulk *= multiplier
  }
  if (['flameorb', 'toxicorb'].includes(item) && ability !== 'magicguard') {
    const multiplier = item === 'toxicorb' && ability === 'poisonheal' ? 1 + 0.1 * (2 + profile.stall) : 0.8
    physicalBulk *= multiplier
    specialBulk *= multiplier
  }
  if (item === 'lifeorb') {
    physicalBulk *= 0.7
    specialBulk *= 0.7
  }
  if (['multiscale', 'magicguard', 'regenerator'].includes(ability)) {
    physicalBulk *= 1.4
    specialBulk *= 1.4
  }
  if (item === 'eviolite') {
    physicalBulk *= 1.5
    specialBulk *= 1.5
  }
  if (item === 'assaultvest') specialBulk *= 1.5

  const bulk = physicalBulk + specialBulk
  if (bulk < 46_000 && pokemon.stats[5] >= 70) fast = true
  if (has(profile, 'trickroom')) fast = false
  if (has(profile, 'agility', 'dragondance', 'quiverdance', 'rockpolish', 'shellsmash', 'flamecharge')) {
    fast = true
  } else if (['unburden', 'speedboost', 'motordrive'].includes(ability)) {
    fast = true
    profile.ultrafast = 1
  } else if (['chlorophyll', 'swiftswim', 'sandrush'].includes(ability)) {
    fast = true
    profile.ultrafast = 2
  } else if (item === 'salacberry') {
    fast = true
  }
  if (has(profile, 'agility', 'shellsmash', 'autotomize', 'shiftgear', 'rockpolish')) profile.ultrafast = 2
  profile.fast = fast
  profile.bulk = bulk
  profile.physicalBulk = physicalBulk
  profile.specialBulk = specialBulk
  return profile
}

function selectRole(pokemon: TeamPokemon, member: TeamMember, profile: MoveProfile): Role {
  const pokemonId = id(pokemon.name)
  const ability = id(member.ability)
  const item = id(member.item)
  if (pokemonId === 'ditto') return ability === 'imposter' ? 'physicallyDefensive' : 'fastBulkySupport'
  if (pokemonId === 'shedinja') return 'fastPhysicalSweeper'
  if (item === 'choiceband' && profile.physicalAttacks >= 2) return profile.fast ? 'fastBand' : 'bulkyBand'
  if (item === 'choicespecs' && profile.specialAttacks >= 2) return profile.fast ? 'fastSpecs' : 'bulkySpecs'
  if (item === 'choicescarf') {
    if (!profile.physicalAttacks) return 'specialScarf'
    if (!profile.specialAttacks) return 'physicalScarf'
    if (profile.physicalAttacks > profile.specialAttacks) return 'physicalMixedScarf'
    if (profile.specialAttacks > profile.physicalAttacks) return 'specialMixedScarf'
    return pokemon.stats[1] < pokemon.stats[3] ? 'specialMixedScarf' : 'physicalMixedScarf'
  }
  if (pokemonId === 'unown') return 'fastSpecialSweeper'
  if (profile.physicalStall && profile.restoration)
    return pokemon.stats[5] > 110 && ability !== 'prankster' ? 'fastBulkySupport' : 'speciallyDefensive'
  if (profile.specialStall && profile.restoration && item !== 'lifeorb')
    return pokemon.stats[5] > 110 && ability !== 'prankster' ? 'fastBulkySupport' : 'physicallyDefensive'

  let bias: 'physical' | 'special' = 'physical'
  if (pokemon.stats[3] > pokemon.stats[1] && profile.special > 1) bias = 'special'
  else if (pokemon.stats[1] > pokemon.stats[3] && profile.physical > 1) bias = 'physical'
  else if (profile.special > profile.physical) bias = 'special'
  if (profile.stall + profile.support / 2 <= 2 && profile.bulk < 135_000 && profile[bias] >= 1.5) {
    if (profile.fast) {
      if (profile.bulk > 80_000 && !profile.ultrafast)
        return bias === 'physical' ? 'bulkyPhysicalSweeper' : 'bulkySpecialSweeper'
      return bias === 'physical' ? 'fastPhysicalSweeper' : 'fastSpecialSweeper'
    }
    if (profile[bias] >= 3 || profile.stall <= 0)
      return bias === 'physical' ? 'bulkyPhysicalSweeper' : 'bulkySpecialSweeper'
  }
  if (profile.fast && ability !== 'prankster' && (pokemon.stats[5] > 100 || profile.bulk < 55_000 || profile.ultrafast))
    return 'fastBulkySupport'
  if (profile.specialStall) return 'physicallyDefensive'
  if (profile.physicalStall) return 'speciallyDefensive'
  if (['blissey', 'chansey'].includes(pokemonId)) return 'physicallyDefensive'
  return profile.specialBulk >= profile.physicalBulk ? 'speciallyDefensive' : 'physicallyDefensive'
}

function statValue(pokemon: TeamPokemon, member: TeamMember, stat: BattleStat, ev: number, nature = 1) {
  const index = battleToTeamIndex[stat]
  const base = pokemon.stats[index]
  const iv = member.ivs[index]
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * member.level) / 100)
  if (stat === 'hp') return pokemon.name === 'shedinja' ? 1 : core + member.level + 10
  return Math.floor((core + 5) * nature)
}

function usefulMaximum(pokemon: TeamPokemon, member: TeamMember, stat: BattleStat, nature: number) {
  const maximum = statValue(pokemon, member, stat, 252, nature)
  let ev = 252
  while (ev > 0 && maximum <= statValue(pokemon, member, stat, ev - 4, nature)) ev -= 4
  return ev
}

function natureFor(plus: NonHpBattleStat, minus: NonHpBattleStat) {
  return (
    natureNames.find((nature) => {
      const modifiers = natureModifiers(nature)
      return modifiers?.increased === battleToTeamName[plus] && modifiers.decreased === battleToTeamName[minus]
    }) ?? 'serious'
  )
}

function allocateSpread(
  pokemon: TeamPokemon,
  member: TeamMember,
  profile: MoveProfile,
  role: Role,
): Omit<EstimatedSpread, 'role'> {
  const evs = Object.fromEntries(battleStats.map((stat) => [stat, 0])) as Record<BattleStat, number>
  const [primary, initialSecondary] = roleStats[role]
  let plus = primary
  if (role === 'fastBulkySupport') profile.ultrafast = 0
  if (plus === 'spe' && profile.ultrafast) {
    if (['atk', 'spa'].includes(initialSecondary)) plus = initialSecondary as NonHpBattleStat
    else if (profile.physical >= 3) plus = 'atk'
    else plus = pokemon.stats[4] > pokemon.stats[2] ? 'spd' : 'def'
  }

  let total = 0
  evs[primary] = usefulMaximum(pokemon, member, primary, plus === primary ? 1.1 : 1)
  total += evs[primary]
  let secondary: BattleStat = initialSecondary
  if (secondary === 'hp' && member.level < 20) secondary = 'spd'
  evs[secondary] = usefulMaximum(pokemon, member, secondary, plus === secondary ? 1.1 : 1)
  total += evs[secondary]

  const moveEvs = (from: BattleStat, to: BattleStat, minimum: number) => {
    const missing = Math.max(0, minimum - evs[to])
    if (!missing) return
    const available = Math.min(missing, Math.max(0, 508 - total))
    evs[to] += available
    total += available
    const remaining = missing - available
    if (remaining && evs[from] > 128) {
      evs[from] -= remaining
      evs[to] += remaining
    }
  }
  const pokemonId = id(pokemon.name)
  const speedMinimums: Record<string, number> = {
    tentacruel: 16,
    skarmory: 24,
    jirachi: 32,
    celebi: 36,
    volcarona: 52,
    gliscor: 72,
  }
  if (speedMinimums[pokemonId]) {
    const donor = (['def', 'spd', 'hp', 'atk', 'spa'] as const).find((stat) => evs[stat] > 128) ?? 'hp'
    moveEvs(donor, 'spe', speedMinimums[pokemonId])
  }
  if (pokemonId === 'dragonite' && evs.hp && evs.spe > 220) {
    total -= evs.spe - 220
    evs.spe = 220
  }

  let rockWeakness = 0
  if (!['magicguard', 'mountaineer'].includes(id(member.ability))) {
    for (const type of pokemon.types) {
      if (['fire', 'flying', 'bug', 'ice'].includes(type)) rockWeakness += 1
      else if (['ground', 'steel', 'fighting'].includes(type)) rockWeakness -= 1
    }
  }
  const adjustHp = () => {
    const item = id(member.item)
    let divisor = 0
    let shouldDivide = false
    const hpAt = (ev: number) => statValue(pokemon, member, 'hp', ev)
    if (['leftovers', 'blacksludge'].includes(item) && has(profile, 'substitute') && hpAt(evs.hp) !== 404) divisor = 4
    else if (['leftovers', 'blacksludge'].includes(item)) divisor = 0
    else if (has(profile, 'bellydrum') && item.endsWith('berry')) {
      divisor = 2
      shouldDivide = true
    } else if (has(profile, 'substitute') && item.endsWith('berry')) {
      divisor = 4
      shouldDivide = true
    } else if (rockWeakness >= 2 || has(profile, 'bellydrum')) divisor = 2
    else if (rockWeakness >= 1 || has(profile, 'substitute', 'transform')) divisor = 4
    else if (id(member.ability) !== 'magicguard') divisor = 8
    if (!divisor) return
    const acceptable = (ev: number) => (hpAt(ev) % divisor === 0) === shouldDivide
    while (evs.hp < 252 && total < 508 && !acceptable(evs.hp)) {
      evs.hp += 4
      total += 4
    }
    while (evs.hp > 0 && !acceptable(evs.hp)) {
      evs.hp -= 4
      total -= 4
    }
    while (evs.hp > 0 && hpAt(evs.hp) === hpAt(evs.hp - 4)) {
      evs.hp -= 4
      total -= 4
    }
  }
  adjustHp()

  let hpAttempted = false
  while (total < 508) {
    let next: BattleStat | null = null
    if (!evs.atk && profile.physicalAttacks >= 1) next = 'atk'
    else if (!evs.spa && profile.specialAttacks >= 1) next = 'spa'
    else if (!evs.hp && pokemon.stats[0] > 1 && !hpAttempted) next = 'hp'
    else if (!evs.spd && pokemon.stats[0] > 1) next = 'spd'
    else if (!evs.def && pokemon.stats[0] > 1) next = 'def'
    else if (!evs.spe) next = 'spe'
    if (!next) break
    let amount = Math.min(508 - total, 252)
    const target = statValue(pokemon, member, next, amount)
    while (amount > 0 && target === statValue(pokemon, member, next, amount - 4)) amount -= 4
    evs[next] = amount
    total += amount
    if (next === 'hp') {
      hpAttempted = true
      adjustHp()
    }
    if (!amount && next !== 'hp') break
  }

  let minus: NonHpBattleStat | null
  if (has(profile, 'gyroball', 'trickroom')) minus = 'spe'
  else if (!profile.physicalAttacks) minus = 'atk'
  else if (profile.specialAttacks < 1 && !evs.spa)
    minus = profile.specialAttacks < profile.physicalAttacks ? 'spa' : !evs.atk ? 'atk' : null
  else if (profile.physicalAttacks < 1 && !evs.atk) minus = 'atk'
  else if (pokemon.stats[2] > pokemon.stats[5] && pokemon.stats[4] > pokemon.stats[5] && !evs.spe) minus = 'spe'
  else if (plus === 'def' || plus === 'spd') minus = evs.atk && !evs.spe ? 'spe' : 'atk'
  else minus = pokemon.stats[2] > pokemon.stats[4] ? 'spd' : 'def'
  if (!minus || plus === minus) minus = plus === 'spe' ? 'spd' : 'spe'

  return {
    evs: battleStats.map((stat) => evs[stat]) as Stats,
    nature: natureFor(plus, minus),
    plusStat: plus,
    minusStat: minus,
  }
}

export function estimateSpread(
  pokemon: TeamPokemon,
  member: TeamMember,
  moves: EstimatedMove[],
): EstimatedSpread | null {
  if (!hasEnoughMoves(pokemon.name, member.moves) || moves.length !== member.moves.filter(Boolean).length) return null
  const profile = profileMoves(pokemon, member, moves)
  const role = selectRole(pokemon, member, profile)
  return { role, ...allocateSpread(pokemon, member, profile, role) }
}

export const estimatedRoleKey = (role: Role) => `teams.estimatedRole.${role}` as const
