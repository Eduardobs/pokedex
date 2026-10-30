/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it, afterAll } from 'vitest'
import apiMoves from '../data/third-party/pokeapi-battle-moves.json'
import singlesExclusions from '../data/third-party/battle-move-singles-exclusions.json'
import moveFlags from '../data/third-party/battle-move-flags.json'
const referenceSnapshot: {
  sha256: string
  records: { id: number; name: string; reference: Record<string, unknown> | null }[]
} = JSON.parse(readFileSync('src/data/third-party/battle-move-reference.json', 'utf8'))
import { parseBattleMove } from './battle-data'
import {
  battleHitProbability,
  battleMoveEffectiveness,
  createBattlePokemon,
  createBattleState,
  legalBattleMoveIndexes,
  resolveBattleTurn,
  type BattleMove,
} from './battle'
import {
  moveFailsInSingles,
  supplementalMoveDamage,
  supplementalMoveEffect,
  supplementalMoveMetadata,
  supplementalMoveTimings,
} from './battle-move-effects'
import type { Team, TeamMember, TeamPokemon } from './teams'
import { multistrikeMoves } from './battle-multistrike'

function setup(move: BattleMove) {
  const member: TeamMember = {
    id: 'user',
    pokemon: 'user',
    level: 100,
    friendship: 255,
    shiny: false,
    gender: 'male',
    tera: 'normal',
    ability: 'run-away',
    nature: 'hardy',
    item: '',
    moves: [move.name, 'splash', 'splash', 'splash'],
    evs: [0, 0, 0, 0, 0, 0],
    ivs: [31, 31, 31, 31, 31, 31],
    abilityActive: false,
    itemActive: false,
  }
  const pokemon: TeamPokemon = {
    id: 1,
    name: 'user',
    species: 'user',
    stats: [100, 100, 100, 100, 100, 100],
    types: ['normal'],
    abilities: ['run-away'],
    moves: [move.name, 'splash', 'splash', 'splash'],
  }
  const own: Team = {
    id: 'user',
    name: 'user',
    competitiveFormat: 'singles-6v6',
    members: Array.from({ length: 6 }, (_, index) => ({ ...member, id: `user-${index}` })),
  }
  const otherMember = { ...member, id: 'target', pokemon: 'target', moves: ['splash', 'splash', 'splash', 'splash'] }
  const other: Team = {
    ...own,
    id: 'target',
    members: Array.from({ length: 6 }, (_, index) => ({ ...otherMember, id: `target-${index}` })),
  }
  const splash = parseBattleMove(apiMoves[149])
  const state = createBattleState(
    own,
    own.members.map((entry) => createBattlePokemon(entry, pokemon, [move, splash, splash, splash])),
    other,
    other.members.map((entry) =>
      createBattlePokemon(entry, { ...pokemon, name: 'target' }, [splash, splash, splash, splash]),
    ),
  )
  state.player.roster[0].stats[5] = 1000
  state.opponent.roster[0].maxHp = 10000
  state.opponent.roster[0].hp = 10000
  return state
}
const executeMove = (state: ReturnType<typeof setup>, roll = 0.5) =>
  resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => roll)
const load = (name: string) => {
  const payload = apiMoves.find((move) => move.name === name)
  if (!payload) throw new Error(`Missing move ${name}`)
  return parseBattleMove(payload)
}

describe('complete PokéAPI move catalog audit', () => {
  it('contains every ID from 1 through 919 exactly once, excluding IDs above 10000', () => {
    expect(apiMoves.map((move) => move.id)).toEqual(Array.from({ length: 919 }, (_, index) => index + 1))
    expect(new Set(apiMoves.map((move) => move.name)).size).toBe(919)
    expect(Object.keys(moveFlags)).toEqual(apiMoves.map((move) => move.name))
    expect(referenceSnapshot.records.map((move) => move.id)).toEqual(apiMoves.map((move) => move.id))
    expect(referenceSnapshot.records.every((move) => move.reference !== null)).toBe(true)
  })

  it.each(apiMoves.filter((payload) => moveFailsInSingles(payload.name)))(
    '#$id $name fails explicitly without changing either combatant or field',
    (payload) => {
      const state = setup(parseBattleMove(payload))
      const result = executeMove(state)
      expect(result.events).toContainEqual({ type: 'failed', pokemon: 'user' })
      expect(result.state.opponent.roster[0].hp).toBe(10000)
      expect(result.state.opponent.roster[0].stages).toEqual(state.opponent.roster[0].stages)
      expect(result.state.player.roster[0].hp).toBe(state.player.roster[0].hp)
      expect(result.state.player.roster[0].stages).toEqual(state.player.roster[0].stages)
      expect(result.state.field).toEqual(state.field)
      expect(result.state.player.roster[0].moves[0].pp).toBe(state.player.roster[0].moves[0].pp - 1)
    },
  )
  it('excludes every Z/Max definition and every move requiring an adjacent ally', () => {
    for (const { name, reference } of referenceSnapshot.records) {
      if (reference && (reference.isZ || reference.isMax || reference.target === 'adjacentAlly'))
        expect(moveFailsInSingles(name), name).toBe(true)
    }
    for (const name of ['acupressure', 'wide-guard', 'quick-guard', 'decorate', 'instruct', 'surf'])
      expect(moveFailsInSingles(name), name).toBe(false)
  })
  it.each(['guillotine', 'horn-drill', 'fissure', 'sheer-cold'])(
    '%s uses level accuracy without accuracy/evasion or item modifiers',
    (name) => {
      const state = setup(load(name))
      const user = state.player.roster[0],
        target = state.opponent.roster[0]
      user.member.level = 80
      target.member.level = 70
      user.stages.accuracy = -6
      target.stages.evasion = 6
      target.item = { name: 'bright-powder', names: [], descriptions: [], sprite: null }
      if (name === 'sheer-cold') user.pokemon.types = ['ice']
      expect(battleHitProbability(load(name), user, target, state.field)).toBeCloseTo(0.4)
      target.member.level = 81
      user.ability.name = 'no-guard'
      expect(battleHitProbability(load(name), user, target, state.field)).toBe(0)
      expect(executeMove(state, 0).state.opponent.roster[0].hp).toBe(10000)
    },
  )
  it('Sheer Cold has reduced accuracy for non-Ice users and cannot hit Ice targets', () => {
    const state = setup(load('sheer-cold'))
    const user = state.player.roster[0],
      target = state.opponent.roster[0]
    expect(battleHitProbability(load('sheer-cold'), user, target, state.field)).toBe(0.2)
    target.pokemon.types = ['ice']
    user.ability.name = 'no-guard'
    expect(executeMove(state, 0).state.opponent.roster[0].hp).toBe(10000)
  })
  // This is a bounded execution/invariant test, not a claim of cartridge parity.
  it.each(apiMoves)('#$id $name parses and resolves three turns without corrupting battle state', (payload) => {
    const move = parseBattleMove(payload)
    expect(move.name).toBe(payload.name)
    expect(move.priority).toBe(payload.priority)
    expect(move.accuracy).toBe(payload.accuracy === 0 ? null : payload.accuracy)
    expect(move.pp).toBe(payload.pp)
    for (const roll of [0, 0.5, 0.99]) {
      let state = setup(move)
      for (let turn = 0; turn < 3 && state.phase === 'choice'; turn += 1) {
        const before = structuredClone(state)
        const result = executeMove(state, roll)
        expect(state).toEqual(before)
        state = result.state
        for (const side of [state.player, state.opponent]) {
          for (const pokemon of side.roster) {
            expect(Number.isFinite(pokemon.hp)).toBe(true)
            expect(pokemon.hp).toBeGreaterThanOrEqual(0)
            expect(pokemon.hp).toBeLessThanOrEqual(pokemon.maxHp)
            for (const slot of pokemon.moves) expect(slot.pp).toBeGreaterThanOrEqual(0)
            for (const stage of Object.values(pokemon.stages)) {
              expect(stage).toBeGreaterThanOrEqual(-6)
              expect(stage).toBeLessThanOrEqual(6)
            }
          }
        }
      }
    }
  })
})

describe('catalog-derived mechanics regressions', () => {
  it.each([
    ['double-kick', 2],
    ['triple-dive', 3],
    ['twin-beam', 2],
    ['tachyon-cutter', 2],
    ['population-bomb', 10],
  ] as const)('%s performs %i independent hits and spends one PP', (name, hits) => {
    const state = setup(load(name))
    const result = executeMove(state)
    expect(result.events.filter((event) => event.type === 'damage' && event.pokemon === 'target')).toHaveLength(hits)
    expect(result.state.player.roster[0].moves[0].pp).toBe(state.player.roster[0].moves[0].pp - 1)
  })
  it.each([
    [0.1, 2],
    [0.5, 3],
    [0.8, 4],
    [0.9, 5],
  ])('uses the modern multi-hit distribution at random value %s', (roll, hits) => {
    expect(
      executeMove(setup(load('bullet-seed')), roll).events.filter((event) => event.type === 'damage'),
    ).toHaveLength(hits)
  })
  it('stops subsequent Population Bomb hits on a missed accuracy check', () => {
    const state = setup(load('population-bomb'))
    const rolls = [0.5, 0.5, 0.5, 0.99]
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      () => rolls.shift() ?? 0.5,
    )
    expect(result.events.filter((event) => event.type === 'damage')).toHaveLength(1)
  })
  it('breaks Substitute with one hit and damages the Pokémon with the next', () => {
    const state = setup(load('double-kick'))
    state.opponent.roster[0].substituteHp = 1
    const result = executeMove(state)
    expect(result.events.filter((event) => event.type === 'substituteDamage')).toHaveLength(1)
    expect(result.events.filter((event) => event.type === 'damage')).toHaveLength(1)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(10000)
  })
  it('reads independent flinch metadata and prevents the slower target from acting', () => {
    const result = executeMove(setup(load('iron-head')), 0.1)
    expect(result.events).toContainEqual({ type: 'status', pokemon: 'target', status: 'flinch' })
    expect(result.events).toContainEqual({ type: 'failed', pokemon: 'target' })
  })
  it.each(['frost-breath', 'storm-throw', 'wicked-blow', 'flower-trick'])('%s guarantees a critical hit', (name) => {
    const state = setup(load(name))
    state.player.roster[0].moves[0].data.accuracy = null
    expect(executeMove(state, 0.99).events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'damage', critical: true })]),
    )
  })
  it('uses the critical-rate metadata for Slash', () => {
    expect(executeMove(setup(load('slash')), 0.1).events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'damage', critical: true })]),
    )
  })
  it.each([
    ['sonic-boom', 20],
    ['dragon-rage', 40],
    ['seismic-toss', 100],
  ] as const)('%s deals exactly %i damage', (name, damage) => {
    expect(executeMove(setup(load(name))).state.opponent.roster[0].hp).toBe(10000 - damage)
  })
  it('does not apply a second power-based hit to Ruination', () => {
    const result = executeMove(setup(load('ruination')))
    expect(result.state.opponent.roster[0].hp).toBe(5000)
    expect(result.events.filter((event) => event.type === 'damage')).toHaveLength(1)
  })
  it('recoil uses actual HP removed and still applies during Heal Block', () => {
    const state = setup(load('double-edge'))
    state.opponent.roster[0].hp = 3
    state.player.roster[0].volatile['heal-block'] = 3
    expect(executeMove(state).state.player.roster[0].hp).toBe(state.player.roster[0].hp - 1)
  })
  it.each([
    ['torch-song', 'specialAttack', 1],
    ['aqua-step', 'speed', 1],
    ['make-it-rain', 'specialAttack', -1],
  ] as const)('%s applies missing API metadata to the user', (name, stat, change) => {
    const result = executeMove(setup(load(name)))
    expect(result.state.player.roster[0].stages[stat]).toBe(change)
    expect(result.state.opponent.roster[0].stages[stat]).toBe(0)
  })
  it.each([
    ['return', 102],
    ['frustration', 1],
    ['eruption', 75],
    ['water-spout', 75],
    ['dragon-energy', 75],
    ['wring-out', 60],
    ['crush-grip', 60],
    ['hard-press', 50],
    ['stored-power', 80],
    ['power-trip', 80],
    ['electro-ball', 150],
    ['gyro-ball', 7],
  ] as const)('%s resolves its variable power as %i in a controlled scenario', (name, power) => {
    const state = setup(load(name))
    state.player.roster[0].maxHp = 200
    state.player.roster[0].hp = 100
    state.player.roster[0].stages.attack = 2
    state.player.roster[0].stages.defense = 1
    state.opponent.roster[0].hp = 5000
    state.opponent.roster[0].stats[5] = 250
    state.opponent.roster[0].pokemon.types = ['water']
    const baseline = structuredClone(state)
    baseline.player.roster[0].moves[0].data = { ...load(name), name: 'baseline', power }
    const result = executeMove(state)
    expect(result.state.opponent.roster[0].hp).toBe(executeMove(baseline).state.opponent.roster[0].hp)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(5000)
  })
  it('Fillet Away pays half maximum HP and fails at or below that cost', () => {
    const state = setup(load('fillet-away'))
    const cost = Math.floor(state.player.roster[0].maxHp / 2)
    expect(executeMove(state).state.player.roster[0].hp).toBe(state.player.roster[0].hp - cost)
    state.player.roster[0].hp = cost
    const failed = executeMove(state)
    expect(failed.state.player.roster[0].hp).toBe(cost)
    expect(failed.state.player.roster[0].stages.attack).toBe(0)
  })
})

describe('requested battle rules', () => {
  it.each(['guillotine', 'horn-drill', 'fissure', 'sheer-cold'])(
    '%s immediately faints a hit target at any HP',
    (name) => {
      const state = setup(load(name))
      const result = executeMove(state, 0)
      expect(result.state.opponent.roster[0].hp).toBe(0)
      expect(result.events).toContainEqual({ type: 'faint', pokemon: 'target' })
      expect(result.events).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'damage', amount: 10000 })]),
      )
    },
  )
  it.each(['guillotine', 'horn-drill', 'fissure', 'sheer-cold'])('%s respects Focus Sash and Sturdy', (name) => {
    const state = setup(load(name))
    state.opponent.roster[0].item = { name: 'focus-sash', names: [], descriptions: [], sprite: null }
    const survived = executeMove(state, 0).state.opponent.roster[0]
    expect(survived.hp).toBe(1)
    expect(survived.item).toBeNull()
    state.opponent.roster[0].ability.name = 'sturdy'
    expect(executeMove(state, 0).state.opponent.roster[0].hp).toBe(10000)
  })
  it.each(['explosion', 'self-destruct', 'misty-explosion'])(
    '%s faints its user even against Protect, except when Damp prevents execution',
    (name) => {
      const state = setup(load(name))
      state.opponent.roster[0].volatile.protect = 1
      expect(executeMove(state).state.player.roster[0].hp).toBe(0)
      state.opponent.roster[0].ability.name = 'damp'
      expect(executeMove(state).state.player.roster[0].hp).toBe(state.player.roster[0].hp)
    },
  )
  it.each(['jump-kick', 'high-jump-kick', 'axe-kick', 'supercell-slam'])(
    '%s crashes after a miss or Protect, but not on a hit',
    (name) => {
      const state = setup(load(name))
      const hp = state.player.roster[0].hp
      state.player.roster[0].stages.accuracy = -6
      expect(executeMove(state, 0.99).state.player.roster[0].hp).toBe(hp - Math.floor(hp / 2))
      state.player.roster[0].stages.accuracy = 0
      expect(executeMove(state, 0).state.player.roster[0].hp).toBe(hp)
      state.opponent.roster[0].volatile.protect = 1
      expect(executeMove(state, 0).state.player.roster[0].hp).toBe(hp - Math.floor(hp / 2))
      state.player.roster[0].ability.name = 'magic-guard'
      expect(executeMove(state, 0).state.player.roster[0].hp).toBe(hp)
    },
  )
  it.each([
    ['wide-guard', 'surf', true],
    ['wide-guard', 'tackle', false],
    ['quick-guard', 'quick-attack', true],
    ['quick-guard', 'tackle', false],
  ] as const)('%s blocks %s in singles: %s', (guard, attack, blocked) => {
    const state = setup(load(guard))
    state.opponent.roster[0].moves[0] = { data: load(attack), pp: 10 }
    const hp = state.player.roster[0].hp
    const result = executeMove(state)
    if (blocked) expect(result.state.player.roster[0].hp).toBe(hp)
    else expect(result.state.player.roster[0].hp).toBeLessThan(hp)
    expect(result.state.player.roster[0].volatile[guard]).toBeUndefined()
  })
  it('Sky Drop carries a Flying target but releases it without damage', () => {
    const state = setup(load('sky-drop'))
    state.opponent.roster[0].pokemon.types = ['flying']
    const first = executeMove(state).state
    expect(first.opponent.roster[0].skyDropSourceId).toBeDefined()
    const second = executeMove(first)
    expect(second.state.opponent.roster[0].hp).toBe(10000)
    expect(second.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
  })
  it.each(['take-heart', 'jungle-healing'])('%s cures the user instead of affecting its opponent', (name) => {
    const state = setup(load(name))
    const user = state.player.roster[0]
    user.status = 'burn'
    user.hp = 100
    const result = executeMove(state).state
    expect(result.player.roster[0].status).toBeNull()
    expect(result.opponent.roster[0].status).toBeNull()
    if (name === 'take-heart') {
      expect(result.player.roster[0].stages.specialAttack).toBe(1)
      expect(result.player.roster[0].stages.specialDefense).toBe(1)
    } else expect(result.player.roster[0].hp).toBeGreaterThan(100)
  })
  it.each(['heal-pulse', 'floral-healing'])('%s heals the selected opponent and fails behind Substitute', (name) => {
    const state = setup(load(name))
    state.opponent.roster[0].hp = 100
    const result = executeMove(state).state
    expect(result.opponent.roster[0].hp).toBe(5100)
    expect(result.player.roster[0].hp).toBe(state.player.roster[0].hp)
    state.opponent.roster[0].substituteHp = 50
    expect(executeMove(state).state.opponent.roster[0].hp).toBe(100)
  })
  it.each(['counter', 'mirror-coat', 'metal-burst', 'comeuppance'])(
    '%s reflects the last direct hit, not ordinary base power',
    (name) => {
      const state = setup(load(name))
      state.player.roster[0].hp = state.player.roster[0].maxHp = 10000
      state.opponent.roster[0].stats[5] = 2000
      state.opponent.roster[0].moves[0] = { data: load(name === 'mirror-coat' ? 'water-gun' : 'tackle'), pp: 10 }
      const result = executeMove(state)
      const received = 10000 - result.state.player.roster[0].hp
      expect(received).toBeGreaterThan(0)
      expect(10000 - result.state.opponent.roster[0].hp).toBe(
        Math.floor(received * (['counter', 'mirror-coat'].includes(name) ? 2 : 1.5)),
      )
      state.opponent.roster[0].moves[0] = { data: load('splash'), pp: 10 }
      expect(executeMove(state).state.opponent.roster[0].hp).toBe(10000)
    },
  )
  it.each(['false-swipe', 'hold-back'])('%s leaves a direct target at one HP', (name) => {
    const state = setup(load(name))
    state.opponent.roster[0].hp = 2
    expect(executeMove(state).state.opponent.roster[0].hp).toBe(1)
    state.opponent.roster[0].hp = 1
    state.opponent.roster[0].substituteHp = 10
    expect(executeMove(state).state.opponent.roster[0].substituteHp).toBe(0)
  })
  it.each(['power-trick', 'power-shift'])(
    '%s swaps stored physical stats, toggles off, and ends on switching',
    (name) => {
      const state = setup(load(name))
      state.player.roster[0].stats[1] = 200
      state.player.roster[0].stats[2] = 100
      const first = executeMove(state).state
      expect(first.player.roster[0].stats.slice(1, 3)).toEqual([100, 200])
      expect(executeMove(first).state.player.roster[0].stats.slice(1, 3)).toEqual([200, 100])
      const switched = resolveBattleTurn(
        first,
        { kind: 'switch', index: 1 },
        { kind: 'move', index: 0 },
        () => 0.5,
      ).state
      expect(switched.player.roster[0].stats.slice(1, 3)).toEqual([200, 100])
    },
  )
  it.each(['power-swap', 'guard-swap', 'heart-swap', 'psych-up', 'topsy-turvy'])(
    '%s manipulates stages directly despite Contrary',
    (name) => {
      const state = setup(load(name))
      state.player.roster[0].stages.attack = -2
      state.opponent.roster[0].stages.attack = 3
      state.player.roster[0].stages.defense = -1
      state.opponent.roster[0].stages.defense = 2
      state.opponent.roster[0].ability.name = 'contrary'
      const result = executeMove(state).state
      if (name === 'topsy-turvy') {
        expect(result.opponent.roster[0].stages.attack).toBe(-3)
        expect(result.opponent.roster[0].stages.defense).toBe(-2)
      } else {
        if (name !== 'guard-swap') expect(result.player.roster[0].stages.attack).toBe(3)
        if (name !== 'power-swap') expect(result.player.roster[0].stages.defense).toBe(2)
        if (name !== 'psych-up' && name !== 'guard-swap') expect(result.opponent.roster[0].stages.attack).toBe(-2)
      }
    },
  )
  it.each(['focus-energy', 'laser-focus'])('%s modifies subsequent critical hits', (name) => {
    const state = executeMove(setup(load(name))).state
    state.player.roster[0].moves[0].data = { ...load('tackle'), critRate: 1 }
    const result = executeMove(state)
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'damage', pokemon: 'target', critical: true }))
    if (name === 'laser-focus') expect(result.state.player.roster[0].volatile['laser-focus']).toBeUndefined()
  })
  it('Endure survives a lethal direct hit at one HP and expires at the end of the turn', () => {
    const state = setup(load('endure'))
    state.player.roster[0].hp = 2
    state.opponent.roster[0].moves[0] = { data: load('tackle'), pp: 10 }
    const result = executeMove(state)
    expect(result.state.player.roster[0].hp).toBe(1)
    expect(result.state.player.roster[0].volatile.endure).toBeUndefined()
  })
  it.each([
    ['freeze-dry', ['water'], 2],
    ['freeze-dry', ['water', 'flying'], 4],
    ['flying-press', ['grass'], 2],
    ['flying-press', ['rock'], 1],
    ['thousand-arrows', ['flying', 'steel'], 1],
  ] as const)('%s uses its special effectiveness against %j', (name, types, expected) => {
    const state = setup(load(name))
    state.opponent.roster[0].pokemon.types = [...types]
    expect(battleMoveEffectiveness(load(name), state.opponent.roster[0], state.player.roster[0])).toBe(expected)
  })
  it.each([
    ['flail', 200],
    ['reversal', 200],
    ['acrobatics', 110],
    ['punishment', 60],
    ['trump-card', 200],
    ['last-respects', 200],
    ['rage-fist', 200],
  ] as const)('%s resolves its conditional base power (%i)', (name, power) => {
    const state = setup(load(name))
    if (['flail', 'reversal'].includes(name)) state.player.roster[0].hp = 1
    if (name === 'trump-card') state.player.roster[0].moves[0].pp = 1
    if (name === 'last-respects') state.player.totalFainted = 3
    if (name === 'rage-fist') state.player.roster[0].hitsTaken = 3
    state.opponent.roster[0].pokemon.types = ['water']
    const baseline = structuredClone(state)
    baseline.player.roster[0].moves[0].data = { ...load(name), name: 'tackle', power }
    const damage = (result: ReturnType<typeof executeMove>) =>
      result.events.find((event) => event.type === 'damage' && event.pokemon === 'target')
    expect(damage(executeMove(state))).toEqual(damage(executeMove(baseline)))
    expect(damage(executeMove(state))).toBeDefined()
  })
  it.each(['dream-eater', 'poltergeist'])('%s fails when its required target condition is absent', (name) => {
    const state = setup(load(name))
    state.opponent.roster[0].pokemon.types = ['water']
    expect(executeMove(state).state.opponent.roster[0].hp).toBe(10000)
    if (name === 'dream-eater') {
      state.opponent.roster[0].status = 'sleep'
      state.opponent.roster[0].sleepTurns = 2
    } else state.opponent.roster[0].item = { name: 'choice-scarf', names: [], descriptions: [], sprite: null }
    expect(executeMove(state).state.opponent.roster[0].hp).toBeLessThan(10000)
  })
  it('Sleep Talk may call a move with zero PP without spending its PP or changing the recorded move', () => {
    const state = setup(load('sleep-talk'))
    state.player.roster[0].status = 'sleep'
    state.player.roster[0].sleepTurns = 2
    state.player.roster[0].moves[1] = { data: load('tackle'), pp: 0 }
    const result = executeMove(state, 0)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(10000)
    expect(result.state.player.roster[0].moves[1].pp).toBe(0)
    expect(result.state.player.roster[0].lastMoveIndex).toBe(0)
  })
  it.each(['psyshock', 'psystrike', 'secret-sword'])(
    '%s targets Defense while retaining its special category',
    (name) => {
      const state = setup(load(name))
      const damage = (value: typeof state) => 10000 - executeMove(value).state.opponent.roster[0].hp
      const base = damage(state)
      state.opponent.roster[0].stats[4] *= 10
      expect(damage(state)).toBe(base)
      state.opponent.roster[0].stats[2] *= 10
      expect(damage(state)).toBeLessThan(base)
    },
  )
  it.each(['body-press', 'foul-play'])('%s uses its specified offensive stat', (name) => {
    const state = setup(load(name))
    const damage = (value: typeof state) => 10000 - executeMove(value).state.opponent.roster[0].hp
    const base = damage(state)
    state.player.roster[0].stats[1] *= 10
    expect(damage(state)).toBe(base)
    if (name === 'body-press') state.player.roster[0].stats[2] *= 3
    else state.opponent.roster[0].stats[1] *= 3
    expect(damage(state)).toBeGreaterThan(base)
  })
  it.each(['sacred-sword', 'chip-away', 'darkest-lariat'])(
    '%s ignores both positive and negative defensive stages',
    (name) => {
      const state = setup(load(name))
      const base = executeMove(state).state.opponent.roster[0].hp
      for (const stage of [-6, 6]) {
        state.opponent.roster[0].stages.defense = stage
        expect(executeMove(state).state.opponent.roster[0].hp).toBe(base)
      }
    },
  )
  it('Baton Pass transfers stages, Substitute and copyable conditions, excluding Disable', () => {
    const state = setup(load('baton-pass'))
    state.player.roster[0].stages.attack = 3
    state.player.roster[0].substituteHp = 50
    state.player.roster[0].volatile['aqua-ring'] = -1
    state.player.roster[0].volatile.disable = 3
    const first = executeMove(state).state
    const result = resolveBattleTurn(first, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5).state
    expect(result.player.roster[1].stages.attack).toBe(3)
    expect(result.player.roster[1].substituteHp).toBe(50)
    expect(result.player.roster[1].volatile['aqua-ring']).toBe(-1)
    expect(result.player.roster[1].volatile.disable).toBeUndefined()
    expect(result.player.roster[0].stages.attack).toBe(0)
  })
  it('Shed Tail spends half maximum HP and passes only its substitute', () => {
    const state = setup(load('shed-tail'))
    const hp = state.player.roster[0].hp
    state.player.roster[0].stages.attack = 3
    const first = executeMove(state).state
    expect(first.phase).toBe('player-switch')
    expect(first.player.roster[0].hp).toBe(hp - Math.ceil(hp / 2))
    const result = resolveBattleTurn(first, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5).state
    expect(result.player.roster[1].substituteHp).toBe(Math.floor(hp / 4))
    expect(result.player.roster[1].stages.attack).toBe(0)
    state.player.roster[0].hp = Math.ceil(hp / 2)
    expect(executeMove(state).state.phase).toBe('choice')
    expect(executeMove(state).state.player.roster[0].hp).toBe(Math.ceil(hp / 2))
  })
  it.each([0, 0.99])('Roar selects a random living reserve and respects Ingrain (roll %f)', (roll) => {
    const state = setup(load('roar'))
    state.opponent.roster[2].hp = 0
    const result = executeMove(state, roll).state
    expect(result.opponent.active).toBe(roll === 0 ? 1 : 5)
    expect(result.phase).toBe('choice')
    state.opponent.roster[0].volatile.ingrain = -1
    expect(executeMove(state, roll).state.opponent.active).toBe(0)
  })
  it.each([true, false])('Thunder Fang rolls paralysis and flinch independently (paralysis %s)', (paralysis) => {
    const state = setup(load('thunder-fang'))
    const rolls = [0, 0.5, 0.5, paralysis ? 0 : 0.99, paralysis ? 0.99 : 0]
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      () => rolls.shift() ?? 0.5,
    )
    expect(result.state.opponent.roster[0].status).toBe(paralysis ? 'paralysis' : null)
    const flinch = result.events.some((event) => event.type === 'status' && event.status === 'flinch')
    expect(flinch).toBe(!paralysis)
  })
  it('Ancient Power makes one roll for its complete five-stat boost', () => {
    const state = setup(load('ancient-power'))
    const rolls = [0, 0.5, 0.5, 0]
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      () => rolls.shift() ?? 0.99,
    )
    expect(result.state.player.roster[0].stages).toMatchObject({
      attack: 1,
      defense: 1,
      specialAttack: 1,
      specialDefense: 1,
      speed: 1,
    })
  })
  it.each(['run-away', 'shield-dust', 'sheer-force'])(
    'applies user secondary boosts per hit, respecting %s',
    (ability) => {
      const state = setup({ ...load('power-up-punch'), minHits: 2, maxHits: 2 })
      if (ability === 'sheer-force') state.player.roster[0].ability.name = ability
      else state.opponent.roster[0].ability.name = ability
      expect(executeMove(state).state.player.roster[0].stages.attack).toBe(ability === 'sheer-force' ? 0 : 2)
    },
  )
  it.each(['run-away', 'serene-grace'])('applies %s to canonical secondary chances', (ability) => {
    const state = setup(load('scald'))
    state.player.roster[0].ability.name = ability
    expect(executeMove(state, 0.4).state.opponent.roster[0].status).toBe(ability === 'serene-grace' ? 'burn' : null)
  })
  it.each([
    [0, 'poison'],
    [0.4, 'paralysis'],
    [0.99, 'sleep'],
  ] as const)('Dire Claw chooses one status with roll %f', (roll, status) => {
    const state = setup(load('dire-claw'))
    const rolls = [0, 0.5, 0.5, 0, roll]
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      () => rolls.shift() ?? 0.5,
    )
    expect(result.state.opponent.roster[0].status).toBe(status)
  })
  it('OHKO still respects misses, type immunity, Protect and Substitute interception', () => {
    const state = setup(load('guillotine'))
    expect(executeMove(state, 0.99).state.opponent.roster[0].hp).toBe(10000)
    state.opponent.roster[0].pokemon.types = ['ghost']
    expect(executeMove(state, 0).state.opponent.roster[0].hp).toBe(10000)
    state.opponent.roster[0].pokemon.types = ['normal']
    state.opponent.roster[0].volatile.protect = 1
    expect(executeMove(state, 0).state.opponent.roster[0].hp).toBe(10000)
    delete state.opponent.roster[0].volatile.protect
    state.opponent.roster[0].substituteHp = 50
    const substitute = executeMove(state, 0).state.opponent.roster[0]
    expect(substitute.hp).toBe(10000)
    expect(substitute.substituteHp).toBe(0)
  })
  it('Sky Drop spends its first turn carrying, blocks the defender and damages on release without another PP', () => {
    const state = setup(load('sky-drop'))
    state.opponent.roster[0].moves[0] = { data: load('tackle'), pp: 10 }
    state.player.roster[0].item = { name: 'power-herb', names: [], descriptions: [], sprite: null }
    const first = executeMove(state)
    expect(first.state.opponent.roster[0].hp).toBe(10000)
    expect(first.state.player.roster[0].hp).toBe(state.player.roster[0].hp)
    expect(first.state.player.roster[0].chargingMoveIndex).toBe(0)
    expect(first.state.opponent.roster[0].moves[0].pp).toBe(10)
    expect(first.state.player.roster[0].item?.name).toBe('power-herb')
    const release = executeMove(first.state)
    expect(release.state.opponent.roster[0].hp).toBeLessThan(10000)
    expect(release.state.player.roster[0].hp).toBeLessThan(state.player.roster[0].hp)
    expect(release.state.player.roster[0].moves[0].pp).toBe(state.player.roster[0].moves[0].pp - 1)
    expect(release.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
    expect(release.state.player.roster[0].skyDropTargetId).toBeUndefined()
  })
  it.each([false, true])(
    'prevents the carried defender from switching, including during recharge (%s)',
    (recharging) => {
      const first = executeMove(setup(load('sky-drop'))).state
      first.opponent.roster[0].recharging = recharging
      const result = resolveBattleTurn(first, { kind: 'move', index: 0 }, { kind: 'switch', index: 1 }, () => 0.5)
      expect(result.state.opponent.active).toBe(0)
      expect(result.state.opponent.roster[0].hp).toBeLessThan(10000)
      expect(result.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
    },
  )
  it('Sky Drop carries without an accuracy check, then checks accuracy on release', () => {
    const state = setup(load('sky-drop'))
    state.player.roster[0].stages.accuracy = -6
    const first = executeMove(state, 0.5).state
    expect(first.player.roster[0].chargingMoveIndex).toBe(0)
    expect(executeMove(first, 0.5).state.opponent.roster[0].hp).toBe(10000)
    state.opponent.roster[0].volatile.protect = 1
    expect(executeMove(state).state.opponent.roster[0].skyDropSourceId).toBeUndefined()
  })
  it('releases a carried target if the carrier cannot execute its second turn', () => {
    const state = executeMove(setup(load('sky-drop'))).state
    state.player.roster[0].status = 'sleep'
    state.player.roster[0].sleepTurns = 2
    state.opponent.roster[0].moves[0] = { data: load('tackle'), pp: 10 }
    const result = executeMove(state)
    expect(result.state.opponent.roster[0].hp).toBe(10000)
    expect(result.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
    expect(result.state.player.roster[0].hp).toBeLessThan(state.player.roster[0].hp)
  })
  it.each(['gigaton-hammer', 'blood-moon'])(
    '%s cannot be selected twice, including after a miss or Protect',
    (name) => {
      for (const mode of ['hit', 'miss', 'protected']) {
        const state = setup(load(name))
        if (mode === 'miss') state.player.roster[0].stages.accuracy = -6
        if (mode === 'protected') state.opponent.roster[0].volatile.protect = 1
        const first = executeMove(state, mode === 'miss' ? 0.99 : 0.5).state
        expect(legalBattleMoveIndexes(first.player.roster[0])).not.toContain(0)
        const second = executeMove(first)
        expect(second.state.opponent.roster[0].hp).toBe(first.opponent.roster[0].hp)
        expect(second.state.player.roster[0].moves[0].pp).toBe(first.player.roster[0].moves[0].pp)
        expect(second.state.player.roster[0].recharging).toBeUndefined()
      }
    },
  )
  it('a different move or switching breaks a consecutive-use sequence', () => {
    const first = executeMove(setup(load('gigaton-hammer'))).state
    const other = resolveBattleTurn(first, { kind: 'move', index: 1 }, { kind: 'move', index: 0 }, () => 0.5).state
    expect(executeMove(other).state.opponent.roster[0].hp).toBeLessThan(other.opponent.roster[0].hp)
    const switched = resolveBattleTurn(first, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5).state
    expect(switched.player.roster[0].previousMoveExecution).toBeUndefined()
  })
  it.each([
    [-6, 3 / 9],
    [-5, 3 / 8],
    [-4, 3 / 7],
    [-3, 3 / 6],
    [-2, 3 / 5],
    [-1, 3 / 4],
    [0, 1],
    [1, 4 / 3],
    [2, 5 / 3],
    [3, 2],
    [4, 7 / 3],
    [5, 8 / 3],
    [6, 3],
  ])('uses the accuracy/evasion stage multiplier at stage %i', (stage, multiplier) => {
    const move = { ...load('tackle'), accuracy: 20 }
    const state = setup(move)
    const user = state.player.roster[0],
      target = state.opponent.roster[0]
    user.stages.accuracy = stage
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(Math.floor(20 * multiplier) / 100)
    user.stages.accuracy = 0
    target.stages.evasion = stage
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(Math.floor(20 / multiplier) / 100)
  })
  it('subtracts evasion from accuracy stages, truncates the percentage, and caps the final probability', () => {
    const state = setup(load('tackle'))
    const user = state.player.roster[0],
      target = state.opponent.roster[0],
      move = user.moves[0].data
    user.stages.accuracy = -2
    target.stages.evasion = 2
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.42)
    user.stages.accuracy = 6
    target.stages.evasion = -6
    expect(battleHitProbability(move, user, target, state.field)).toBe(1)
    user.stages.accuracy = 0
    target.stages.evasion = 6
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.33)
    expect(executeMove(state, 0.34).state.opponent.roster[0].hp).toBe(10000)
    expect(executeMove(state, 0.32).state.opponent.roster[0].hp).toBeLessThan(10000)
  })
  it.each([
    ['snow-cloak', 'snow'],
    ['sand-veil', 'sandstorm'],
  ] as const)('stacks Bright Powder with %s only in %s', (ability, weather) => {
    const state = setup(load('tackle'))
    const user = state.player.roster[0],
      target = state.opponent.roster[0],
      move = user.moves[0].data
    target.stages.evasion = 6
    target.item = { name: 'bright-powder', names: [], descriptions: [], sprite: null }
    target.ability.name = ability
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.297)
    state.field.weather = weather
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.2376)
    expect(battleHitProbability({ ...move, accuracy: null }, user, target, state.field)).toBe(1)
  })
  it('parses and applies accuracy/evasion changes, clamps stages, and resets them on switching and Haze', () => {
    const sand = setup(load('sand-attack'))
    sand.opponent.roster[0].stages.accuracy = -6
    expect(executeMove(sand).state.opponent.roster[0].stages.accuracy).toBe(-6)
    sand.opponent.roster[0].stages.accuracy = 0
    expect(executeMove(sand).state.opponent.roster[0].stages.accuracy).toBe(-1)
    const raised = executeMove(setup(load('double-team'))).state
    expect(raised.player.roster[0].stages.evasion).toBe(1)
    const switched = resolveBattleTurn(
      raised,
      { kind: 'switch', index: 1 },
      { kind: 'move', index: 0 },
      () => 0.5,
    ).state
    expect(switched.player.roster[0].stages.evasion).toBe(0)
    raised.player.roster[0].moves[0].data = load('haze')
    expect(executeMove(raised).state.player.roster[0].stages.evasion).toBe(0)
  })
})

// Report generation is opt-in and cannot turn unresolved mechanics into passing assertions.
afterAll(() => {
  if (!process.env.BATTLE_AUDIT_REPORT) return
  const scenarioGroups: [string, string[]][] = [
    ['generation-ix-multistrike-counts-power-accuracy-and-hit-log', Object.keys(multistrikeMoves)],
    ['ohko-level-accuracy-and-survival', ['guillotine', 'horn-drill', 'fissure', 'sheer-cold']],
    ['carrying-release-and-switch-restriction', ['sky-drop']],
    ['selection-after-hit-miss-and-protect', ['gigaton-hammer', 'blood-moon']],
    ['unconditional-sacrifice-protect-and-damp', ['explosion', 'self-destruct', 'misty-explosion']],
    ['crash-on-miss-protect-and-magic-guard', ['jump-kick', 'high-jump-kick', 'axe-kick', 'supercell-slam']],
    ['singles-guard-target-and-priority', ['wide-guard', 'quick-guard']],
    ['cure-and-user-target', ['take-heart', 'jungle-healing', 'lunar-blessing']],
    ['opponent-healing-and-substitute', ['heal-pulse', 'floral-healing']],
    ['last-direct-hit-and-no-hit-failure', ['counter', 'mirror-coat', 'metal-burst', 'comeuppance']],
    ['survival-and-substitute', ['false-swipe', 'hold-back']],
    ['stored-stat-toggle-and-switch-reset', ['power-trick', 'power-shift']],
    ['direct-stage-manipulation-and-contrary', ['power-swap', 'guard-swap', 'heart-swap', 'psych-up', 'topsy-turvy']],
    ['subsequent-critical-hit', ['focus-energy', 'laser-focus']],
    ['lethal-hit-survival-and-expiry', ['endure']],
    ['special-type-effectiveness', ['freeze-dry', 'flying-press', 'thousand-arrows']],
    [
      'conditional-base-power',
      ['flail', 'reversal', 'acrobatics', 'punishment', 'trump-card', 'last-respects', 'rage-fist'],
    ],
    ['target-eligibility', ['dream-eater', 'poltergeist']],
    ['specified-offensive-or-defensive-stat', ['body-press', 'foul-play', 'psyshock', 'psystrike', 'secret-sword']],
    ['ignore-defensive-stages', ['sacred-sword', 'chip-away', 'darkest-lariat']],
    ['calling-zero-pp-without-consuming-called-pp', ['sleep-talk']],
    ['passing-stages-substitute-and-copyable-conditions', ['baton-pass']],
    ['substitute-cost-transfer-and-failure', ['shed-tail']],
    ['independent-paralysis-and-flinch', ['thunder-fang']],
    ['correlated-five-stat-boost', ['ancient-power']],
    ['per-hit-user-secondary-boost-and-suppression', ['power-up-punch']],
    ['secondary-chance-and-serene-grace', ['scald']],
    ['random-status-selection', ['dire-claw']],
    ['random-eligible-replacement-and-ingrain', ['roar']],
  ]
  const rows = apiMoves.map((payload, index) => {
    const move = parseBattleMove(payload)
    const reference = referenceSnapshot.records[index].reference
    const timing = supplementalMoveTimings[move.name]
    const requirements = reference
      ? Object.entries(reference)
          .filter(
            ([key, value]) =>
              ![
                'num',
                'name',
                'accuracy',
                'basePower',
                'category',
                'pp',
                'priority',
                'target',
                'type',
                'contestType',
                'isNonstandard',
                'zMove',
                'maxMove',
              ].includes(key) && value !== null,
          )
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      : ['No matching reference ID (versioned/Z variant requires individual verification).']
    const formatExclusion = Object.entries(singlesExclusions).find(([name]) => name === move.name)?.[1] ?? null
    const gaps: string[] = []
    if (formatExclusion) gaps.push(`Singles restriction verified: ${formatExclusion}; move fails without an effect`)
    if (!reference) gaps.push('Reference ID unavailable')
    if (reference && JSON.stringify(reference).includes('callbackSource'))
      gaps.push(
        'Conditional callbacks require dedicated scenario coverage; presence of a local handler does not prove equivalence',
      )
    if (reference && ('isZ' in reference || 'isMax' in reference))
      gaps.push('Intentional format exclusion: Z/Max moves fail; transformation systems are not enabled')
    if (reference && reference.selfdestruct && reference.selfdestruct !== 'always')
      gaps.push('Conditional self-sacrifice and replacement timing require dedicated coverage')
    if (reference && 'hasCrashDamage' in reference)
      gaps.push(
        'Crash damage on miss/Protect and Magic Guard verified; remaining failure interactions require coverage',
      )
    if (reference && 'forceSwitch' in reference)
      gaps.push(
        'Forced replacement uses the random eligible reserve pool; remaining switch interactions require coverage',
      )
    if (reference && 'secondaries' in reference && !move.secondaries)
      gaps.push('Conditional secondary callbacks require an explicit handler and scenario coverage')
    if (reference && 'selfSwitch' in reference && reference.selfSwitch === 'copyvolatile')
      gaps.push(
        'Baton Pass transfers stages, Substitute and modeled copyable conditions; unmodeled conditions still require implementation',
      )
    if (payload.meta === null && !supplementalMoveMetadata[move.name])
      gaps.push('PokéAPI metadata absent; supplemental effect/timing alone is not a complete behavior specification')
    if (!gaps.length)
      gaps.push(
        'Baseline execution tested; full interaction parity with items, abilities, target rules and cartridge rounding is not certified',
      )
    return {
      id: payload.id,
      singlesExclusion: formatExclusion,
      verifiedScenarios: [
        'baseline-state-invariants',
        ...(formatExclusion ? ['singles-format-failure'] : []),
        ...scenarioGroups.filter(([, names]) => names.includes(move.name)).map(([scenario]) => scenario),
      ],
      multistrike: multistrikeMoves[move.name] ?? null,
      canonicalFlags: Object.entries(moveFlags).find(([name]) => name === move.name)?.[1] ?? [],
      name: move.name,
      power: move.power,
      accuracy: move.accuracy,
      damageClass: move.damageClass,
      ailment: move.ailment,
      ailmentChance: move.ailmentChance,
      statChanges: move.statChanges,
      statChance: move.statChance,
      drain: move.drain,
      healing: move.healing,
      hits: [move.minHits, move.maxHits],
      critRate: move.critRate,
      flinchChance: move.flinchChance,
      independentSecondaries: move.secondaries ?? [],
      chargeTurns: timing?.chargeTurns ?? 0,
      rechargeTurns: timing?.rechargeTurns ?? 0,
      carriesTarget: timing?.carriesTarget ?? false,
      preventsConsecutiveUse: timing?.preventsConsecutiveUse ?? false,
      apiTurnRange: [payload.meta?.min_turns ?? null, payload.meta?.max_turns ?? null],
      supplementalEffect: supplementalMoveEffect(move.name),
      supplementalDamage: supplementalMoveDamage[move.name] ?? null,
      referenceRequirements: requirements,
      findings: gaps,
      apiEffectDescriptions: payload.effect_entries
        .filter((entry) => entry.language.name === 'en')
        .map((entry) => entry.effect),
      apiFlavorText: payload.flavor_text_entries.map((entry) => entry.flavor_text),
      verdict: 'not-certified',
    }
  })
  mkdirSync('docs', { recursive: true })
  writeFileSync(
    'docs/battle-move-audit.json',
    JSON.stringify(
      { scope: 'All 919 PokéAPI IDs 1–919; IDs >10000 excluded', referenceSha256: referenceSnapshot.sha256, rows },
      null,
      2,
    ) + '\n',
  )
  const escape = (text: string) => text.replaceAll('|', '\\|').replaceAll('\n', ' ')
  writeFileSync(
    'docs/battle-move-audit.md',
    [
      '# Battle move audit',
      '',
      'Scope: all 919 PokéAPI moves (IDs 1–919). IDs above 10000 are excluded. No ID is skipped.',
      '',
      '**Result: the current engine cannot be certified correct for all 919 moves.** Every move has an offline parser/execution test (three turns, three random values), but those tests only establish state invariants. The findings below explicitly retain unresolved mechanics. They are not a passing conformance suite.',
      '',
      'Sources: [PokéAPI](https://pokeapi.co/docs/v2#moves), [Pokémon Showdown implementation](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts). The accompanying JSON contains every reference rule, structured effect, status probability, hit count, turn range and local supplement. Reference SHA-256: `' +
        referenceSnapshot.sha256 +
        '`.',
      '',
      'Generation policy: use the bundled Showdown base move definition and modern main-series rules, replacing former project-specific exceptions. Legends moves use the main-series version or Showdown adaptation. Z/Max moves explicitly fail; their transformation systems are outside this format.',
      '',
      'Singles scope: one active Pokémon per side. Moves requiring another active ally fail. Follow Me, Rage Powder, After You, Quash and Ally Switch also fail according to the singles reference. Effects usable in singles remain enabled: Wide Guard blocks spread-target moves even with one opponent, and Quick Guard blocks positive-priority attacks. No doubles damage reduction or allied-target effects are applied. The JSON records the format exclusion for every ID. Canonical flags are supplied for all 919 moves, including Protect, Substitute bypass, Encore restrictions and move-calling eligibility. The verifiedScenarios list in each JSON row names only the scenarios exercised; all remaining callbacks and interactions still require individual conformance review.\n\nStructured secondary effects are grouped by their canonical probabilities and applied on each successful hit. Independent groups receive separate rolls; shared multi-stat boosts receive one roll. Serene Grace, Sheer Force, Shield Dust, Substitute and direct-hit eligibility are considered. Callback-defined secondaries still require explicit handlers.\n\nGlobal limitations: complete ability/contact interactions, move-calling restrictions, precise integer rounding and remaining move-specific callbacks are not comprehensively implemented. The verifiedScenarios field is a progress ledger, not an assertion of complete conformance. No row is a claim of full correctness. “0” in the timing columns describes the local engine, not proof that the canonical move has no lockout. See conditional callbacks.',
      '',
      'Rules with dedicated regressions: OHKO uses a level gate and level-based accuracy, ignores accuracy/evasion modifiers, respects Focus Sash/Sturdy and Sheer Cold Ice immunity; Sky Drop prevents carried switches, checks accuracy on release, and deals no release damage to Flying targets; Gigaton Hammer/Blood Moon cannot be selected again after execution, including a miss or Protect; accuracy combines stages by subtraction and truncates the percentage; Encore has a fixed duration of three actions; Lunar Blessing cures status and restores one quarter of maximum HP without an evasion boost. Explosion, Self-Destruct and Misty Explosion sacrifice their user even against Protect unless Damp prevents execution. Crash moves lose half maximum HP after misses or Protect, respecting Magic Guard. These scenarios do not certify every interaction.',
      '',
      'Multistrike scope: all 32 moves in the Bulbapedia list are covered using Scarlet/Violet (Generation IX) rules; Legends: Z-A real-time changes are excluded. Fixed, variable, accuracy-dependent and party-dependent sequences have dedicated tests in battle-multistrike.test.ts. Every executed strike emits a numbered log entry, including Substitute hits; missed or cancelled strikes are not counted. Triple Axel/Kick increase power per strike; Skill Link and Loaded Dice bypass subsequent accuracy checks, Loaded Dice Population Bomb rolls 4–10 strikes, and Beat Up uses eligible party members and their original base Attack. Sequences stop on fainting or newly inflicted sleep. Color Change is deferred until the sequence ends; survival and contact effects resolve per hit. Source: [Bulbapedia multistrike moves](https://bulbapedia.bulbagarden.net/wiki/Multistrike_move), cross-checked with the pinned Showdown reference and its battle action implementation.',
      '',
      'Refresh: `python scripts/fetch-battle-moves.py`; obtain the reviewed Showdown `data/moves.ts`, then `node scripts/extract-move-reference.mjs <path>` and `node scripts/extract-move-singles-rules.mjs`; run `npm run audit:battle-moves`. Tests never fetch the network. Snapshot changes require review.',
      '',
      '| ID | Move | Power | Charge turns (local) | Recharge turns (local) | Findings |',
      '| --- | --- | --- | --- | --- | --- |',
      ...rows.map(
        (row) =>
          `| ${row.id} | ${row.name} | ${row.power ?? 'variable/status'} | ${row.chargeTurns} | ${row.rechargeTurns} | ${escape(row.findings.join('; '))} |`,
      ),
      '',
    ].join('\n'),
  )
})
