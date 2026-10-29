import { describe, expect, it } from 'vitest'
import {
  battleHitProbability,
  battleMoveEffectiveness,
  battleSameTypeAttackBonus,
  createBattlePokemon,
  createBattleState,
  currentBattleStats,
  legalBattleMoveIndexes,
  resolveBattleTurn,
  type BattleEvent,
  type BattleField,
  type BattleMove,
  type BattlePokemon,
} from './battle'
import {
  abilityAbsorbsHit,
  abilityAccuracy,
  abilityAfterHit,
  abilityBlocksMove,
  abilityBypassed,
  abilityConsumedItem,
  abilityEatBerry,
  abilityEntry,
  abilityExit,
  abilityGrounded,
  abilityMemory,
  abilityModifyMove,
  abilityMoveOrder,
  abilityMovePriority,
  abilityName,
  abilityPowerMultiplier,
  abilityResidual,
  abilitySpecialMove,
  abilityStage,
  abilityStatMultiplier,
  abilityStatus,
  abilityTera,
  abilityTraps,
  abilityTypes,
  abilityWeight,
  effectiveWeather,
  moveHasFlag,
  moveMakesContact,
  synchronizeAbilities,
  updateAbilityForm,
  visibleBattlePokemon,
} from './battle-abilities'
import type { Team, TeamMember, TeamPokemon } from './teams'
import type { BattleType } from './type-chart'

const move = (overrides: Partial<BattleMove> = {}): BattleMove => ({
  name: 'tackle',
  type: 'normal',
  damageClass: 'physical',
  power: 40,
  accuracy: 100,
  priority: 0,
  pp: 20,
  target: 'selected-pokemon',
  healing: 0,
  drain: 0,
  ailment: null,
  ailmentChance: 0,
  effectChance: null,
  statChanges: [],
  ...overrides,
})
const resource = (name: string) => ({ name, names: [], descriptions: [], sprite: null })
function pokemon(ability = 'run-away', name = 'test-pokemon', types: BattleType[] = ['normal']): BattlePokemon {
  const member: TeamMember = {
    id: name,
    pokemon: name,
    level: 100,
    shiny: false,
    gender: 'male',
    tera: 'normal',
    ability,
    nature: 'hardy',
    item: '',
    moves: ['tackle', 'swords-dance', 'recover', 'toxic'],
    evs: [0, 0, 0, 0, 0, 0],
    ivs: [31, 31, 31, 31, 31, 31],
    abilityActive: false,
    itemActive: false,
  }
  const data: TeamPokemon = {
    id: 1,
    name,
    species: name,
    stats: [100, 100, 100, 100, 100, 100],
    types,
    abilities: [ability],
    moves: member.moves,
  }
  return createBattlePokemon(member, data, [
    move(),
    move({
      name: 'swords-dance',
      damageClass: 'status',
      power: null,
      target: 'user',
      statChanges: [{ stat: 'attack', change: 2 }],
    }),
    move({ name: 'recover', damageClass: 'status', power: null, target: 'user', healing: 50 }),
    move({ name: 'toxic', damageClass: 'status', power: null, ailment: 'poison', ailmentChance: 100 }),
  ])
}
function setup(a = 'run-away', d = 'run-away') {
  const left = Array.from({ length: 6 }, (_, i) => pokemon(i ? 'run-away' : a, `left-${i}`))
  const right = Array.from({ length: 6 }, (_, i) => pokemon(i ? 'run-away' : d, `right-${i}`))
  const team = (name: string, roster: BattlePokemon[]): Team => ({
    id: name,
    name,
    competitiveFormat: 'singles-6v6',
    members: roster.map((p) => p.member),
  })
  return createBattleState(team('left', left), left, team('right', right), right)
}
const field = (): BattleField => ({ weather: null, weatherTurns: 0, terrain: null, terrainTurns: 0, trickRoomTurns: 0 })
const events = (): BattleEvent[] => []
const hit = (defenderAbility: string, attackerAbility = 'run-away', attack = move(), roll = 0) => {
  const s = setup(attackerAbility, defenderAbility)
  const user = s.player.roster[0],
    target = s.opponent.roster[0]
  target.hp -= 50
  const before = target.hp
  abilityAfterHit(target, user, attack, 50, before + 50, false, s.field, s.player, s.opponent, () => roll, events())
  return { s, user, target }
}

describe('current Showdown ability rules', () => {
  it.each([
    ['overgrow', 'grass', 1.5],
    ['blaze', 'fire', 1.5],
    ['torrent', 'water', 1.5],
    ['swarm', 'bug', 1.5],
    ['steelworker', 'steel', 1.5],
    ['steely-spirit', 'steel', 1.5],
    ['transistor', 'electric', 1.3],
    ['dragons-maw', 'dragon', 1.5],
    ['rocky-payload', 'rock', 1.5],
    ['fire-mane', 'fire', 1.5],
    ['water-bubble', 'water', 2],
    ['sand-force', 'rock', 1.3],
  ] as const)('%s boosts the documented move type', (ability, type, multiplier) => {
    const p = pokemon(ability),
      target = pokemon()
    p.hp = Math.floor(p.maxHp / 3)
    const f = { ...field(), weather: 'sandstorm' as const }
    expect(abilityPowerMultiplier(p, target, move({ type }), f, 1, false, undefined)).toBeCloseTo(multiplier)
    expect(abilityPowerMultiplier(p, target, move({ type: 'psychic' }), f, 1, false, undefined)).toBe(1)
  })
  it.each([
    ['iron-fist', 'mach-punch', 1.2],
    ['strong-jaw', 'crunch', 1.5],
    ['mega-launcher', 'aura-sphere', 1.5],
    ['tough-claws', 'tackle', 1.3],
    ['sharpness', 'leaf-blade', 1.5],
    ['punk-rock', 'boomburst', 1.3],
    ['reckless', 'double-edge', 1.2],
  ] as const)('%s uses upstream move properties', (ability, name, multiplier) => {
    expect(
      abilityPowerMultiplier(pokemon(ability), pokemon(), move({ name }), field(), 1, false, undefined),
    ).toBeCloseTo(multiplier)
  })
  it.each([
    ['thick-fat', 'fire', 'physical', 0.5],
    ['thick-fat', 'ice', 'special', 0.5],
    ['heatproof', 'fire', 'special', 0.5],
    ['water-bubble', 'fire', 'physical', 0.5],
    ['dry-skin', 'fire', 'special', 1.25],
    ['ice-scales', 'normal', 'special', 0.5],
    ['fluffy', 'normal', 'physical', 0.5],
    ['fluffy', 'fire', 'physical', 1],
    ['aura-guard', 'normal', 'physical', 0.5],
    ['purifying-salt', 'ghost', 'special', 0.5],
  ] as const)('%s modifies received %s %s damage', (ability, type, damageClass, multiplier) => {
    expect(
      abilityPowerMultiplier(pokemon(), pokemon(ability), move({ type, damageClass }), field(), 1, false, undefined),
    ).toBeCloseTo(multiplier)
  })
  it.each(['filter', 'solid-rock', 'prism-armor'])('%s only reduces super-effective damage', (ability) => {
    const p = pokemon(),
      target = pokemon(ability)
    expect(abilityPowerMultiplier(p, target, move(), field(), 2, false, undefined)).toBe(0.75)
    expect(abilityPowerMultiplier(p, target, move(), field(), 1, false, undefined)).toBe(1)
  })
  it.each(['multiscale', 'shadow-shield'])('%s only reduces damage at full HP', (ability) => {
    const p = pokemon(),
      target = pokemon(ability)
    expect(abilityPowerMultiplier(p, target, move(), field(), 1, false, undefined)).toBe(0.5)
    target.hp--
    expect(abilityPowerMultiplier(p, target, move(), field(), 1, false, undefined)).toBe(1)
  })
  it.each([
    ['refrigerate', 'ice'],
    ['pixilate', 'fairy'],
    ['aerilate', 'flying'],
    ['galvanize', 'electric'],
    ['dragonize', 'dragon'],
  ] as const)('%s converts Normal moves with the current 20 percent bonus', (a, type) => {
    const m = move(),
      p = pokemon(a)
    expect(abilityModifyMove(p, pokemon(), m, field(), events())).toBe(1.2)
    expect(m.type).toBe(type)
    const struggle = move({ name: 'struggle' })
    expect(abilityModifyMove(p, pokemon(), struggle, field(), events())).toBe(1)
    expect(struggle.type).toBe('normal')
  })
  it.each(['protean', 'libero'])('%s changes type once per entry and respects Terastallization', (a) => {
    const p = pokemon(a),
      log = events()
    abilityModifyMove(p, pokemon(), move({ type: 'fire' }), field(), log)
    expect(abilityTypes(p)).toEqual(['fire'])
    abilityModifyMove(p, pokemon(), move({ type: 'water' }), field(), log)
    expect(abilityTypes(p)).toEqual(['fire'])
    abilityExit(p, log)
    abilityModifyMove(p, pokemon(), move({ type: 'water' }), field(), log)
    expect(abilityTypes(p)).toEqual(['water'])
    p.terastallized = true
    p.member.tera = 'grass'
    abilityModifyMove(p, pokemon(), move({ type: 'fire' }), field(), log)
    expect(abilityTypes(p)).toEqual(['grass'])
  })
  it('applies Normalize and Liquid Voice to their respective move classes', () => {
    const normalized = move({ type: 'water' })
    expect(abilityModifyMove(pokemon('normalize'), pokemon(), normalized, field(), events())).toBe(1.2)
    expect(normalized.type).toBe('normal')
    const sound = move({ name: 'hyper-voice' }),
      contact = move()
    abilityModifyMove(pokemon('liquid-voice'), pokemon(), sound, field(), events())
    abilityModifyMove(pokemon('liquid-voice'), pokemon(), contact, field(), events())
    expect(sound.type).toBe('water')
    expect(contact.type).toBe('normal')
  })
  it.each(['clear-body', 'white-smoke', 'full-metal-body'])('%s prevents enemy drops, but allows self drops', (a) => {
    const p = pokemon(a)
    abilityStage(p, 'defense', -1, events(), pokemon())
    expect(p.stages.defense).toBe(0)
    abilityStage(p, 'defense', -1, events())
    expect(p.stages.defense).toBe(-1)
  })
  it.each([
    ['hyper-cutter', 'attack'],
    ['big-pecks', 'defense'],
    ['keen-eye', 'accuracy'],
    ['illuminate', 'accuracy'],
    ['minds-eye', 'accuracy'],
  ] as const)('%s prevents its specific stat drop', (a, stat) => {
    const p = pokemon(a)
    abilityStage(p, stat, -1, events(), pokemon())
    expect(p.stages[stat]).toBe(0)
    abilityStage(p, 'specialDefense', -1, events(), pokemon())
    expect(p.stages.specialDefense).toBe(-1)
  })
  it.each([
    ['simple', 2],
    ['contrary', -1],
  ] as const)('%s transforms stage changes and clamps them', (a, expected) => {
    const p = pokemon(a)
    abilityStage(p, 'speed', 1, events())
    expect(p.stages.speed).toBe(expected)
    abilityStage(p, 'speed', 20, events())
    expect(Math.abs(p.stages.speed)).toBe(6)
  })
  it.each([
    ['defiant', 'attack'],
    ['competitive', 'specialAttack'],
  ] as const)('%s reacts only to an enemy lowering stats', (a, stat) => {
    const p = pokemon(a)
    abilityStage(p, 'defense', -1, events())
    expect(p.stages[stat]).toBe(0)
    abilityStage(p, 'defense', -1, events(), pokemon())
    expect(p.stages[stat]).toBe(2)
  })
  it('reflects drops with Mirror Armor without recursive reflection', () => {
    const p = pokemon('mirror-armor'),
      source = pokemon('mirror-armor')
    abilityStage(p, 'speed', -1, events(), source)
    expect(p.stages.speed).toBe(0)
    expect(source.stages.speed).toBe(-1)
  })
  it.each([
    ['static', 'paralysis'],
    ['poison-point', 'poison'],
    ['flame-body', 'burn'],
    ['spicy-spray', 'burn'],
  ] as const)('%s inflicts the documented status after a hit', (a, status) => {
    expect(hit(a).user.status).toBe(status)
    if (a !== 'spicy-spray') expect(hit(a, 'long-reach').user.status).toBeNull()
  })
  it('uses Effect Spore only against eligible contact attackers', () => {
    expect(hit('effect-spore').user.status).toBe('sleep')
    expect(hit('effect-spore', 'overcoat').user.status).toBeNull()
  })
  it.each([
    ['stamina', 'normal', 'defense', 1],
    ['water-compaction', 'water', 'defense', 2],
    ['steam-engine', 'fire', 'speed', 6],
    ['thermal-exchange', 'fire', 'attack', 1],
    ['justified', 'dark', 'attack', 1],
    ['rattled', 'ghost', 'speed', 1],
    ['weak-armor', 'normal', 'speed', 2],
  ] as const)('%s changes its stats when hit', (a, type, stat, expected) => {
    expect(hit(a, 'run-away', move({ type })).target.stages[stat]).toBe(expected)
  })
  it.each(['rough-skin', 'iron-barbs'])('%s damages a contact attacker by one eighth max HP', (a) => {
    const { user } = hit(a)
    expect(user.hp).toBe(user.maxHp - Math.floor(user.maxHp / 8))
    const avoided = hit(a, 'long-reach').user
    expect(avoided.hp).toBe(avoided.maxHp)
  })
  it.each(['gooey', 'tangling-hair', 'cotton-down'])('%s lowers the attacker’s Speed', (a) =>
    expect(hit(a).user.stages.speed).toBe(-1),
  )
  it('changes type after damage and only charges through the relevant hit', () => {
    expect(abilityTypes(hit('color-change', 'run-away', move({ type: 'water' })).target)).toEqual(['water'])
    expect(abilityMemory(hit('electromorphosis').target).charged).toBe(true)
    expect(abilityMemory(hit('wind-power', 'run-away', move({ name: 'hurricane' })).target).charged).toBe(true)
    expect(abilityMemory(hit('wind-power').target).charged).not.toBe(true)
  })
  it.each(['mummy', 'lingering-aroma'])('%s replaces the attacker’s ability until switching', (a) => {
    const { user } = hit(a)
    expect(abilityName(user)).toBe(a)
    abilityExit(user, events())
    expect(abilityName(user)).toBe('run-away')
  })
  it('swaps abilities through Wandering Spirit and excludes protected abilities', () => {
    const { user, target } = hit('wandering-spirit', 'speed-boost')
    expect(abilityName(user)).toBe('wandering-spirit')
    expect(abilityName(target)).toBe('speed-boost')
    expect(abilityName(hit('wandering-spirit', 'multitype').user)).toBe('multitype')
  })
  it.each(['poison-touch', 'toxic-chain'])('%s poisons through its successful attack', (a) => {
    const { target } = hit('run-away', a)
    expect(target.status).toBe(a === 'toxic-chain' ? 'badly-poisoned' : 'poison')
  })
  it('reflects status through Synchronize and confuses with Poison Puppeteer', () => {
    const p = pokemon('synchronize'),
      user = pokemon('poison-puppeteer', 'pecharunt')
    expect(abilityStatus(p, 'badly-poisoned', user, field(), events(), false, move({ name: 'toxic' }))).toBe(true)
    expect(user.status).toBe('badly-poisoned')
    expect(p.confusionTurns).toBeGreaterThan(0)
    const f = { ...field(), terrain: 'misty' as const }
    expect(abilityStatus(pokemon(), 'burn', user, f, events())).toBe(false)
  })
  it.each([
    ['soundproof', 'boomburst'],
    ['bulletproof', 'shadow-ball'],
    ['overcoat', 'spore'],
    ['aroma-veil', 'encore'],
    ['good-as-gold', 'toxic'],
    ['armor-tail', 'quick-attack'],
    ['queenly-majesty', 'quick-attack'],
    ['dazzling', 'quick-attack'],
    ['wind-rider', 'hurricane'],
  ] as const)('%s blocks %s', (a, name) => {
    const m = move({
      name,
      priority: name === 'quick-attack' ? 1 : 0,
      damageClass: ['encore', 'toxic', 'spore'].includes(name) ? 'status' : 'special',
    })
    const target = pokemon(a)
    expect(abilityBlocksMove(pokemon(), target, m, field(), events())).toBe(true)
    if (a === 'wind-rider') expect(target.stages.attack).toBe(1)
  })
  it('uses current accuracy rules, including No Guard and ignored evasion', () => {
    const p = pokemon('compound-eyes'),
      target = pokemon(),
      m = move({ accuracy: 70 })
    expect(battleHitProbability(m, p, target, field())).toBeCloseTo(0.91)
    p.ability.name = 'hustle'
    expect(battleHitProbability(m, p, target, field())).toBeCloseTo(0.56)
    p.ability.name = 'victory-star'
    expect(battleHitProbability(m, p, target, field())).toBeCloseTo(0.77)
    target.stages.evasion = 6
    p.ability.name = 'minds-eye'
    expect(battleHitProbability(m, p, target, field())).toBeCloseTo(0.7)
    target.ability.name = 'no-guard'
    expect(battleHitProbability(m, p, target, field())).toBe(1)
    target.ability.name = 'wonder-skin'
    p.ability.name = 'run-away'
    expect(abilityAccuracy(move({ damageClass: 'status' }), p, target, field()).modifier).toBe(0.5)
  })
  it.each(['scrappy', 'minds-eye'])('%s hits Ghosts with Normal and Fighting moves', (a) => {
    const p = pokemon(a),
      ghost = pokemon('run-away', 'ghost', ['ghost'])
    expect(battleMoveEffectiveness(move(), ghost, p)).toBe(1)
    expect(battleMoveEffectiveness(move({ type: 'fighting' }), ghost, p)).toBe(1)
  })
  it('uses Adaptability including matching Tera STAB', () => {
    const p = pokemon('adaptability')
    expect(battleSameTypeAttackBonus(p, 'normal')).toBe(2)
    p.terastallized = true
    expect(battleSameTypeAttackBonus(p, 'normal')).toBe(2.25)
  })
  it.each([
    ['prankster', 'status', 'normal', 1],
    ['triage', 'status', 'normal', 3],
    ['gale-wings', 'physical', 'flying', 1],
  ] as const)('%s adds its documented priority', (a, damageClass, type, expected) => {
    const p = pokemon(a),
      m = move({ damageClass, type, healing: a === 'triage' ? 50 : 0 })
    expect(abilityMovePriority(p, m)).toBe(expected)
    if (a === 'gale-wings') {
      p.hp--
      expect(abilityMovePriority(p, m)).toBe(0)
    }
  })
  it('keeps Stall and Mycelium Might within their priority bracket and rolls Quick Draw', () => {
    expect(abilityMoveOrder(pokemon('stall'), move(), () => 0)).toBe(-1)
    expect(abilityMoveOrder(pokemon('mycelium-might'), move({ damageClass: 'status' }), () => 0)).toBe(-1)
    expect(abilityMoveOrder(pokemon('mycelium-might'), move(), () => 0)).toBe(0)
    expect(abilityMoveOrder(pokemon('quick-draw'), move(), () => 0.2)).toBe(1)
    expect(abilityMoveOrder(pokemon('quick-draw'), move(), () => 0.4)).toBe(0)
  })
  it.each(['shadow-tag', 'arena-trap', 'magnet-pull'])('%s traps only eligible opponents', (a) => {
    const target = pokemon('run-away', 'target', ['steel'])
    expect(abilityTraps(target, pokemon(a))).toBe(true)
    target.terastallized = true
    target.member.tera = 'ghost'
    expect(abilityTraps(target, pokemon(a))).toBe(false)
  })
  it.each(['levitate', 'eelevate'])('%s avoids ground moves and entry hazards', (a) => {
    const p = pokemon(a)
    expect(abilityGrounded(p)).toBe(false)
    expect(battleMoveEffectiveness(move({ type: 'ground' }), p)).toBe(0)
    p.volatile['smack-down'] = 1
    expect(abilityGrounded(p)).toBe(true)
    expect(battleMoveEffectiveness(move({ type: 'ground' }), p)).toBe(1)
  })
  it('uses Heavy Metal and Light Metal with actual species weights', () => {
    const p = pokemon('heavy-metal', 'aggron')
    expect(abilityWeight(p)).toBe(720)
    p.ability.name = 'light-metal'
    expect(abilityWeight(p)).toBe(180)
  })
  it.each([
    ['clear-body', true],
    ['full-metal-body', false],
    ['prism-armor', false],
    ['shadow-shield', false],
    ['sturdy', true],
  ] as const)('respects Mold Breaker flags for %s', (a, bypasses) =>
    expect(abilityBypassed(pokemon('mold-breaker'), pokemon(a), move())).toBe(bypasses),
  )
  it('suppresses and restores abilities under Neutralizing Gas without altering permanent data', () => {
    const s = setup('neutralizing-gas', 'levitate'),
      target = s.opponent.roster[0]
    expect(abilityName(target)).toBe('')
    expect(abilityGrounded(target)).toBe(true)
    s.player.active = 1
    synchronizeAbilities(s.player, s.opponent, s.field, events())
    expect(abilityName(target)).toBe('levitate')
    expect(abilityGrounded(target)).toBe(false)
    const special = pokemon('multitype')
    s.opponent.roster[0] = special
    s.player.active = 0
    synchronizeAbilities(s.player, s.opponent, s.field, events())
    expect(abilityName(special)).toBe('multitype')
  })
  it.each(['cloud-nine', 'air-lock'])('%s suppresses weather effects while retaining the weather timer', (a) => {
    const s = setup(a)
    s.field.weather = 'rain'
    s.field.weatherTurns = 4
    synchronizeAbilities(s.player, s.opponent, s.field, events())
    expect(effectiveWeather(s.field)).toBeNull()
    expect(s.field.weather).toBe('rain')
    expect(s.field.weatherTurns).toBe(4)
  })
})

describe('ability timing through complete turns', () => {
  it('Sturdy survives a lethal hit before Focus Sash, and Mold Breaker bypasses it', () => {
    const s = setup('run-away', 'sturdy')
    s.opponent.roster[0].item = resource('focus-sash')
    s.player.roster[0].moves[0].data.power = 10000
    s.player.roster[0].stats[5] = 500
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].hp).toBe(1)
    expect(result.state.opponent.roster[0].item?.name).toBe('focus-sash')
    s.opponent.roster[0].item = null
    s.player.roster[0].ability.name = 'mold-breaker'
    const bypassed = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(bypassed.state.opponent.roster[0].hp).toBe(0)
  })
  it('Sturdy prevents OHKO moves even below full HP', () => {
    const s = setup('run-away', 'sturdy')
    s.player.roster[0].moves[0].data = move({ name: 'fissure', type: 'ground', power: null })
    s.opponent.roster[0].hp = 100
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].hp).toBe(100)
  })
  it('does not let Sturdy protect against the second hit of a multihit attack', () => {
    const s = setup('run-away', 'sturdy')
    s.player.roster[0].moves[0].data = move({ power: 10000, minHits: 2, maxHits: 2 })
    s.player.roster[0].stats[5] = 500
    expect(
      resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5).state.opponent.roster[0]
        .hp,
    ).toBe(0)
  })
  it('Pressure still spends exactly two PP on opponent-directed moves', () => {
    const s = setup('run-away', 'pressure')
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].moves[0].pp).toBe(18)
    expect(s.player.roster[0].moves[0].pp).toBe(20)
  })
  it('Speed Boost acts at the end of a full active turn and not immediately after switching in', () => {
    const s = setup('speed-boost')
    let result = resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].stages.speed).toBe(1)
    result = resolveBattleTurn(result.state, { kind: 'switch', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    result = resolveBattleTurn(result.state, { kind: 'switch', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].stages.speed).toBe(0)
  })
  it('Truant alternates attempts and resets on switching', () => {
    const s = setup('truant')
    const first = resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(first.state.player.roster[0].stages.attack).toBe(2)
    const loaf = resolveBattleTurn(first.state, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(loaf.state.player.roster[0].stages.attack).toBe(2)
    const third = resolveBattleTurn(loaf.state, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(third.state.player.roster[0].stages.attack).toBe(4)
  })
  it('Damp blocks explosive moves without damaging either combatant', () => {
    const s = setup('run-away', 'damp')
    s.player.roster[0].moves[0].data = move({ name: 'explosion', power: 250 })
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].hp).toBe(s.player.roster[0].hp)
    expect(result.state.opponent.roster[0].hp).toBe(s.opponent.roster[0].hp)
  })
  it('Serene Grace doubles secondary chances while Shield Dust prevents them', () => {
    const s = setup('serene-grace')
    s.player.roster[0].moves[0].data = move({ ailment: 'burn', ailmentChance: 30 })
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].status).toBe('burn')
    s.opponent.roster[0].ability.name = 'shield-dust'
    const blocked = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(blocked.state.opponent.roster[0].status).toBeNull()
  })
  it('Stench can flinch a slower target without changing the stored move', () => {
    const s = setup('stench')
    s.player.roster[0].stats[5] = 500
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.05)
    expect(result.state.opponent.roster[0].stages.attack).toBe(0)
    expect(s.player.roster[0].moves[0].data.flinchChance).toBeUndefined()
  })
  it('Parental Bond adds a second hit at one quarter damage', () => {
    const s = setup('parental-bond')
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    const damage = result.events.filter((e) => e.type === 'damage' && e.pokemon === 'right-0')
    expect(damage).toHaveLength(2)
    if (damage[0].type === 'damage' && damage[1].type === 'damage')
      expect(damage[1].amount).toBeCloseTo(damage[0].amount / 4, 0)
  })
  it.each(['unseen-fist', 'piercing-drill'])('%s bypasses Protect only through contact', (a) => {
    const s = setup(a)
    s.opponent.roster[0].moves[0].data = move({
      name: 'protect',
      damageClass: 'status',
      power: null,
      target: 'user',
      priority: 4,
    })
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(s.opponent.roster[0].hp)
    s.player.roster[0].moves[0].data = move({ name: 'psychic', type: 'psychic', damageClass: 'special' })
    expect(
      resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5).state.opponent.roster[0]
        .hp,
    ).toBe(s.opponent.roster[0].hp)
  })
  it('Infiltrator hits through Substitute without removing the decoy', () => {
    const s = setup('infiltrator')
    s.opponent.roster[0].substituteHp = 100
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].substituteHp).toBe(100)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(s.opponent.roster[0].hp)
  })
  it('Magic Bounce reflects a targeted status without consuming the reflector’s PP', () => {
    const s = setup('run-away', 'magic-bounce')
    const result = resolveBattleTurn(s, { kind: 'move', index: 3 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].status).toBe('badly-poisoned')
    expect(result.state.opponent.roster[0].status).toBeNull()
    expect(result.state.opponent.roster[0].moves[0].pp).toBe(20)
  })
  it('Dancer copies a dance immediately without spending PP', () => {
    const s = setup('run-away', 'dancer')
    s.player.roster[0].stats[5] = 500
    const result = resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(result.state.opponent.roster[0].stages.attack).toBe(2)
    expect(result.state.opponent.roster[0].moves[1].pp).toBe(20)
  })
  it('Opportunist copies an opponent’s actual boosts, respecting caps', () => {
    const s = setup('opportunist')
    const result = resolveBattleTurn(s, { kind: 'move', index: 2 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].stages.attack).toBe(2)
  })
  it('Gorilla Tactics locks the first move until switching', () => {
    const s = setup('gorilla-tactics')
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(legalBattleMoveIndexes(result.state.player.roster[0])).toEqual([0])
    const p = result.state.player.roster[0]
    p.ability.name = 'run-away'
    expect(legalBattleMoveIndexes(p)).toEqual([0, 1, 2, 3])
  })
  it('regenerates on switching and leaves the input state unchanged', () => {
    const s = setup('regenerator')
    s.player.roster[0].hp = 100
    const before = JSON.stringify(s)
    const result = resolveBattleTurn(s, { kind: 'switch', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].hp).toBe(213)
    expect(JSON.stringify(s)).toBe(before)
  })
  it.each(['wimp-out', 'emergency-exit'])('%s requests a replacement only when an attack crosses half HP', (a) => {
    const s = setup('run-away', a),
      target = s.opponent.roster[0]
    target.hp = Math.floor(target.maxHp / 2) + 1
    s.player.roster[0].stats[5] = 500
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.switchRequested).toBe(true)
  })
  it.each([
    'moxie',
    'chilling-neigh',
    'as-one-glastrier',
    'grim-neigh',
    'as-one-spectrier',
    'beast-boost',
    'eelevate',
    'battle-bond',
    'soul-heart',
  ])('%s reacts to a move knockout', (a) => {
    const s = setup(a)
    if (a === 'battle-bond') s.player.roster[0].pokemon.species = 'greninja'
    s.player.roster[0].stats[5] = 500
    s.opponent.roster[0].hp = 1
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    const stages = result.state.player.roster[0].stages
    expect(Object.values(stages).some((v) => v > 0)).toBe(true)
    if (a === 'battle-bond') expect([stages.attack, stages.specialAttack, stages.speed]).toEqual([1, 1, 1])
  })
  it('Toxic Debris puts Toxic Spikes on the attacker’s side', () => {
    const s = setup('run-away', 'toxic-debris')
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.hazards.toxicSpikes).toBe(1)
    expect(result.state.opponent.hazards.toxicSpikes).toBe(0)
  })
  it.each(['sand-spit', 'seed-sower'])('%s sets its field effect after damage', (a) => {
    const { s } = hit(a)
    if (a === 'sand-spit') expect(s.field.weather).toBe('sandstorm')
    else expect(s.field.terrain).toBe('grassy')
  })
})

describe('ability forms, resources and persistent state', () => {
  it.each([
    ['forecast', 'castform', 'sun', 'fire'],
    ['forecast', 'castform', 'rain', 'water'],
    ['forecast', 'castform', 'snow', 'ice'],
  ] as const)('%s updates %s in %s', (a, name, weather, type) => {
    const p = pokemon(a, name),
      f: BattleField = { ...field(), weather }
    updateAbilityForm(p, f, events())
    expect(abilityTypes(p)).toEqual([type])
    f.weather = null
    updateAbilityForm(p, f, events())
    expect(abilityTypes(p)).toEqual(['normal'])
  })
  it.each([
    ['schooling', 'wishiwashi', 'wishiwashi-school'],
    ['shields-down', 'minior', 'minior-meteor'],
  ] as const)('%s transforms %s with the form’s real stats', (a, name, form) => {
    const p = pokemon(a, name)
    updateAbilityForm(p, field(), events())
    expect(p.pokemon.name).toBe(form)
    p.hp = 1
    updateAbilityForm(p, field(), events())
    expect(p.pokemon.name).toBe(a === 'schooling' ? 'wishiwashi-solo' : 'minior-core')
  })
  it('Stance Change transforms before attacking and returns to Shield on switching', () => {
    const p = pokemon('stance-change', 'aegislash')
    abilityModifyMove(p, pokemon(), move(), field(), events())
    expect(p.pokemon.name).toBe('aegislash-blade')
    expect(p.pokemon.stats[1]).toBe(140)
    abilityExit(p, events())
    expect(p.pokemon.name).toBe('aegislash-shield')
    expect(p.pokemon.stats[2]).toBe(140)
  })
  it.each([
    ['disguise', 'mimikyu', 'mimikyu-busted'],
    ['ice-face', 'eiscue', 'eiscue-noice'],
  ] as const)('%s blocks its first eligible hit and exposes its new form', (a, name, form) => {
    const p = pokemon(a, name),
      before = p.hp
    expect(abilityAbsorbsHit(p, pokemon(), move(), events())).toBe(true)
    expect(p.pokemon.name).toBe(form)
    expect(abilityAbsorbsHit(p, pokemon(), move(), events())).toBe(false)
    expect(p.hp).toBe(a === 'disguise' ? before - Math.floor(p.maxHp / 8) : before)
    if (a === 'ice-face') {
      updateAbilityForm(p, { ...field(), weather: 'snow' }, events())
      expect(abilityAbsorbsHit(p, pokemon(), move(), events())).toBe(true)
    }
  })
  it('Zero to Hero persists its Hero stats after switching', () => {
    const p = pokemon('zero-to-hero', 'palafin')
    abilityExit(p, events())
    expect(p.pokemon.name).toBe('palafin-hero')
    expect(p.pokemon.stats[1]).toBe(160)
  })
  it.each([
    ['zen-mode', 'darmanitan', 'darmanitan-zen'],
    ['power-construct', 'zygarde', 'zygarde-complete'],
    ['hunger-switch', 'morpeko', 'morpeko-hangry'],
  ] as const)('%s applies its residual transformation', (a, name, form) => {
    const s = setup()
    s.player.roster[0] = pokemon(a, name)
    s.player.roster[0].hp = 20
    abilityResidual(s.player, s.opponent, s.field, () => 0.5, events())
    expect(s.player.roster[0].pokemon.name).toBe(form)
  })
  it('Mimicry follows terrain and restores the original types when it ends', () => {
    const p = pokemon('mimicry'),
      f = { ...field(), terrain: 'psychic' as const }
    updateAbilityForm(p, f, events())
    expect(abilityTypes(p)).toEqual(['psychic'])
    updateAbilityForm(p, field(), events())
    expect(abilityTypes(p)).toEqual(['normal'])
  })
  it.each([
    ['multitype', 'arceus', 'flame-plate', 'fire'],
    ['rks-system', 'silvally', 'water-memory', 'water'],
  ] as const)('%s uses its held type-changing item', (a, name, item, type) => {
    const p = pokemon(a, name)
    p.item = resource(item)
    updateAbilityForm(p, field(), events())
    expect(abilityTypes(p)).toEqual([type])
  })
  it('Tera Shift and Teraform Zero transform Terapagos and clear weather and terrain', () => {
    const s = setup()
    s.player.roster[0] = pokemon('tera-shift', 'terapagos')
    abilityEntry(s.player, s.opponent, s.field, events())
    const p = s.player.roster[0]
    expect(p.pokemon.name).toBe('terapagos-terastal')
    expect(abilityName(p)).toBe('tera-shell')
    p.terastallized = true
    p.member.tera = 'stellar'
    s.field.weather = 'rain'
    s.field.terrain = 'electric'
    abilityTera(p, s.field, events())
    expect(p.pokemon.name).toBe('terapagos-stellar')
    expect(abilityName(p)).toBe('teraform-zero')
    expect(s.field.weather).toBeNull()
    expect(s.field.terrain).toBeNull()
  })
  it('Tera Shell changes any non-immune hit at full HP to half effectiveness', () => {
    const p = pokemon('tera-shell', 'terapagos', ['normal'])
    expect(battleMoveEffectiveness(move({ type: 'fighting' }), p)).toBe(0.5)
    expect(battleMoveEffectiveness(move({ type: 'ghost' }), p)).toBe(0)
    p.hp--
    expect(battleMoveEffectiveness(move({ type: 'fighting' }), p)).toBe(2)
  })
  it.each([
    ['ogerpon', 'speed'],
    ['ogerpon-wellspring', 'specialDefense'],
    ['ogerpon-hearthflame', 'attack'],
    ['ogerpon-cornerstone', 'defense'],
  ] as const)('Embody Aspect boosts the correct stat for %s', (name, stat) => {
    const p = pokemon('embody-aspect', name)
    abilityTera(p, field(), events())
    expect(p.stages[stat]).toBe(1)
  })
  it('Trace copies a legal ability while Imposter copies stats, moves and stages', () => {
    const traced = setup('trace', 'speed-boost')
    expect(abilityName(traced.player.roster[0])).toBe('speed-boost')
    const s = setup()
    s.player.roster[0] = pokemon('imposter')
    s.opponent.roster[0].stages.attack = 3
    abilityEntry(s.player, s.opponent, s.field, events())
    const p = s.player.roster[0]
    expect(p.stages.attack).toBe(3)
    expect(p.moves.map((m) => m.pp)).toEqual([5, 5, 5, 5])
    expect(abilityName(p)).toBe('run-away')
    abilityExit(p, events())
    expect(abilityName(p)).toBe('imposter')
    expect(p.moves[0].pp).toBe(20)
  })
  it('Illusion uses the last living teammate and breaks upon direct damage', () => {
    const s = setup('illusion'),
      p = s.player.roster[0]
    expect(visibleBattlePokemon(p, true).pokemon.name).toBe('left-5')
    expect(visibleBattlePokemon(p, false).pokemon.name).toBe('left-0')
    abilityAfterHit(
      p,
      s.opponent.roster[0],
      move(),
      1,
      p.hp + 1,
      false,
      s.field,
      s.opponent,
      s.player,
      () => 0.5,
      events(),
    )
    expect(visibleBattlePokemon(p, true).pokemon.name).toBe('left-0')
  })
  it('Download chooses the weaker defensive stat, Supersweet Syrup is once per battle, and Screen Cleaner clears both sides', () => {
    const s = setup()
    s.player.roster[0] = pokemon('download')
    s.opponent.roster[0].stats[2] = 1
    abilityEntry(s.player, s.opponent, s.field, events())
    expect(s.player.roster[0].stages.attack).toBe(1)
    s.player.roster[0].ability.name = 'supersweet-syrup'
    abilityEntry(s.player, s.opponent, s.field, events())
    abilityEntry(s.player, s.opponent, s.field, events())
    expect(s.opponent.roster[0].stages.evasion).toBe(-1)
    s.player.conditions.reflect = 5
    s.opponent.conditions.lightScreen = 5
    s.player.roster[0].ability.name = 'screen-cleaner'
    abilityEntry(s.player, s.opponent, s.field, events())
    expect(s.player.conditions.reflect).toBe(0)
    expect(s.opponent.conditions.lightScreen).toBe(0)
  })
  it('Frisk reveals the held item, Forewarn reveals a move, and Anticipation warns of a threat', () => {
    const s = setup(),
      log = events()
    s.player.roster[0].ability.name = 'frisk'
    s.opponent.roster[0].item = resource('leftovers')
    abilityEntry(s.player, s.opponent, s.field, log)
    expect(log).toContainEqual(expect.objectContaining({ type: 'itemActivated', item: 'leftovers', consumed: false }))
    s.player.roster[0].ability.name = 'forewarn'
    abilityEntry(s.player, s.opponent, s.field, log)
    expect(s.opponent.roster[0].revealedMoves).toContain('tackle')
    s.player.roster[0].ability.name = 'anticipation'
    s.opponent.roster[0].moves[0].data.type = 'fighting'
    abilityEntry(s.player, s.opponent, s.field, log)
    expect(log).toContainEqual(expect.objectContaining({ type: 'ability', ability: 'anticipation' }))
  })
  it.each(['primordial-sea', 'desolate-land', 'delta-stream'])('%s remains until its holder leaves', (a) => {
    const s = setup(a)
    expect(s.field.primalWeather).toBe(a)
    s.player.active = 1
    synchronizeAbilities(s.player, s.opponent, s.field, events())
    expect(s.field.primalWeather).toBeUndefined()
  })
  it('consumption enables Unburden and berry abilities at their proper times', () => {
    const p = pokemon('unburden'),
      log = events()
    p.hp = 50
    abilityConsumedItem(p, resource('sitrus-berry'), log)
    expect(abilityStatMultiplier(p, 5)).toBe(2)
    abilityExit(p, log)
    expect(abilityStatMultiplier(p, 5)).toBe(1)
    p.ability.name = 'ripen'
    abilityEatBerry(p, resource('sitrus-berry'), log)
    expect(p.hp).toBe(220)
    p.ability.name = 'cheek-pouch'
    p.hp = 50
    abilityEatBerry(p, resource('oran-berry'), log)
    expect(p.hp).toBe(173)
  })
  it.each(['harvest', 'pickup', 'cud-chew'])('%s restores or reuses a consumed berry', (a) => {
    const s = setup(a),
      p = s.player.roster[0],
      log = events()
    p.hp = 50
    if (a === 'pickup') abilityConsumedItem(s.opponent.roster[0], resource('sitrus-berry'), log)
    else abilityConsumedItem(p, resource('sitrus-berry'), log)
    abilityResidual(s.player, s.opponent, s.field, () => 0, log)
    if (a === 'cud-chew') {
      expect(p.hp).toBe(50)
      abilityResidual(s.player, s.opponent, s.field, () => 0, log)
      expect(p.hp).toBe(135)
    } else expect(p.item?.name).toBe('sitrus-berry')
  })
  it('Gluttony eats pinch berries at half HP and Unnerve prevents berry use', () => {
    const s = setup('gluttony')
    s.player.roster[0].item = resource('figy-berry')
    s.player.roster[0].hp = 160
    const result = resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].item).toBeNull()
    expect(result.state.player.roster[0].hp).toBeGreaterThan(160)
    s.opponent.roster[0].ability.name = 'unnerve'
    const blocked = resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(blocked.state.player.roster[0].item?.name).toBe('figy-berry')
  })
  it('Klutz disables held-item stat modifiers', () => {
    const p = pokemon('klutz')
    p.item = resource('choice-scarf')
    abilityMemory(p).itemBlocked = true
    expect(currentBattleStats(p)[5]).toBe(p.stats[5])
  })
  it.each([
    ['tablets-of-ruin', 1],
    ['vessel-of-ruin', 3],
    ['sword-of-ruin', 2],
    ['beads-of-ruin', 4],
  ] as const)('%s lowers the opponent’s stat without a stage change', (a, index) => {
    const p = pokemon(),
      foe = pokemon(a)
    expect(currentBattleStats(p, field(), foe)[index]).toBe(Math.floor(p.stats[index] * 0.75))
    expect(p.stages).toEqual({
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
    })
  })
  it('Skill Swap and Gastro Acid honor permanent ability protections', () => {
    const p = pokemon('speed-boost'),
      target = pokemon('sturdy')
    expect(abilitySpecialMove(p, target, move({ name: 'skill-swap' }), events())).toBe(true)
    expect(abilityName(p)).toBe('sturdy')
    expect(abilityName(target)).toBe('speed-boost')
    expect(abilitySpecialMove(p, target, move({ name: 'gastro-acid' }), events())).toBe(true)
    expect(abilityName(target)).toBe('')
    expect(abilitySpecialMove(p, pokemon('multitype'), move({ name: 'gastro-acid' }), events())).toBe(false)
  })
  it('reads real move flags and removes contact for Long Reach', () => {
    expect(moveHasFlag(move(), 'contact')).toBe(true)
    expect(moveMakesContact(move(), pokemon('long-reach'))).toBe(false)
  })
  it('Moody raises one combat stat and lowers a different one; Bad Dreams damages a sleeping opponent', () => {
    const s = setup('moody')
    abilityResidual(s.player, s.opponent, s.field, () => 0, events())
    expect(Object.values(s.player.roster[0].stages).sort()).toEqual([-1, 0, 0, 0, 0, 0, 2])
    s.player.roster[0].ability.name = 'bad-dreams'
    s.opponent.roster[0].status = 'sleep'
    abilityResidual(s.player, s.opponent, s.field, () => 0, events())
    expect(s.opponent.roster[0].hp).toBe(s.opponent.roster[0].maxHp - Math.floor(s.opponent.roster[0].maxHp / 8))
  })
})

describe('ability interaction regressions', () => {
  it.each([
    ['technician', 1, false, 1.5],
    ['tinted-lens', 0.5, false, 2],
    ['sniper', 1, true, 1.5],
    ['neuroforce', 2, false, 1.25],
    ['analytic', 1, false, 1.3],
    ['stakeout', 1, false, 2],
  ] as const)('%s applies its conditional power modifier', (a, effectiveness, critical, expected) => {
    const p = pokemon(a),
      target = pokemon()
    abilityMemory(target).moved = true
    abilityMemory(target).switchedIn = true
    expect(abilityPowerMultiplier(p, target, move(), field(), effectiveness, critical, undefined)).toBeCloseTo(expected)
  })
  it.each(['dark-aura', 'fairy-aura'])('%s is inverted by Aura Break', (a) => {
    const p = pokemon(a),
      target = pokemon('aura-break'),
      m = move({ type: a === 'dark-aura' ? 'dark' : 'fairy' })
    expect(abilityPowerMultiplier(p, target, m, field(), 1, false, undefined)).toBe(0.75)
    target.ability.name = 'run-away'
    expect(abilityPowerMultiplier(p, target, m, field(), 1, false, undefined)).toBeCloseTo(4 / 3)
  })
  it('Rivalry distinguishes same, opposite, and absent genders', () => {
    const p = pokemon('rivalry'),
      target = pokemon()
    expect(abilityPowerMultiplier(p, target, move(), field(), 1, false, undefined)).toBe(1.25)
    target.member.gender = 'female'
    expect(abilityPowerMultiplier(p, target, move(), field(), 1, false, undefined)).toBe(0.75)
    target.member.gender = 'none'
    expect(abilityPowerMultiplier(p, target, move(), field(), 1, false, undefined)).toBe(1)
  })
  it.each([
    ['defeatist', 1, 0.5],
    ['slow-start', 5, 0.5],
    ['solar-power', 3, 1.5],
    ['grass-pelt', 2, 1.5],
    ['flower-gift', 4, 1.5],
  ] as const)('%s derives stat changes from actual battle conditions', (a, index, expected) => {
    const p = pokemon(a, a === 'flower-gift' ? 'cherrim' : 'test-pokemon'),
      f: BattleField = { ...field(), weather: 'sun', terrain: 'grassy' }
    p.hp = Math.floor(p.maxHp / 2)
    expect(abilityStatMultiplier(p, index, f)).toBe(expected)
  })
  it('Early Bird wakes before acting when its accelerated sleep counter expires', () => {
    const s = setup('early-bird'),
      p = s.player.roster[0]
    p.status = 'sleep'
    p.sleepTurns = 1
    const result = resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].status).toBeNull()
    expect(result.state.player.roster[0].stages.attack).toBe(2)
  })
  it('Steadfast gains Speed from a flinch and Anger Point maximizes Attack after a critical hit', () => {
    const s = setup('steadfast')
    s.player.roster[0].volatile.flinch = 1
    expect(
      resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5).state.player.roster[0]
        .stages.speed,
    ).toBe(1)
    const p = pokemon('anger-point')
    p.stages.attack = -3
    abilityAfterHit(p, pokemon(), move(), 10, p.hp + 10, true, field(), undefined, s.opponent, () => 0.5, events())
    expect(p.stages.attack).toBe(6)
  })
  it('Cursed Body disables a damaging move even if its holder faints', () => {
    const s = setup(),
      p = pokemon('cursed-body'),
      user = pokemon()
    p.hp = 0
    user.lastMoveIndex = 0
    abilityAfterHit(p, user, move(), 1, 1, false, field(), undefined, s.opponent, () => 0, events())
    expect(user.disabledMoveIndex).toBe(0)
    expect(user.volatile.disable).toBe(4)
  })
  it.each(['berserk', 'anger-shell'])('%s activates when damage crosses the half-HP boundary', (a) => {
    const s = setup('run-away', a),
      p = s.opponent.roster[0]
    p.hp = Math.floor(p.maxHp / 2) + 1
    s.player.roster[0].stats[5] = 500
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(result.state.opponent.roster[0].stages.specialAttack).toBe(1)
    if (a === 'anger-shell') expect(result.state.opponent.roster[0].stages.defense).toBe(-1)
  })
  it.each(['aftermath', 'innards-out'])('%s deals its knockout retaliation', (a) => {
    const s = setup(),
      p = pokemon(a),
      user = pokemon()
    p.hp = 0
    abilityAfterHit(p, user, move(), 30, 30, false, field(), undefined, s.opponent, () => 0.5, events())
    expect(user.hp).toBe(user.maxHp - (a === 'aftermath' ? Math.floor(user.maxHp / 4) : 30))
  })
  it('Toxic Chain is stopped by Shield Dust and Covert Cloak', () => {
    expect(hit('shield-dust', 'toxic-chain').target.status).toBeNull()
    const s = setup(),
      p = pokemon(),
      user = pokemon('toxic-chain')
    p.item = resource('covert-cloak')
    abilityAfterHit(p, user, move(), 1, p.hp + 1, false, field(), undefined, s.opponent, () => 0, events())
    expect(p.status).toBeNull()
  })
  it('Pickpocket and Magician transfer an item and activate Unburden', () => {
    const s = setup(),
      p = pokemon('pickpocket'),
      user = pokemon('unburden')
    user.item = resource('leftovers')
    abilityAfterHit(p, user, move(), 1, p.hp + 1, false, field(), undefined, s.opponent, () => 0.5, events())
    expect(p.item?.name).toBe('leftovers')
    expect(user.item).toBeNull()
    expect(abilityStatMultiplier(user, 5)).toBe(2)
    user.ability.name = 'magician'
    abilityAfterHit(p, user, move(), 1, p.hp + 1, false, field(), undefined, s.opponent, () => 0.5, events())
    expect(user.item?.name).toBe('leftovers')
    expect(p.item).toBeNull()
  })
  it('Perish Body counts down and switching clears the countdown', () => {
    const s = setup('perish-body'),
      p = s.player.roster[0],
      user = s.opponent.roster[0]
    abilityAfterHit(p, user, move(), 1, p.hp + 1, false, field(), s.opponent, s.player, () => 0.5, events())
    expect(abilityMemory(user).perish).toBe(4)
    for (let i = 0; i < 4; i++) abilityResidual(s.opponent, s.player, field(), () => 0.5, events())
    expect(user.hp).toBe(0)
    abilityExit(p, events())
    expect(abilityMemory(p).perish).toBeUndefined()
  })
  it('Gulp Missile loads prey and retaliates with damage and the correct effect', () => {
    const s = setup(),
      p = pokemon('gulp-missile', 'cramorant'),
      user = pokemon()
    abilityModifyMove(p, user, move({ name: 'surf', type: 'water' }), field(), events())
    expect(p.pokemon.name).toBe('cramorant-gulping')
    abilityAfterHit(p, user, move(), 1, p.hp + 1, false, field(), undefined, s.opponent, () => 0.5, events())
    expect(user.stages.defense).toBe(-1)
    expect(user.hp).toBe(user.maxHp - Math.floor(user.maxHp / 4))
    expect(p.pokemon.name).toBe('cramorant')
  })
  it('Intimidate reactivates when Neutralizing Gas leaves', () => {
    const s = setup('neutralizing-gas', 'intimidate')
    expect(s.player.roster[0].stages.attack).toBe(0)
    const result = resolveBattleTurn(s, { kind: 'switch', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(result.state.player.roster[1].stages.attack).toBe(-1)
  })
  it.each(['suction-cups', 'guard-dog'])('%s prevents forced replacement', (a) => {
    const s = setup('run-away', a)
    s.player.roster[0].moves[0].data = move({ name: 'roar', damageClass: 'status', power: null, priority: -6 })
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(result.state.opponent.switchRequested).toBe(false)
  })
  it('Sticky Hold preserves held items while taking Knock Off damage', () => {
    const s = setup('run-away', 'sticky-hold'),
      p = s.opponent.roster[0]
    p.item = resource('leftovers')
    s.player.roster[0].moves[0].data = move({ name: 'knock-off', type: 'dark', power: 65 })
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].item?.name).toBe('leftovers')
    expect(result.state.opponent.roster[0].hp).toBeLessThan(p.hp)
  })
  it('Supreme Overlord snapshots fallen allies on entry', () => {
    const s = setup(),
      p = s.player.roster[0]
    p.ability.name = 'supreme-overlord'
    s.player.roster[1].hp = 0
    s.player.roster[2].hp = 0
    abilityEntry(s.player, s.opponent, s.field, events())
    expect(abilityPowerMultiplier(p, s.opponent.roster[0], move(), s.field, 1, false, s.player)).toBe(1.2)
    s.player.roster[3].hp = 0
    expect(abilityPowerMultiplier(p, s.opponent.roster[0], move(), s.field, 1, false, s.player)).toBe(1.2)
  })
  it('Sheer Force raises damage and strips secondaries without modifying move data', () => {
    const p = pokemon('sheer-force'),
      m = move({ name: 'flamethrower', type: 'fire', ailment: 'burn', ailmentChance: 10 })
    expect(abilityModifyMove(p, pokemon(), m, field(), events())).toBe(1.3)
    expect(m.ailment).toBeNull()
    expect(m.ailmentChance).toBe(0)
  })
})

describe('ability state and presentation consistency', () => {
  it('keeps Illusion’s disguise in move announcements until direct damage reveals it', () => {
    const s = setup('illusion')
    s.player.roster[0].stats[5] = 500
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.events.find((e) => e.type === 'move' && e.side === 'player')).toEqual(
      expect.objectContaining({ pokemon: 'left-5' }),
    )
    expect(result.state.player.roster[0].pokemon.name).toBe('left-0')
    expect(visibleBattlePokemon(result.state.player.roster[0], true).pokemon.name).toBe('left-5')
  })
  it('Klutz prevents Leftovers recovery and Life Orb recoil as well as stat boosts', () => {
    const s = setup('klutz'),
      p = s.player.roster[0]
    p.hp = 100
    p.item = resource('leftovers')
    expect(
      resolveBattleTurn(s, { kind: 'move', index: 1 }, { kind: 'move', index: 1 }, () => 0.5).state.player.roster[0].hp,
    ).toBe(100)
    p.item = resource('life-orb')
    expect(
      resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5).state.player.roster[0].hp,
    ).toBe(100)
  })
  it('Natural Cure copied through Trace cures status before its original ability is restored', () => {
    const s = setup('trace', 'natural-cure'),
      p = s.player.roster[0]
    p.status = 'burn'
    const result = resolveBattleTurn(s, { kind: 'switch', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].status).toBeNull()
    expect(result.state.player.roster[0].ability.name).toBe('trace')
  })
  it('the slower weather setter determines the initial weather', () => {
    const s = setup(),
      p = s.player.roster[0],
      foe = s.opponent.roster[0]
    p.ability.name = 'drizzle'
    p.stats[5] = 10
    foe.ability.name = 'drought'
    foe.stats[5] = 500
    const result = createBattleState(s.player.team, s.player.roster, s.opponent.team, s.opponent.roster)
    expect(result.field.weather).toBe('rain')
  })
})

describe('ability damage and status edge cases', () => {
  it('Infiltrator passes through Safeguard with a status move', () => {
    const s = setup('infiltrator')
    s.opponent.conditions.safeguard = 5
    const result = resolveBattleTurn(s, { kind: 'move', index: 3 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].status).toBe('badly-poisoned')
  })
  it('Liquid Ooze damages a draining attacker even at full HP', () => {
    const s = setup('run-away', 'liquid-ooze')
    s.player.roster[0].moves[0].data = move({
      name: 'giga-drain',
      type: 'grass',
      damageClass: 'special',
      drain: 50,
      power: 75,
    })
    const result = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.player.roster[0].hp).toBeLessThan(s.player.roster[0].hp)
  })
  it('Mold Breaker bypasses Fur Coat in the actual damage calculation', () => {
    const s = setup('run-away', 'fur-coat')
    const regular = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    s.player.roster[0].ability.name = 'mold-breaker'
    const bypassed = resolveBattleTurn(s, { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(bypassed.state.opponent.roster[0].hp).toBeLessThan(regular.state.opponent.roster[0].hp)
  })
  it('Mycelium Might bypasses status-immunity abilities while preserving type immunities', () => {
    const s = setup('mycelium-might', 'immunity')
    const result = resolveBattleTurn(s, { kind: 'move', index: 3 }, { kind: 'move', index: 1 }, () => 0.5)
    expect(result.state.opponent.roster[0].status).toBe('badly-poisoned')
    s.opponent.roster[0].pokemon.types = ['steel']
    expect(
      resolveBattleTurn(s, { kind: 'move', index: 3 }, { kind: 'move', index: 1 }, () => 0.5).state.opponent.roster[0]
        .status,
    ).toBeNull()
  })
})

describe('form entry ordering', () => {
  it('Embody Aspect reactivates when a Terastallized Ogerpon re-enters', () => {
    const s = setup(),
      p = pokemon('embody-aspect', 'ogerpon-wellspring')
    s.player.roster[0] = p
    p.terastallized = true
    abilityEntry(s.player, s.opponent, s.field, events())
    expect(p.stages.specialDefense).toBe(1)
  })
  it('Tera Shift recalculates maximum HP before applying entry hazards', () => {
    const s = setup()
    const replacement = pokemon('tera-shift', 'terapagos')
    s.player.roster[1] = replacement
    s.player.hazards.stealthRock = true
    const result = resolveBattleTurn(s, { kind: 'switch', index: 1 }, { kind: 'move', index: 1 }, () => 0.5)
    const transformed = result.state.player.roster[1]
    expect(transformed.maxHp).toBe(transformed.stats[0])
    expect(transformed.hp).toBe(transformed.maxHp - Math.floor(transformed.maxHp / 8))
    expect(transformed.ability.name).toBe('tera-shell')
  })
})

describe('singles ability applicability', () => {
  it('Pastel Veil cures its active holder without inventing a cure for benched teammates', () => {
    const s = setup('pastel-veil'),
      p = s.player.roster[0],
      bench = s.player.roster[1]
    p.status = 'poison'
    bench.status = 'poison'
    abilityEntry(s.player, s.opponent, s.field, events())
    expect(p.status).toBeNull()
    expect(bench.status).toBe('poison')
  })
})
