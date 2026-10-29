import facts from '../data/third-party/battle-mechanics-facts.json'
import type {
  BattleEvent,
  BattleField,
  BattleMove,
  BattlePokemon,
  BattleResource,
  BattleSide,
  BattleStages,
  BattleStatus,
} from './battle'
import { calculatedCoreStats, type Stats, type TeamPokemon, type PokemonGender } from './teams'
import { BATTLE_TYPES, getDamageMultiplier, type BattleType } from './type-chart'

export type AbilityMemory = {
  suppressed?: boolean
  pendingStart?: boolean
  originalAbility?: BattleResource
  originalPokemon?: TeamPokemon
  originalMoves?: BattlePokemon['moves']
  originalStats?: Stats
  types?: BattleType[]
  entered?: boolean
  activeTurns?: number
  truant?: boolean
  unburden?: boolean
  charged?: boolean
  slowStart?: number
  perish?: number
  disguiseBroken?: boolean
  iceFaceBroken?: boolean
  lastWeather?: string | null
  faintedNotified?: boolean
  battleBondUsed?: boolean
  proteanUsed?: boolean
  syrupUsed?: boolean
  transformed?: boolean
  switchedIn?: boolean
  moved?: boolean
  lastConsumed?: BattleResource
  berry?: BattleResource
  cudChew?: number
  harvestedThisTurn?: boolean
  itemBlocked?: boolean
  berryBlocked?: boolean
  illusion?: TeamPokemon
  illusionGender?: PokemonGender
  illusionShiny?: boolean
  gulp?: 'fish' | 'pikachu'
  boostStat?: keyof BattleStages
  boosterConsumed?: boolean
  fallen?: number
}
export const abilityMemory = (p: BattlePokemon): AbilityMemory => (p.abilityMemory ??= {})
export const abilityName = (p: BattlePokemon) => (p.abilityMemory?.suppressed ? '' : p.ability.name)
const id = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]/g, '')
type MoveFacts = {
  flags: string[]
  recoil?: number[] | null
  crash?: boolean | null
  selfdestruct?: string | boolean | null
  secondary: boolean
}
const moveFacts: Readonly<Record<string, MoveFacts>> = facts.moves
const speciesFacts: Readonly<Record<string, { weight?: number; name?: string; types?: string[]; stats?: number[] }>> =
  facts.pokemon
const abilityFlags: Readonly<Record<string, Readonly<Record<string, number | undefined>>>> = facts.abilityFlags
export const moveHasFlag = (move: BattleMove, flag: string) => moveFacts[id(move.name)]?.flags.includes(flag) ?? false
export const moveHasSecondary = (move: BattleMove) =>
  moveFacts[id(move.name)]?.secondary || !!(move.ailmentChance || move.flinchChance || move.statChance)
export const moveMakesContact = (move: BattleMove, user: BattlePokemon) =>
  moveHasFlag(move, 'contact') &&
  abilityName(user) !== 'long-reach' &&
  (user.abilityMemory?.itemBlocked || user.item?.name !== 'protective-pads')
export const abilityTypes = (p: BattlePokemon): string[] =>
  p.terastallized && p.member.tera !== 'stellar' ? [p.member.tera] : (p.abilityMemory?.types ?? p.pokemon.types)
export const abilityGrounded = (p: BattlePokemon) =>
  p.volatile['smack-down'] || p.volatile.ingrain || (!p.abilityMemory?.itemBlocked && p.item?.name === 'iron-ball')
    ? true
    : !p.volatile['magnet-rise'] &&
      !p.volatile.telekinesis &&
      !abilityTypes(p).includes('flying') &&
      !['levitate', 'eelevate'].includes(abilityName(p)) &&
      (p.abilityMemory?.itemBlocked || p.item?.name !== 'air-balloon')
export const abilityBypassed = (user: BattlePokemon, target: BattlePokemon, move?: BattleMove) =>
  target.item?.name !== 'ability-shield' &&
  !!abilityFlags[abilityName(target)]?.breakable &&
  (['mold-breaker', 'teravolt', 'turboblaze'].includes(abilityName(user)) ||
    (abilityName(user) === 'mycelium-might' && move?.damageClass === 'status') ||
    ['sunsteel-strike', 'moongeist-beam', 'photon-geyser'].includes(move?.name ?? ''))
export const effectiveWeather = (field: BattleField) => (field.weatherSuppressed ? null : field.weather)
export function revealAbility(p: BattlePokemon, events: BattleEvent[]) {
  if (abilityName(p)) events.push({ type: 'ability', pokemon: battlePokemonName(p), ability: abilityName(p) })
}
export function abilityHeal(p: BattlePokemon, amount: number, events: BattleEvent[]) {
  if (p.hp <= 0 || p.volatile['heal-block']) return
  const healed = Math.max(0, Math.min(p.maxHp - p.hp, Math.floor(amount)))
  if (!healed) return
  p.hp += healed
  events.push({ type: 'heal', pokemon: battlePokemonName(p), amount: healed, percentage: (healed / p.maxHp) * 100 })
}
export function abilityDamage(p: BattlePokemon, amount: number, events: BattleEvent[], indirect = true) {
  if (p.hp <= 0 || (indirect && abilityName(p) === 'magic-guard')) return 0
  const applied = Math.max(0, Math.min(p.hp, Math.floor(amount)))
  p.hp -= applied
  if (applied)
    events.push({
      type: 'damage',
      pokemon: battlePokemonName(p),
      amount: applied,
      effectiveness: 1,
      critical: false,
      percentage: (applied / p.maxHp) * 100,
    })
  return applied
}
export function abilityStage(
  p: BattlePokemon,
  stat: keyof BattleStages,
  change: number,
  events: BattleEvent[],
  source: BattlePokemon = p,
  reflected = false,
  move?: BattleMove,
): number {
  if (p.hp <= 0) return 0
  const a = abilityBypassed(source, p, move) ? '' : abilityName(p)
  const enemy = source !== p
  if (enemy && change < 0) {
    if (
      p.item?.name === 'clear-amulet' ||
      ['clear-body', 'white-smoke', 'full-metal-body'].includes(a) ||
      (a === 'flower-veil' && abilityTypes(p).includes('grass')) ||
      (stat === 'attack' && a === 'hyper-cutter') ||
      (stat === 'defense' && a === 'big-pecks') ||
      (stat === 'accuracy' && ['keen-eye', 'illuminate', 'minds-eye'].includes(a))
    )
      return 0
    if (a === 'mirror-armor' && !reflected) return abilityStage(source, stat, change, events, p, true, move)
  }
  if (a === 'contrary') change *= -1
  if (a === 'simple') change *= 2
  const previous = p.stages[stat]
  p.stages[stat] = Math.max(-6, Math.min(6, previous + change))
  const applied = p.stages[stat] - previous
  if (applied) events.push({ type: 'stage', pokemon: battlePokemonName(p), stat, change: applied })
  if (applied < 0 && enemy) {
    if (a === 'defiant') abilityStage(p, 'attack', 2, events)
    if (a === 'competitive') abilityStage(p, 'specialAttack', 2, events)
  }
  return applied
}
export function abilityStatus(
  p: BattlePokemon,
  status: Exclude<BattleStatus, null>,
  source: BattlePokemon,
  field: BattleField,
  events: BattleEvent[],
  reflected = false,
  move?: BattleMove,
) {
  if (p.hp <= 0 || p.status) return false
  const a = abilityBypassed(source, p, move) ? '' : abilityName(p)
  const types = abilityTypes(p)
  if (
    ['comatose', 'purifying-salt'].includes(a) ||
    (a === 'shields-down' && !p.pokemon.name.includes('core')) ||
    (a === 'leaf-guard' && effectiveWeather(field) === 'sun') ||
    (a === 'flower-veil' && types.includes('grass'))
  )
    return false
  if (abilityGrounded(p) && (field.terrain === 'misty' || (field.terrain === 'electric' && status === 'sleep')))
    return false
  if (status === 'burn' && (types.includes('fire') || ['water-veil', 'water-bubble', 'thermal-exchange'].includes(a)))
    return false
  if (status === 'paralysis' && (types.includes('electric') || a === 'limber')) return false
  if (status === 'freeze' && (types.includes('ice') || a === 'magma-armor')) return false
  if (status === 'sleep' && ['insomnia', 'vital-spirit', 'sweet-veil'].includes(a)) return false
  if (
    ['poison', 'badly-poisoned'].includes(status) &&
    (['immunity', 'pastel-veil'].includes(a) ||
      (abilityName(source) !== 'corrosion' && (types.includes('poison') || types.includes('steel'))))
  )
    return false
  p.status = status
  p.toxicTurns = 0
  if (status === 'sleep') p.sleepTurns = 2
  events.push({ type: 'status', pokemon: battlePokemonName(p), status })
  if (
    !reflected &&
    source !== p &&
    a === 'synchronize' &&
    ['burn', 'paralysis', 'poison', 'badly-poisoned'].includes(status)
  )
    abilityStatus(source, status, p, field, events, true)
  if (
    source !== p &&
    abilityName(source) === 'poison-puppeteer' &&
    id(source.pokemon.species) === 'pecharunt' &&
    !!move &&
    ['poison', 'badly-poisoned'].includes(status) &&
    a !== 'own-tempo' &&
    !p.confusionTurns
  ) {
    p.confusionTurns = 3
    events.push({ type: 'status', pokemon: battlePokemonName(p), status: 'confusion' })
  }
  return true
}
export function abilityCure(p: BattlePokemon, events: BattleEvent[]) {
  if (!p.status) return
  events.push({ type: 'statusCured', pokemon: battlePokemonName(p), status: p.status })
  p.status = null
  p.sleepTurns = 0
  p.toxicTurns = 0
}
function changeAbility(
  p: BattlePokemon,
  source: BattlePokemon,
  events: BattleEvent[],
  replacement = abilityName(source),
  mode: 'copy' | 'swap' | 'replace' = 'replace',
) {
  const targetFlags = abilityFlags[p.ability.name] ?? {}
  const sourceFlags = abilityFlags[replacement] ?? {}
  if (
    mode === 'copy'
      ? sourceFlags.notrace
      : mode === 'swap'
        ? targetFlags.failskillswap || sourceFlags.failskillswap
        : targetFlags.cantsuppress
  )
    return false
  abilityMemory(p).originalAbility ??= p.ability
  p.ability = { ...source.ability, name: replacement }
  abilityMemory(p).suppressed = false
  revealAbility(p, events)
  return true
}
function changeTypes(p: BattlePokemon, types: BattleType[]) {
  if (p.terastallized || ['multitype', 'rks-system'].includes(abilityName(p))) return
  abilityMemory(p).types = types
}
function changeForm(p: BattlePokemon, form: string, events: BattleEvent[], changeHp = false) {
  if (id(p.pokemon.name) === id(form)) return
  const aliases: Readonly<Record<string, string>> = {
    aegislashshield: 'aegislash',
    wishiwashisolo: 'wishiwashi',
    miniorcore: 'minior',
    eiscueice: 'eiscue',
    darmanitanstandard: 'darmanitan',
    darmanitangalarstandard: 'darmanitangalar',
    morpekofullbelly: 'morpeko',
  }
  const data = speciesFacts[aliases[id(form)] ?? id(form)]
  if (
    !data?.stats ||
    data.stats.length !== 6 ||
    data.stats.some((value) => !Number.isFinite(value) || value <= 0) ||
    !data.types
  )
    return
  const memory = abilityMemory(p)
  memory.originalPokemon ??= p.pokemon
  memory.originalStats ??= p.stats
  const spriteIds: Readonly<Record<string, string>> = {
    aegislashshield: 'aegislash',
    wishiwashisolo: 'wishiwashi',
    miniorcore: 'minior',
    miniormeteor: 'minior-meteor',
    eiscueice: 'eiscue',
    darmanitanstandard: 'darmanitan',
    darmanitangalarstandard: 'darmanitan-galar',
    darmanitangalarzen: 'darmanitan-galarzen',
    morpekofullbelly: 'morpeko',
  }
  const spriteId = spriteIds[id(form)] ?? form
  // The Showdown CDN uses stable species names for form sprites; home images stay as fallbacks.
  const showdown = (variant: string) => `https://play.pokemonshowdown.com/sprites/${variant}/${spriteId}.gif`
  p.pokemon = {
    ...p.pokemon,
    name: form,
    stats: data.stats as Stats,
    types: data.types,
    showdownFrontSprite: showdown('ani'),
    showdownBackSprite: showdown('ani-back'),
    showdownFrontShinySprite: showdown('ani-shiny'),
    showdownBackShinySprite: showdown('ani-back-shiny'),
  }
  p.stats = calculatedCoreStats(p.pokemon, p.member)
  if (changeHp) {
    const difference = p.stats[0] - p.maxHp
    p.maxHp = p.stats[0]
    p.hp = Math.max(1, p.hp + difference)
  }
  if (!p.terastallized) memory.types = data.types as BattleType[]
  revealAbility(p, events)
}
const plateTypes: Readonly<Record<string, BattleType>> = {
  flame: 'fire',
  splash: 'water',
  zap: 'electric',
  meadow: 'grass',
  icicle: 'ice',
  fist: 'fighting',
  toxic: 'poison',
  earth: 'ground',
  sky: 'flying',
  mind: 'psychic',
  insect: 'bug',
  stone: 'rock',
  spooky: 'ghost',
  draco: 'dragon',
  dread: 'dark',
  iron: 'steel',
  pixie: 'fairy',
}
export function updateAbilityForm(p: BattlePokemon, field: BattleField, events: BattleEvent[]) {
  if (p.hp <= 0) return
  const a = abilityName(p)
  const species = id(p.pokemon.species)
  const weather = effectiveWeather(field)
  if (a === 'forecast' && species === 'castform')
    changeForm(
      p,
      weather === 'sun'
        ? 'castform-sunny'
        : weather === 'rain'
          ? 'castform-rainy'
          : weather === 'snow'
            ? 'castform-snowy'
            : 'castform',
      events,
    )
  if (a === 'flower-gift' && species === 'cherrim')
    changeForm(p, weather === 'sun' ? 'cherrim-sunshine' : 'cherrim', events)
  if (a === 'mimicry') {
    const type = ({ electric: 'electric', grassy: 'grass', misty: 'fairy', psychic: 'psychic' } as const)[
      field.terrain ?? 'electric'
    ]
    if (field.terrain) changeTypes(p, [type])
    else delete abilityMemory(p).types
  }
  if (a === 'multitype' && species === 'arceus')
    abilityMemory(p).types = [plateTypes[p.item?.name.replace('-plate', '') ?? ''] ?? 'normal']
  if (a === 'rks-system' && species === 'silvally') {
    const heldType = p.item?.name.endsWith('-memory') ? p.item.name.replace('-memory', '') : 'normal'
    abilityMemory(p).types = [BATTLE_TYPES.find((type) => type === heldType) ?? 'normal']
  }
  if (a === 'schooling' && species === 'wishiwashi' && p.member.level >= 20)
    changeForm(p, p.hp > p.maxHp / 4 ? 'wishiwashi-school' : 'wishiwashi-solo', events)
  if (a === 'shields-down' && species === 'minior')
    changeForm(p, p.hp > p.maxHp / 2 ? 'minior-meteor' : 'minior-core', events)
  if (
    a === 'ice-face' &&
    species === 'eiscue' &&
    weather === 'snow' &&
    abilityMemory(p).iceFaceBroken &&
    abilityMemory(p).lastWeather !== 'snow'
  ) {
    abilityMemory(p).iceFaceBroken = false
    changeForm(p, 'eiscue-ice', events)
  }
  if (a === 'ice-face') abilityMemory(p).lastWeather = weather
}
export function synchronizeAbilities(own: BattleSide, foe: BattleSide, field: BattleField, events: BattleEvent[]) {
  const active = [own.roster[own.active], foe.roster[foe.active]]
  const gas = active.some((p) => p.hp > 0 && p.ability.name === 'neutralizing-gas')
  for (const p of active) {
    const wasSuppressed = p.abilityMemory?.suppressed === true
    abilityMemory(p).suppressed =
      p.abilitySuppressed ||
      (gas &&
        p.ability.name !== 'neutralizing-gas' &&
        !abilityFlags[p.ability.name]?.cantsuppress &&
        p.item?.name !== 'ability-shield')
    if (wasSuppressed && !p.abilityMemory?.suppressed && p.hp > 0) abilityMemory(p).pendingStart = true
    if (p.abilityMemory?.suppressed) delete abilityMemory(p).pendingStart
  }
  for (const p of active) {
    abilityMemory(p).itemBlocked = abilityName(p) === 'klutz'
    abilityMemory(p).berryBlocked = active.some(
      (t) => t !== p && t.hp > 0 && ['unnerve', 'as-one-glastrier', 'as-one-spectrier'].includes(abilityName(t)),
    )
  }
  field.weatherSuppressed = active.some((p) => p.hp > 0 && ['air-lock', 'cloud-nine'].includes(abilityName(p)))
  const primal = active.find(
    (p) => p.hp > 0 && ['primordial-sea', 'desolate-land', 'delta-stream'].includes(abilityName(p)),
  )
  if (field.primalWeather && primal && !active.some((p) => p.hp > 0 && abilityName(p) === field.primalWeather)) {
    const remaining = abilityName(primal)
    field.primalWeather =
      remaining === 'primordial-sea'
        ? 'primordial-sea'
        : remaining === 'desolate-land'
          ? 'desolate-land'
          : 'delta-stream'
    field.weather = remaining === 'primordial-sea' ? 'rain' : remaining === 'desolate-land' ? 'sun' : null
    field.weatherTurns = 0
    if (field.weather) events.push({ type: 'fieldSet', field: field.weather, turns: 0 })
  }
  if (field.primalWeather && !primal) {
    if (field.weather) events.push({ type: 'fieldEnded', field: field.weather })
    field.weather = null
    field.weatherTurns = 0
    delete field.primalWeather
  }
  active.forEach((p) => {
    const a = abilityName(p),
      memory = abilityMemory(p)
    if (
      p.item?.name === 'booster-energy' &&
      ['protosynthesis', 'quark-drive'].includes(a) &&
      !(a === 'protosynthesis' ? effectiveWeather(field) === 'sun' : field.terrain === 'electric')
    ) {
      memory.boosterConsumed = true
      const highest = p.stats.slice(1).reduce((best, value, i, values) => (value > values[best] ? i : best), 0)
      memory.boostStat = (['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const)[highest]
      events.push({ type: 'itemActivated', pokemon: battlePokemonName(p), item: 'booster-energy', consumed: true })
      p.item = null
      memory.unburden = true
    }
    updateAbilityForm(p, field, events)
  })
}
/** Tera Shift changes the entering species before entry-hazard HP calculations. */
export function abilityBeforeEntry(p: BattlePokemon, events: BattleEvent[]) {
  if (abilityName(p) === 'tera-shift' && id(p.pokemon.species) === 'terapagos') {
    changeForm(p, 'terapagos-terastal', events, true)
    p.ability = { ...p.ability, name: 'tera-shell' }
  }
}
export function abilityEntry(
  own: BattleSide,
  foe: BattleSide,
  field: BattleField,
  events: BattleEvent[],
  side: 'player' | 'opponent' = 'player',
  resuming = false,
) {
  const p = own.roster[own.active],
    target = foe.roster[foe.active]
  abilityBeforeEntry(p, events)
  synchronizeAbilities(own, foe, field, events)
  const memory = abilityMemory(p),
    a = abilityName(p)
  if (!resuming) {
    memory.switchedIn = true
    memory.activeTurns = 0
    memory.proteanUsed = false
  }
  memory.slowStart = a === 'slow-start' ? 5 : 0
  memory.truant = false
  if (
    a === 'trace' &&
    !abilityFlags[abilityName(target)]?.notrace &&
    changeAbility(p, target, events, abilityName(target), 'copy')
  )
    return abilityEntry(own, foe, field, events, side)
  if (a === 'supreme-overlord')
    memory.fallen = Math.min(own.totalFainted ?? own.roster.filter((t) => t.hp === 0).length, 5)
  if (a === 'embody-aspect' && p.terastallized) abilityTera(p, field, events)
  if (a === 'wind-rider' && own.conditions.tailwind > 0) abilityStage(p, 'attack', 1, events)
  if (a === 'download') abilityStage(p, target.stats[2] < target.stats[4] ? 'attack' : 'specialAttack', 1, events)
  if (a === 'screen-cleaner')
    for (const s of [own, foe])
      for (const condition of ['reflect', 'lightScreen', 'auroraVeil'] as const) {
        if (s.conditions[condition])
          events.push({
            type: 'sideConditionEnded',
            side: s === own ? side : side === 'player' ? 'opponent' : 'player',
            condition,
          })
        s.conditions[condition] = 0
      }
  if (a === 'supersweet-syrup' && !memory.syrupUsed) {
    memory.syrupUsed = true
    abilityStage(target, 'evasion', -1, events, p)
  }
  if (
    a === 'imposter' &&
    !target.substituteHp &&
    !abilityMemory(target).transformed &&
    abilityName(target) !== 'illusion'
  ) {
    memory.originalPokemon = p.pokemon
    memory.originalStats = p.stats
    memory.originalMoves = p.moves
    memory.originalAbility = p.ability
    p.pokemon = { ...target.pokemon }
    p.stats = [p.stats[0], ...calculatedCoreStats(target.pokemon, target.member).slice(1)] as Stats
    p.stages = { ...target.stages }
    p.moves = target.moves.map((m) => ({ data: { ...m.data, statChanges: [...m.data.statChanges] }, pp: 5 }))
    p.ability = { ...target.ability }
    memory.transformed = true
    abilityEntry(own, foe, field, events, side)
  }
  if (a === 'illusion') {
    const last = [...own.roster].reverse().find((candidate) => candidate.hp > 0)
    if (last && last !== p) {
      memory.illusion = last.pokemon
      memory.illusionGender = last.member.gender
      memory.illusionShiny = last.member.shiny
    }
  }
  if (a === 'frisk' && target.item) {
    target.member.itemActive = true
    events.push({ type: 'itemActivated', pokemon: battlePokemonName(target), item: target.item.name, consumed: false })
  }
  if (
    a === 'anticipation' &&
    target.moves.some(
      (m) =>
        m.data.damageClass !== 'status' &&
        (abilityTypes(p).reduce((n, t) => n * getDamageMultiplier(m.data.type, t as BattleType), 1) > 1 ||
          ['fissure', 'guillotine', 'horn-drill', 'sheer-cold'].includes(m.data.name)),
    )
  )
    revealAbility(p, events)
  if (a === 'forewarn') {
    const forewarnPower = (m: BattleMove) =>
      ['fissure', 'guillotine', 'horn-drill', 'sheer-cold'].includes(m.name)
        ? 150
        : ['counter', 'mirror-coat', 'metal-burst'].includes(m.name)
          ? 120
          : m.damageClass !== 'status' && (!m.power || m.power === 1)
            ? 80
            : (m.power ?? 0)
    const strongest = target.moves.reduce((best, m) => (forewarnPower(m.data) > forewarnPower(best.data) ? m : best))
    if (!target.revealedMoves.includes(strongest.data.name)) target.revealedMoves.push(strongest.data.name)
    revealAbility(p, events)
  }
  if (['primordial-sea', 'desolate-land', 'delta-stream'].includes(a)) {
    field.primalWeather = a as BattleField['primalWeather']
    field.weather = a === 'primordial-sea' ? 'rain' : a === 'desolate-land' ? 'sun' : null
    field.weatherTurns = 0
    revealAbility(p, events)
    if (field.weather) events.push({ type: 'fieldSet', field: field.weather, turns: 0 })
  }
  const immune = {
    burn: ['water-veil', 'water-bubble', 'thermal-exchange'],
    freeze: ['magma-armor'],
    paralysis: ['limber'],
    poison: ['immunity', 'pastel-veil'],
    'badly-poisoned': ['immunity', 'pastel-veil'],
    sleep: ['insomnia', 'vital-spirit', 'sweet-veil'],
  } as const
  if (p.status && (immune[p.status] as readonly string[]).includes(a)) abilityCure(p, events)
  if (a === 'own-tempo') p.confusionTurns = 0
  if (a === 'oblivious') {
    p.attracted = false
    p.tauntTurns = 0
  }
  updateAbilityForm(p, field, events)
}
export function abilityExit(p: BattlePokemon, events: BattleEvent[]) {
  const a = abilityName(p),
    memory = abilityMemory(p)
  if (a === 'stance-change' && id(p.pokemon.species) === 'aegislash') changeForm(p, 'aegislash-shield', events)
  if (a === 'hunger-switch' && id(p.pokemon.species) === 'morpeko') changeForm(p, 'morpeko-full-belly', events)
  if (a === 'natural-cure') abilityCure(p, events)
  if (a === 'regenerator') abilityHeal(p, p.maxHp / 3, events)
  if (a === 'zero-to-hero' && p.hp > 0 && id(p.pokemon.species) === 'palafin') changeForm(p, 'palafin-hero', events)
  if (memory.originalAbility) p.ability = memory.originalAbility
  if (memory.transformed && memory.originalPokemon && memory.originalStats && memory.originalMoves) {
    p.pokemon = memory.originalPokemon
    p.stats = memory.originalStats
    p.moves = memory.originalMoves
  }
  const persistent = {
    entered: memory.entered,
    syrupUsed: memory.syrupUsed,
    battleBondUsed: memory.battleBondUsed,
    disguiseBroken: memory.disguiseBroken,
    iceFaceBroken: memory.iceFaceBroken,
    berry: memory.berry,
    lastConsumed: memory.lastConsumed,
    boosterConsumed: memory.boosterConsumed,
    boostStat: memory.boosterConsumed ? memory.boostStat : undefined,
  }
  p.abilityMemory = persistent
}
export function abilityStatMultiplier(p: BattlePokemon, index: number, field?: BattleField, foe?: BattlePokemon) {
  const bypassed = foe && abilityBypassed(foe, p)
  const a = bypassed ? '' : abilityName(p),
    memory = p.abilityMemory ?? {}
  let multiplier = bypassed && abilityName(p) === 'marvel-scale' && p.status && index === 2 ? 1 / 1.5 : 1
  const core = p.originalStats[index]
  if (index > 0 && p.stats[index] > 0 && !memory.originalStats) {
    const original = p.member.ability
    const oldMultiplier =
      index === 1 && ['huge-power', 'pure-power'].includes(original)
        ? 2
        : index === 1 && ['hustle', 'gorilla-tactics'].includes(original)
          ? 1.5
          : index === 2 && original === 'fur-coat'
            ? 2
            : 1
    if (core > 0) multiplier /= oldMultiplier
  }
  if (index === 1 && ['huge-power', 'pure-power'].includes(a)) multiplier *= 2
  if (index === 1 && ['hustle', 'gorilla-tactics'].includes(a)) multiplier *= 1.5
  if (index === 2 && a === 'fur-coat') multiplier *= 2
  if (a === 'defeatist' && p.hp <= p.maxHp / 2 && [1, 3].includes(index)) multiplier *= 0.5
  if (a === 'slow-start' && (memory.slowStart ?? 5) > 0 && [1, 5].includes(index)) multiplier *= 0.5
  if (a === 'unburden' && memory.unburden && index === 5) multiplier *= 2
  if (field) {
    const weather = effectiveWeather(field)
    if (a === 'solar-power' && weather === 'sun' && index === 3) multiplier *= 1.5
    if (a === 'orichalcum-pulse' && weather === 'sun' && index === 1) multiplier *= 4 / 3
    if (a === 'hadron-engine' && field.terrain === 'electric' && index === 3) multiplier *= 4 / 3
    if (a === 'flower-gift' && id(p.pokemon.species) === 'cherrim' && weather === 'sun' && [1, 4].includes(index))
      multiplier *= 1.5
    if (a === 'grass-pelt' && field.terrain === 'grassy' && index === 2) multiplier *= 1.5
    if (
      ['protosynthesis', 'quark-drive'].includes(a) &&
      (memory.boosterConsumed || (a === 'protosynthesis' ? weather === 'sun' : field.terrain === 'electric'))
    ) {
      const highest =
        memory.boostStat ??
        (['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const)[
          p.stats.slice(1).reduce((best, value, i, values) => (value > values[best] ? i : best), 0)
        ]
      if (index === ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'].indexOf(highest))
        multiplier *= highest === 'speed' ? 1.5 : 1.3
    }
  }
  if (foe) {
    const ruin = ({ 'tablets-of-ruin': 1, 'vessel-of-ruin': 3, 'sword-of-ruin': 2, 'beads-of-ruin': 4 } as const)[
      abilityName(foe)
    ]
    if (ruin === index && a !== abilityName(foe)) multiplier *= 0.75
  }
  return multiplier
}
export function abilityMovePriority(p: BattlePokemon, move: BattleMove) {
  const a = abilityName(p)
  return (
    move.priority +
    (a === 'prankster' && move.damageClass === 'status' ? 1 : 0) +
    (a === 'gale-wings' && move.type === 'flying' && p.hp === p.maxHp ? 1 : 0) +
    (a === 'triage' && (move.healing > 0 || move.drain > 0 || moveHasFlag(move, 'heal')) ? 3 : 0)
  )
}
export function abilityMoveOrder(p: BattlePokemon, move: BattleMove, random: () => number) {
  const a = abilityName(p)
  if (a === 'stall' || (a === 'mycelium-might' && move.damageClass === 'status')) return -1
  if (a === 'quick-draw' && move.damageClass !== 'status' && random() < 0.3) return 1
  return 0
}
export function abilityAccuracy(move: BattleMove, user: BattlePokemon, target: BattlePokemon, field: BattleField) {
  const a = abilityName(user),
    d = abilityBypassed(user, target, move) ? '' : abilityName(target)
  if (a === 'no-guard' || d === 'no-guard') return { always: true, modifier: 1, ignoreEvasion: false }
  if (['fissure', 'guillotine', 'horn-drill', 'sheer-cold'].includes(move.name))
    return { always: false, modifier: 1, ignoreEvasion: true }
  const weather = a === 'mega-sol' ? 'sun' : effectiveWeather(field)
  if (
    (['thunder', 'hurricane'].includes(move.name) && weather === 'rain') ||
    (move.name === 'blizzard' && weather === 'snow')
  )
    return { always: true, modifier: 1, ignoreEvasion: true }
  let modifier = a === 'compound-eyes' ? 1.3 : a === 'victory-star' ? 1.1 : 1
  if (a === 'hustle' && move.damageClass === 'physical') modifier *= 0.8
  if (d === 'tangled-feet' && target.confusionTurns > 0) modifier *= 0.5
  if (d === 'wonder-skin' && move.damageClass === 'status' && move.accuracy !== null && move.accuracy > 50)
    modifier *= 50 / move.accuracy
  if (weather === 'sun' && ['thunder', 'hurricane'].includes(move.name) && move.accuracy) modifier *= 50 / move.accuracy
  return { always: false, modifier, ignoreEvasion: ['keen-eye', 'illuminate', 'minds-eye', 'unaware'].includes(a) }
}
const typeConverters: Readonly<Record<string, BattleType>> = {
  refrigerate: 'ice',
  pixilate: 'fairy',
  aerilate: 'flying',
  galvanize: 'electric',
  dragonize: 'dragon',
}
export function abilityModifyMove(
  p: BattlePokemon,
  target: BattlePokemon,
  move: BattleMove,
  field: BattleField,
  events: BattleEvent[],
) {
  const a = abilityName(p),
    d = abilityBypassed(p, target, move) ? '' : abilityName(target)
  let power = 1
  if (move.name !== 'struggle') {
    if (
      move.type === 'normal' &&
      typeConverters[a] &&
      ![
        'judgment',
        'multi-attack',
        'natural-gift',
        'revelation-dance',
        'techno-blast',
        'terrain-pulse',
        'weather-ball',
      ].includes(move.name) &&
      !(move.name === 'tera-blast' && p.terastallized)
    ) {
      move.type = typeConverters[a]
      power *= 1.2
    }
    if (a === 'normalize') {
      move.type = 'normal'
      power *= 1.2
    }
    if (a === 'liquid-voice' && moveHasFlag(move, 'sound')) move.type = 'water'
  }
  if (
    ['protean', 'libero'].includes(a) &&
    !p.terastallized &&
    !abilityMemory(p).proteanUsed &&
    move.name !== 'struggle'
  ) {
    changeTypes(p, [move.type])
    abilityMemory(p).proteanUsed = true
  }
  if (a === 'stance-change' && id(p.pokemon.species) === 'aegislash') {
    if (move.damageClass !== 'status') changeForm(p, 'aegislash-blade', events)
    else if (move.name === 'kings-shield') changeForm(p, 'aegislash-shield', events)
  }
  if (a === 'stench' && move.damageClass !== 'status' && !move.flinchChance && move.ailment !== 'flinch')
    move.flinchChance = 10
  if (a === 'serene-grace') {
    move.ailmentChance *= 2
    if (move.flinchChance) move.flinchChance *= 2
    if (move.statChance !== null && move.statChance !== undefined) move.statChance *= 2
    if (move.effectChance !== null) move.effectChance *= 2
  }
  if (a === 'sheer-force' && move.damageClass !== 'status' && moveHasSecondary(move)) power *= 1.3
  if (
    (d === 'shield-dust' && move.damageClass !== 'status') ||
    (a === 'sheer-force' && move.damageClass !== 'status' && moveHasSecondary(move)) ||
    (target.item?.name === 'covert-cloak' && move.damageClass !== 'status')
  ) {
    move.ailment = null
    move.ailmentChance = 0
    move.flinchChance = 0
    move.statChanges = move.statChanges.filter(
      (c) =>
        c.target === 'user' ||
        (c.change < 0 && ['close-combat', 'overheat', 'draco-meteor', 'leaf-storm', 'superpower'].includes(move.name)),
    )
  }
  if (a === 'infiltrator' || moveHasFlag(move, 'sound')) move.bypassesSubstitute = true
  if (d === 'inner-focus') {
    move.flinchChance = 0
    if (move.ailment === 'flinch') move.ailment = null
  }
  if (
    a === 'mega-sol' &&
    ['growth', 'solar-beam', 'solar-blade', 'synthesis', 'morning-sun', 'moonlight', 'weather-ball'].includes(move.name)
  ) {
    if (move.name === 'weather-ball') {
      move.type = 'fire'
      move.power = 100
    }
    if (['synthesis', 'morning-sun', 'moonlight'].includes(move.name)) move.healing = 200 / 3
    if (move.name === 'growth') move.statChanges = move.statChanges.map((c) => ({ ...c, change: 2 }))
  }
  if (a === 'gulp-missile' && ['surf', 'dive'].includes(move.name) && id(p.pokemon.species) === 'cramorant') {
    abilityMemory(p).gulp = p.hp > p.maxHp / 2 ? 'fish' : 'pikachu'
    changeForm(p, p.hp > p.maxHp / 2 ? 'cramorant-gulping' : 'cramorant-gorging', events)
  }
  void field
  return power
}
export function abilityBlocksMove(
  user: BattlePokemon,
  target: BattlePokemon,
  move: BattleMove,
  field: BattleField,
  events: BattleEvent[],
) {
  const a = abilityName(user),
    d = abilityBypassed(user, target, move) ? '' : abilityName(target)
  const hostile = !['user', 'users-field', 'user-and-allies', 'all-allies'].includes(move.target)
  if (!hostile) return false
  const blocked =
    (d === 'aroma-veil' && ['attract', 'disable', 'encore', 'heal-block', 'taunt', 'torment'].includes(move.name)) ||
    (d === 'oblivious' && ['taunt', 'captivate', 'attract'].includes(move.name)) ||
    (d === 'good-as-gold' && move.damageClass === 'status') ||
    (d === 'soundproof' && moveHasFlag(move, 'sound')) ||
    (d === 'bulletproof' && moveHasFlag(move, 'bullet')) ||
    (d === 'overcoat' && moveHasFlag(move, 'powder')) ||
    (['armor-tail', 'queenly-majesty', 'dazzling'].includes(d) && abilityMovePriority(user, move) > 0) ||
    (a === 'prankster' && move.damageClass === 'status' && abilityTypes(target).includes('dark')) ||
    (d === 'wind-rider' && moveHasFlag(move, 'wind'))
  if (d === 'wind-rider' && moveHasFlag(move, 'wind')) abilityStage(target, 'attack', 1, events)
  if (blocked) revealAbility(target, events)
  if (
    field.primalWeather &&
    !field.weatherSuppressed &&
    move.damageClass !== 'status' &&
    ((field.primalWeather === 'primordial-sea' && move.type === 'fire') ||
      (field.primalWeather === 'desolate-land' && move.type === 'water'))
  )
    return true
  if ([a, d].includes('damp') && ['explosion', 'self-destruct', 'misty-explosion', 'mind-blown'].includes(move.name))
    return true
  return blocked
}
export function abilityPowerMultiplier(
  user: BattlePokemon,
  target: BattlePokemon,
  move: BattleMove,
  field: BattleField,
  effectiveness: number,
  critical: boolean,
  own: BattleSide | undefined,
) {
  const a = abilityName(user),
    d = abilityBypassed(user, target, move) ? '' : abilityName(target)
  const contact = moveMakesContact(move, user)
  let n = 1
  const typed: Readonly<Record<string, [BattleType, number]>> = {
    overgrow: ['grass', 1.5],
    blaze: ['fire', 1.5],
    torrent: ['water', 1.5],
    swarm: ['bug', 1.5],
    steelworker: ['steel', 1.5],
    'steely-spirit': ['steel', 1.5],
    transistor: ['electric', 1.3],
    'dragons-maw': ['dragon', 1.5],
    'rocky-payload': ['rock', 1.5],
    'fire-mane': ['fire', 1.5],
  }
  const boost = typed[a]
  if (
    boost &&
    move.type === boost[0] &&
    (!['overgrow', 'blaze', 'torrent', 'swarm'].includes(a) || user.hp <= user.maxHp / 3)
  )
    n *= boost[1]
  if (a === 'technician' && (move.power ?? 0) <= 60) n *= 1.5
  if (a === 'iron-fist' && moveHasFlag(move, 'punch')) n *= 1.2
  if (a === 'strong-jaw' && moveHasFlag(move, 'bite')) n *= 1.5
  if (a === 'mega-launcher' && moveHasFlag(move, 'pulse')) n *= 1.5
  if (a === 'tough-claws' && contact) n *= 1.3
  if (a === 'sharpness' && moveHasFlag(move, 'slicing')) n *= 1.5
  if (a === 'reckless' && (move.drain < 0 || moveFacts[id(move.name)]?.recoil || moveFacts[id(move.name)]?.crash))
    n *= 1.2
  if (a === 'rivalry' && user.member.gender !== 'none' && target.member.gender !== 'none')
    n *= user.member.gender === target.member.gender ? 1.25 : 0.75
  if (a === 'analytic' && abilityMemory(target).moved) n *= 1.3
  if (a === 'stakeout' && abilityMemory(target).switchedIn) n *= 2
  if (a === 'tinted-lens' && effectiveness < 1) n *= 2
  if (a === 'sniper' && critical) n *= 1.5
  if (a === 'neuroforce' && effectiveness > 1) n *= 1.25
  if (a === 'water-bubble' && move.type === 'water') n *= 2
  if (a === 'punk-rock' && moveHasFlag(move, 'sound')) n *= 1.3
  if (a === 'sand-force' && effectiveWeather(field) === 'sandstorm' && ['rock', 'ground', 'steel'].includes(move.type))
    n *= 1.3
  if (a === 'supreme-overlord' && own)
    n *= 1 + (abilityMemory(user).fallen ?? Math.min(5, own.roster.filter((p) => p !== user && p.hp === 0).length)) / 10
  if (abilityMemory(user).charged && move.type === 'electric') n *= 2
  if (['filter', 'solid-rock', 'prism-armor'].includes(d) && effectiveness > 1) n *= 0.75
  if (['multiscale', 'shadow-shield'].includes(d) && target.hp === target.maxHp) n *= 0.5
  if (d === 'thick-fat' && ['fire', 'ice'].includes(move.type)) n *= 0.5
  if (['heatproof', 'water-bubble'].includes(d) && move.type === 'fire') n *= 0.5
  if (d === 'dry-skin' && move.type === 'fire') n *= 1.25
  if (d === 'fluffy') n *= (contact ? 0.5 : 1) * (move.type === 'fire' ? 2 : 1)
  if (d === 'aura-guard' && contact) n *= 0.5
  if (d === 'ice-scales' && move.damageClass === 'special') n *= 0.5
  if (d === 'punk-rock' && moveHasFlag(move, 'sound')) n *= 0.5
  if (d === 'purifying-salt' && move.type === 'ghost') n *= 0.5
  const aura = move.type === 'dark' ? 'dark-aura' : move.type === 'fairy' ? 'fairy-aura' : ''
  if (aura && [a, d].includes(aura)) n *= [a, d].includes('aura-break') ? 0.75 : 4 / 3
  return n
}
export function abilityAbsorbsHit(target: BattlePokemon, user: BattlePokemon, move: BattleMove, events: BattleEvent[]) {
  const a = abilityBypassed(user, target, move) ? '' : abilityName(target),
    m = abilityMemory(target)
  if (target.substituteHp > 0 && !move.bypassesSubstitute) return false
  if (a === 'disguise' && id(target.pokemon.species) === 'mimikyu' && !m.disguiseBroken) {
    m.disguiseBroken = true
    changeForm(target, 'mimikyu-busted', events)
    abilityDamage(target, target.maxHp / 8, events, false)
    revealAbility(target, events)
    return true
  }
  if (
    a === 'ice-face' &&
    id(target.pokemon.species) === 'eiscue' &&
    !m.iceFaceBroken &&
    move.damageClass === 'physical'
  ) {
    m.iceFaceBroken = true
    changeForm(target, 'eiscue-noice', events)
    revealAbility(target, events)
    return true
  }
  return false
}
export function abilityAfterHit(
  target: BattlePokemon,
  user: BattlePokemon,
  move: BattleMove,
  damage: number,
  beforeHp: number,
  critical: boolean,
  field: BattleField,
  own: BattleSide | undefined,
  foe: BattleSide,
  random: () => number,
  events: BattleEvent[],
) {
  if (!damage) return
  const a = abilityBypassed(user, target, move) ? '' : abilityName(target),
    u = abilityName(user)
  const contact = moveMakesContact(move, user),
    m = abilityMemory(target)
  delete m.illusion
  if (target.hp > 0) {
    if (a === 'color-change') changeTypes(target, [move.type])
    if (a === 'stamina') abilityStage(target, 'defense', 1, events)
    if (a === 'water-compaction' && move.type === 'water') abilityStage(target, 'defense', 2, events)
    if (a === 'steam-engine' && ['water', 'fire'].includes(move.type)) abilityStage(target, 'speed', 6, events)
    if (a === 'thermal-exchange' && move.type === 'fire') abilityStage(target, 'attack', 1, events)
    if (a === 'justified' && move.type === 'dark') abilityStage(target, 'attack', 1, events)
    if (a === 'rattled' && ['bug', 'ghost', 'dark'].includes(move.type)) abilityStage(target, 'speed', 1, events)
    if (a === 'weak-armor' && move.damageClass === 'physical') {
      abilityStage(target, 'defense', -1, events)
      abilityStage(target, 'speed', 2, events)
    }
    if (a === 'anger-point' && critical) abilityStage(target, 'attack', 12, events)
    if (a === 'cotton-down') abilityStage(user, 'speed', -1, events, target)
    if (a === 'sand-spit' && !field.primalWeather) {
      field.weather = 'sandstorm'
      field.weatherTurns = 5
      events.push({ type: 'fieldSet', field: 'sandstorm', turns: 5 })
    }
    if (a === 'seed-sower') {
      field.terrain = 'grassy'
      field.terrainTurns = 5
      events.push({ type: 'fieldSet', field: 'grassy', turns: 5 })
    }
    if (a === 'electromorphosis' || (a === 'wind-power' && moveHasFlag(move, 'wind'))) m.charged = true
    if (a === 'toxic-debris' && move.damageClass === 'physical' && own)
      own.hazards.toxicSpikes = Math.min(2, own.hazards.toxicSpikes + 1)
  }
  if (contact) {
    if (['gooey', 'tangling-hair'].includes(a)) abilityStage(user, 'speed', -1, events, target)
    if (['mummy', 'lingering-aroma'].includes(a)) changeAbility(user, target, events)
    if (a === 'wandering-spirit' && !abilityFlags[u]?.failskillswap) {
      const old = target.ability
      if (changeAbility(target, user, events, u, 'swap'))
        changeAbility(user, { ...target, ability: old }, events, a, 'swap')
    }
    const status = ({ static: 'paralysis', 'poison-point': 'poison', 'flame-body': 'burn' } as const)[a]
    if (status && random() < 0.3) abilityStatus(user, status, target, field, events)
    if (
      a === 'effect-spore' &&
      !abilityTypes(user).includes('grass') &&
      abilityName(user) !== 'overcoat' &&
      user.item?.name !== 'safety-goggles' &&
      random() < 0.3
    )
      abilityStatus(user, (['sleep', 'paralysis', 'poison'] as const)[Math.floor(random() * 3)], target, field, events)
    if (
      a === 'cute-charm' &&
      random() < 0.3 &&
      user.member.gender !== 'none' &&
      target.member.gender !== 'none' &&
      user.member.gender !== target.member.gender &&
      !['oblivious', 'aroma-veil'].includes(abilityName(user)) &&
      !user.attracted
    ) {
      user.attracted = true
      events.push({ type: 'status', pokemon: battlePokemonName(user), status: 'attraction' })
    }
    if (a === 'perish-body' && !m.perish && abilityName(user) !== 'soundproof') {
      m.perish = 4
      abilityMemory(user).perish = 4
    }
    if (target.hp > 0 && a === 'pickpocket' && !target.item && user.item && abilityName(user) !== 'sticky-hold') {
      target.item = user.item
      user.item = null
      abilityMemory(user).unburden = true
    }
  }
  if (a === 'cursed-body' && user.lastMoveIndex !== null && !user.volatile.disable && random() < 0.3) {
    user.disabledMoveIndex = user.lastMoveIndex
    user.volatile.disable = 4
  }
  if (a === 'gulp-missile' && m.gulp) {
    abilityDamage(user, user.maxHp / 4, events)
    if (m.gulp === 'fish') abilityStage(user, 'defense', -1, events, target)
    else abilityStatus(user, 'paralysis', target, field, events)
    delete m.gulp
    changeForm(target, 'cramorant', events)
  }
  if (a === 'spicy-spray') abilityStatus(user, 'burn', target, field, events)
  if (contact && ['rough-skin', 'iron-barbs'].includes(a)) abilityDamage(user, Math.max(1, user.maxHp / 8), events)
  if (contact && a === 'aftermath' && target.hp === 0 && u !== 'damp') abilityDamage(user, user.maxHp / 4, events)
  if (a === 'innards-out' && target.hp === 0) abilityDamage(user, beforeHp, events)
  if (u === 'poison-touch' && contact && a !== 'shield-dust' && target.item?.name !== 'covert-cloak' && random() < 0.3)
    abilityStatus(target, 'poison', user, field, events)
  if (u === 'toxic-chain' && a !== 'shield-dust' && target.item?.name !== 'covert-cloak' && random() < 0.3)
    abilityStatus(target, 'badly-poisoned', user, field, events)
  if (u === 'magician' && !user.item && target.item && a !== 'sticky-hold') {
    user.item = target.item
    target.item = null
    m.unburden = true
  }
  if (target.hp === 0 && user.hp > 0) {
    if (['moxie', 'chilling-neigh', 'as-one-glastrier'].includes(u)) abilityStage(user, 'attack', 1, events)
    if (['grim-neigh', 'as-one-spectrier'].includes(u)) abilityStage(user, 'specialAttack', 1, events)
    if (['beast-boost', 'eelevate'].includes(u)) {
      const highest = user.stats.slice(1).reduce((best, value, i, values) => (value > values[best] ? i : best), 0)
      abilityStage(
        user,
        (['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const)[highest],
        1,
        events,
      )
    }
    if (
      u === 'battle-bond' &&
      id(user.pokemon.species) === 'greninja' &&
      !abilityMemory(user).transformed &&
      foe.roster.some((p) => p !== target && p.hp > 0) &&
      !abilityMemory(user).battleBondUsed
    ) {
      abilityMemory(user).battleBondUsed = true
      for (const stat of ['attack', 'specialAttack', 'speed'] as const) abilityStage(user, stat, 1, events)
    }
  }
  void foe
}
export function abilityAfterMove(
  p: BattlePokemon,
  target: BattlePokemon,
  move: BattleMove,
  beforeHp: number,
  own: BattleSide,
  foe: BattleSide,
  events: BattleEvent[],
) {
  const a = abilityName(target)
  if (target.hp > 0 && beforeHp > target.maxHp / 2 && target.hp <= target.maxHp / 2 && target.hp < beforeHp) {
    if (a === 'berserk') abilityStage(target, 'specialAttack', 1, events)
    if (a === 'anger-shell')
      for (const stat of ['attack', 'specialAttack', 'speed', 'defense', 'specialDefense'] as const)
        abilityStage(target, stat, ['defense', 'specialDefense'].includes(stat) ? -1 : 1, events)
    if (
      ['wimp-out', 'emergency-exit'].includes(a) &&
      foe.roster.some((candidate) => candidate !== target && candidate.hp > 0)
    )
      foe.switchRequested = true
  }
  if (move.type === 'electric') abilityMemory(p).charged = false
  abilityMemory(p).moved = true
  if (abilityName(p) === 'gorilla-tactics' && p.lastMoveIndex !== null) p.gorillaMoveIndex ??= p.lastMoveIndex
  void own
}
export function abilityResidual(
  own: BattleSide,
  foe: BattleSide,
  field: BattleField,
  random: () => number,
  events: BattleEvent[],
) {
  const p = own.roster[own.active],
    target = foe.roster[foe.active]
  if (p.hp <= 0) return
  const a = abilityName(p),
    memory = abilityMemory(p)
  if (a === 'speed-boost' && (memory.activeTurns ?? 0) > 0) abilityStage(p, 'speed', 1, events)
  if (a === 'moody') {
    const stats = ['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const
    const up = stats.filter((s) => p.stages[s] < 6)
    const chosen = up[Math.floor(random() * up.length)]
    if (chosen) abilityStage(p, chosen, 2, events)
    const down = stats.filter((s) => s !== chosen && p.stages[s] > -6)
    const lowered = down[Math.floor(random() * down.length)]
    if (lowered) abilityStage(p, lowered, -1, events)
  }
  if (a === 'bad-dreams' && (target.status === 'sleep' || abilityName(target) === 'comatose'))
    abilityDamage(target, target.maxHp / 8, events)
  if (a === 'harvest' && !p.item && memory.berry && (effectiveWeather(field) === 'sun' || random() < 0.5)) {
    p.item = memory.berry
    memory.harvestedThisTurn = true
    revealAbility(p, events)
  }
  if (a === 'pickup' && !p.item && abilityMemory(target).lastConsumed && !abilityMemory(target).harvestedThisTurn) {
    p.item = abilityMemory(target).lastConsumed ?? null
    delete abilityMemory(target).lastConsumed
    revealAbility(p, events)
  }
  if (a === 'cud-chew' && memory.cudChew && --memory.cudChew === 0 && memory.berry) {
    abilityEatBerry(p, memory.berry, events)
    delete memory.cudChew
  }
  if (a === 'zen-mode' && id(p.pokemon.species) === 'darmanitan') {
    const galar = p.pokemon.name.includes('galar')
    changeForm(
      p,
      galar
        ? p.hp <= p.maxHp / 2
          ? 'darmanitan-galar-zen'
          : 'darmanitan-galar-standard'
        : p.hp <= p.maxHp / 2
          ? 'darmanitan-zen'
          : 'darmanitan-standard',
      events,
    )
  }
  if (a === 'power-construct' && id(p.pokemon.species) === 'zygarde' && p.hp <= p.maxHp / 2)
    changeForm(p, 'zygarde-complete', events, true)
  if (a === 'hunger-switch' && id(p.pokemon.species) === 'morpeko' && !p.terastallized)
    changeForm(p, p.pokemon.name.includes('hangry') ? 'morpeko-full-belly' : 'morpeko-hangry', events)
  if (memory.perish && --memory.perish === 0) abilityDamage(p, p.hp, events, false)
  if (memory.slowStart) memory.slowStart--
  memory.activeTurns = (memory.activeTurns ?? 0) + 1
  memory.switchedIn = false
  updateAbilityForm(p, field, events)
}
export function abilityEatBerry(p: BattlePokemon, berry: BattleResource, events: BattleEvent[]) {
  const a = abilityName(p),
    factor = a === 'ripen' ? 2 : 1
  if (berry.name === 'sitrus-berry') abilityHeal(p, (p.maxHp / 4) * factor, events)
  if (berry.name === 'oran-berry') abilityHeal(p, 10 * factor, events)
  if (['figy-berry', 'wiki-berry', 'mago-berry', 'aguav-berry', 'iapapa-berry'].includes(berry.name))
    abilityHeal(p, (p.maxHp / 3) * factor, events)
  if (['lum-berry', 'cheri-berry', 'chesto-berry', 'pecha-berry', 'rawst-berry', 'aspear-berry'].includes(berry.name))
    abilityCure(p, events)
  const stat = (
    {
      'liechi-berry': 'attack',
      'ganlon-berry': 'defense',
      'petaya-berry': 'specialAttack',
      'apicot-berry': 'specialDefense',
      'salac-berry': 'speed',
    } as const
  )[berry.name]
  if (stat) abilityStage(p, stat, factor, events)
  if (a === 'cheek-pouch') abilityHeal(p, p.maxHp / 3, events)
}
export function abilityConsumedItem(p: BattlePokemon, item: BattleResource, events: BattleEvent[]) {
  const memory = abilityMemory(p)
  memory.unburden = true
  memory.lastConsumed = item
  if (item.name.endsWith('-berry')) {
    memory.berry = item
    if (abilityName(p) === 'cheek-pouch') abilityHeal(p, p.maxHp / 3, events)
    if (abilityName(p) === 'cud-chew') memory.cudChew = 2
  }
}
export function abilityTraps(p: BattlePokemon, foe: BattlePokemon) {
  if (abilityTypes(p).includes('ghost') || p.item?.name === 'shed-shell') return false
  const a = abilityName(foe)
  return (
    (a === 'shadow-tag' && abilityName(p) !== 'shadow-tag') ||
    (a === 'arena-trap' && abilityGrounded(p)) ||
    (a === 'magnet-pull' && abilityTypes(p).includes('steel'))
  )
}
export function abilityWeight(p: BattlePokemon) {
  const weight = speciesFacts[id(p.pokemon.name)]?.weight ?? 100
  return weight * (abilityName(p) === 'heavy-metal' ? 2 : abilityName(p) === 'light-metal' ? 0.5 : 1)
}
export function abilityTera(p: BattlePokemon, field: BattleField, events: BattleEvent[]) {
  if (id(p.pokemon.species) === 'ogerpon') p.ability = { ...p.ability, name: 'embody-aspect' }
  if (abilityName(p) === 'embody-aspect') {
    const stat = p.pokemon.name.includes('wellspring')
      ? 'specialDefense'
      : p.pokemon.name.includes('hearthflame')
        ? 'attack'
        : p.pokemon.name.includes('cornerstone')
          ? 'defense'
          : 'speed'
    abilityStage(p, stat, 1, events)
  }
  if (id(p.pokemon.species) === 'terapagos' && p.member.tera === 'stellar') {
    changeForm(p, 'terapagos-stellar', events, true)
    p.ability = { ...p.ability, name: 'teraform-zero' }
  }
  if (abilityName(p) === 'teraform-zero') {
    if (field.weather) events.push({ type: 'fieldEnded', field: field.weather })
    if (field.terrain) events.push({ type: 'fieldEnded', field: field.terrain })
    field.weather = null
    field.weatherTurns = 0
    field.terrain = null
    field.terrainTurns = 0
    delete field.primalWeather
  }
}
export function abilitySpecialMove(
  user: BattlePokemon,
  target: BattlePokemon,
  move: BattleMove,
  events: BattleEvent[],
) {
  const flags = abilityFlags[abilityName(target)] ?? {}
  if (move.name === 'skill-swap') {
    const old = user.ability
    if (flags.failskillswap || abilityFlags[abilityName(user)]?.failskillswap) return false
    changeAbility(user, target, events, abilityName(target), 'swap')
    return changeAbility(target, { ...user, ability: old }, events, old.name, 'swap')
  }
  if (move.name === 'role-play' && abilityFlags[abilityName(target)]?.failroleplay) return false
  if (move.name === 'role-play') return changeAbility(user, target, events, abilityName(target), 'copy')
  if (move.name === 'entrainment' && (flags.noentrain || abilityFlags[abilityName(user)]?.noentrain)) return false
  if (move.name === 'entrainment') return changeAbility(target, user, events)
  if (['worry-seed', 'simple-beam'].includes(move.name))
    return changeAbility(target, user, events, move.name === 'worry-seed' ? 'insomnia' : 'simple')
  if (['gastro-acid', 'core-enforcer'].includes(move.name)) {
    if (flags.cantsuppress || target.item?.name === 'ability-shield') return false
    abilityMemory(target).suppressed = true
    target.abilitySuppressed = true
    return true
  }
  return null
}

/** Observe boosts after a single action, without feeding copied boosts back into the observer. */
export function abilityObserveBoosts(p: BattlePokemon, target: BattlePokemon, events: BattleEvent[], start: number) {
  if (abilityName(p) !== 'opportunist' || p.hp <= 0) return
  for (const event of events.slice(start)) {
    if (event.type === 'stage' && event.pokemon === battlePokemonName(target) && event.change > 0)
      abilityStage(p, event.stat, event.change, events)
  }
}
export function abilityNotifyFaint(p: BattlePokemon, target: BattlePokemon, events: BattleEvent[]) {
  if (p.hp > 0 || abilityMemory(p).faintedNotified) return
  abilityMemory(p).faintedNotified = true
  if (abilityName(target) === 'soul-heart' && target.hp > 0) abilityStage(target, 'specialAttack', 1, events)
}

export function visibleBattlePokemon(p: BattlePokemon, opponent: boolean): BattlePokemon {
  const illusion = opponent && abilityName(p) === 'illusion' ? p.abilityMemory?.illusion : undefined
  return illusion
    ? {
        ...p,
        pokemon: illusion,
        member: {
          ...p.member,
          gender: p.abilityMemory?.illusionGender ?? p.member.gender,
          shiny: p.abilityMemory?.illusionShiny ?? p.member.shiny,
        },
        abilityMemory: { ...p.abilityMemory, types: undefined },
      }
    : p
}

export const heldBattleItem = (p: BattlePokemon) => (abilityName(p) === 'klutz' ? undefined : p.item?.name)
export const battlePokemonName = (p: BattlePokemon) => visibleBattlePokemon(p, true).pokemon.name
