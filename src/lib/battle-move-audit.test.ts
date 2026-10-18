/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it, afterAll } from 'vitest'
import apiMoves from '../data/third-party/pokeapi-battle-moves.json'
const referenceSnapshot: {
  sha256: string
  records: { id: number; name: string; reference: Record<string, unknown> | null }[]
} = JSON.parse(readFileSync('src/data/third-party/battle-move-reference.json', 'utf8'))
import { parseBattleMove } from './battle-data'
import {
  battleHitProbability,
  createBattlePokemon,
  createBattleState,
  resolveBattleTurn,
  type BattleMove,
} from './battle'
import {
  supplementalMoveDamage,
  supplementalMoveEffect,
  supplementalMoveMetadata,
  supplementalMoveTimings,
} from './battle-move-effects'
import type { Team, TeamMember, TeamPokemon } from './teams'

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
const use = (state: ReturnType<typeof setup>, roll = 0.5) =>
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
    expect(referenceSnapshot.records.map((move) => move.id)).toEqual(apiMoves.map((move) => move.id))
    expect(referenceSnapshot.records.every((move) => move.reference !== null)).toBe(true)
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
        const result = use(state, roll)
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
    const result = use(state)
    expect(result.events.filter((event) => event.type === 'damage' && event.pokemon === 'target')).toHaveLength(hits)
    expect(result.state.player.roster[0].moves[0].pp).toBe(state.player.roster[0].moves[0].pp - 1)
  })
  it.each([
    [0.1, 2],
    [0.5, 3],
    [0.8, 4],
    [0.9, 5],
  ])('uses the modern multi-hit distribution at random value %s', (roll, hits) => {
    expect(use(setup(load('bullet-seed')), roll).events.filter((event) => event.type === 'damage')).toHaveLength(hits)
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
    const result = use(state)
    expect(result.events.filter((event) => event.type === 'substituteDamage')).toHaveLength(1)
    expect(result.events.filter((event) => event.type === 'damage')).toHaveLength(1)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(10000)
  })
  it('reads independent flinch metadata and prevents the slower target from acting', () => {
    const result = use(setup(load('iron-head')), 0.1)
    expect(result.events).toContainEqual({ type: 'status', pokemon: 'target', status: 'flinch' })
    expect(result.events).toContainEqual({ type: 'failed', pokemon: 'target' })
  })
  it.each(['frost-breath', 'storm-throw', 'wicked-blow', 'flower-trick'])('%s guarantees a critical hit', (name) => {
    const state = setup(load(name))
    state.player.roster[0].moves[0].data.accuracy = null
    expect(use(state, 0.99).events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'damage', critical: true })]),
    )
  })
  it('uses the critical-rate metadata for Slash', () => {
    expect(use(setup(load('slash')), 0.1).events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'damage', critical: true })]),
    )
  })
  it.each([
    ['sonic-boom', 20],
    ['dragon-rage', 40],
    ['seismic-toss', 100],
  ] as const)('%s deals exactly %i damage', (name, damage) => {
    expect(use(setup(load(name))).state.opponent.roster[0].hp).toBe(10000 - damage)
  })
  it('does not apply a second power-based hit to Ruination', () => {
    const result = use(setup(load('ruination')))
    expect(result.state.opponent.roster[0].hp).toBe(5000)
    expect(result.events.filter((event) => event.type === 'damage')).toHaveLength(1)
  })
  it('recoil uses actual HP removed and still applies during Heal Block', () => {
    const state = setup(load('double-edge'))
    state.opponent.roster[0].hp = 3
    state.player.roster[0].volatile['heal-block'] = 3
    expect(use(state).state.player.roster[0].hp).toBe(state.player.roster[0].hp - 1)
  })
  it.each([
    ['torch-song', 'specialAttack', 1],
    ['aqua-step', 'speed', 1],
    ['make-it-rain', 'specialAttack', -1],
  ] as const)('%s applies missing API metadata to the user', (name, stat, change) => {
    const result = use(setup(load(name)))
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
    const baseline = structuredClone(state)
    baseline.player.roster[0].moves[0].data = { ...load(name), name: 'baseline', power }
    const result = use(state)
    expect(result.state.opponent.roster[0].hp).toBe(use(baseline).state.opponent.roster[0].hp)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(5000)
  })
  it('Fillet Away pays half maximum HP and fails at or below that cost', () => {
    const state = setup(load('fillet-away'))
    const cost = Math.floor(state.player.roster[0].maxHp / 2)
    expect(use(state).state.player.roster[0].hp).toBe(state.player.roster[0].hp - cost)
    state.player.roster[0].hp = cost
    const failed = use(state)
    expect(failed.state.player.roster[0].hp).toBe(cost)
    expect(failed.state.player.roster[0].stages.attack).toBe(0)
  })
})

describe('requested battle rules', () => {
  it.each(['guillotine', 'horn-drill', 'fissure', 'sheer-cold'])(
    '%s immediately faints a hit target at any HP',
    (name) => {
      const state = setup(load(name))
      state.player.roster[0].member.level = 1
      state.opponent.roster[0].item = { name: 'focus-sash', names: [], descriptions: [], sprite: null }
      const result = use(state, 0)
      expect(result.state.opponent.roster[0].hp).toBe(0)
      expect(result.events).toContainEqual({ type: 'faint', pokemon: 'target' })
      expect(result.events).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'damage', amount: 10000 })]),
      )
    },
  )
  it('OHKO still respects misses, type immunity, Protect and Substitute interception', () => {
    const state = setup(load('guillotine'))
    expect(use(state, 0.99).state.opponent.roster[0].hp).toBe(10000)
    state.opponent.roster[0].pokemon.types = ['ghost']
    expect(use(state, 0).state.opponent.roster[0].hp).toBe(10000)
    state.opponent.roster[0].pokemon.types = ['normal']
    state.opponent.roster[0].volatile.protect = 1
    expect(use(state, 0).state.opponent.roster[0].hp).toBe(10000)
    delete state.opponent.roster[0].volatile.protect
    state.opponent.roster[0].substituteHp = 50
    const substitute = use(state, 0).state.opponent.roster[0]
    expect(substitute.hp).toBe(10000)
    expect(substitute.substituteHp).toBe(0)
  })
  it('Sky Drop spends its first turn carrying, blocks the defender and damages on release without another PP', () => {
    const state = setup(load('sky-drop'))
    state.opponent.roster[0].moves[0] = { data: load('tackle'), pp: 10 }
    state.player.roster[0].item = { name: 'power-herb', names: [], descriptions: [], sprite: null }
    const first = use(state)
    expect(first.state.opponent.roster[0].hp).toBe(10000)
    expect(first.state.player.roster[0].hp).toBe(state.player.roster[0].hp)
    expect(first.state.player.roster[0].chargingMoveIndex).toBe(0)
    expect(first.state.opponent.roster[0].moves[0].pp).toBe(10)
    expect(first.state.player.roster[0].item?.name).toBe('power-herb')
    const release = use(first.state)
    expect(release.state.opponent.roster[0].hp).toBeLessThan(10000)
    expect(release.state.player.roster[0].hp).toBeLessThan(state.player.roster[0].hp)
    expect(release.state.player.roster[0].moves[0].pp).toBe(state.player.roster[0].moves[0].pp - 1)
    expect(release.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
    expect(release.state.player.roster[0].skyDropTargetId).toBeUndefined()
  })
  it.each([false, true])(
    'lets the carried defender switch, including during recharge (%s), cancelling damage to both targets',
    (recharging) => {
      const first = use(setup(load('sky-drop'))).state
      first.opponent.roster[0].recharging = recharging
      const result = resolveBattleTurn(first, { kind: 'move', index: 0 }, { kind: 'switch', index: 1 }, () => 0.5)
      expect(result.state.opponent.active).toBe(1)
      expect(result.state.opponent.roster[0].hp).toBe(10000)
      expect(result.state.opponent.roster[1].hp).toBe(result.state.opponent.roster[1].maxHp)
      expect(result.state.player.roster[0].chargingMoveIndex).toBeUndefined()
      expect(result.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
      expect(result.events).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'damage' })]))
      expect(result.events).toContainEqual({ type: 'failed', pokemon: 'user' })
    },
  )
  it('Sky Drop only carries after an accurate and unprotected first turn', () => {
    const state = setup(load('sky-drop'))
    state.player.roster[0].stages.accuracy = -6
    const miss = use(state, 0.5).state
    expect(miss.player.roster[0].chargingMoveIndex).toBeUndefined()
    expect(miss.opponent.roster[0].skyDropSourceId).toBeUndefined()
    state.player.roster[0].stages.accuracy = 0
    state.opponent.roster[0].volatile.protect = 1
    expect(use(state).state.opponent.roster[0].skyDropSourceId).toBeUndefined()
  })
  it('releases a carried target if the carrier cannot execute its second turn', () => {
    const state = use(setup(load('sky-drop'))).state
    state.player.roster[0].status = 'sleep'
    state.player.roster[0].sleepTurns = 2
    state.opponent.roster[0].moves[0] = { data: load('tackle'), pp: 10 }
    const result = use(state)
    expect(result.state.opponent.roster[0].hp).toBe(10000)
    expect(result.state.opponent.roster[0].skyDropSourceId).toBeUndefined()
    expect(result.state.player.roster[0].hp).toBeLessThan(state.player.roster[0].hp)
  })
  it.each(['gigaton-hammer', 'blood-moon'])('%s permits success, failed repetition, then success', (name) => {
    const first = use(setup(load(name))).state
    const second = use(first)
    expect(second.state.opponent.roster[0].hp).toBe(first.opponent.roster[0].hp)
    expect(second.events).toContainEqual({ type: 'failed', pokemon: 'user' })
    expect(second.state.player.roster[0].recharging).toBeUndefined()
    const third = use(second.state)
    expect(third.state.opponent.roster[0].hp).toBeLessThan(second.state.opponent.roster[0].hp)
  })
  it.each(['gigaton-hammer', 'blood-moon'])('%s can retry after a miss or a protected target', (name) => {
    const state = setup(load(name))
    state.player.roster[0].stages.accuracy = -6
    const miss = use(state, 0.9).state
    miss.player.roster[0].stages.accuracy = 0
    expect(use(miss).state.opponent.roster[0].hp).toBeLessThan(10000)
    state.player.roster[0].stages.accuracy = 0
    state.opponent.roster[0].volatile.protect = 1
    const blocked = use(state).state
    expect(use(blocked).state.opponent.roster[0].hp).toBeLessThan(10000)
  })
  it('a different move or switching breaks a consecutive-use sequence', () => {
    const first = use(setup(load('gigaton-hammer'))).state
    const other = resolveBattleTurn(first, { kind: 'move', index: 1 }, { kind: 'move', index: 0 }, () => 0.5).state
    expect(use(other).state.opponent.roster[0].hp).toBeLessThan(other.opponent.roster[0].hp)
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
  ])('uses the independent accuracy/evasion ratio at stage %i', (stage, multiplier) => {
    const move = { ...load('tackle'), accuracy: 20 }
    const state = setup(move)
    const user = state.player.roster[0],
      target = state.opponent.roster[0]
    user.stages.accuracy = stage
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.2 * multiplier)
    user.stages.accuracy = 0
    target.stages.evasion = stage
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.2 / multiplier)
  })
  it('combines independent ratios rather than subtracting stages, and caps the final probability', () => {
    const state = setup(load('tackle'))
    const user = state.player.roster[0],
      target = state.opponent.roster[0],
      move = user.moves[0].data
    user.stages.accuracy = -2
    target.stages.evasion = 2
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.36)
    user.stages.accuracy = 6
    target.stages.evasion = -6
    expect(battleHitProbability(move, user, target, state.field)).toBe(1)
    user.stages.accuracy = 0
    target.stages.evasion = 6
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(1 / 3)
    expect(use(state, 0.34).state.opponent.roster[0].hp).toBe(10000)
    expect(use(state, 0.32).state.opponent.roster[0].hp).toBeLessThan(10000)
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
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.3)
    state.field.weather = weather
    expect(battleHitProbability(move, user, target, state.field)).toBeCloseTo(0.24)
    expect(battleHitProbability({ ...move, accuracy: null }, user, target, state.field)).toBe(1)
  })
  it('parses and applies accuracy/evasion changes, clamps stages, and resets them on switching and Haze', () => {
    const sand = setup(load('sand-attack'))
    sand.opponent.roster[0].stages.accuracy = -6
    expect(use(sand).state.opponent.roster[0].stages.accuracy).toBe(-6)
    sand.opponent.roster[0].stages.accuracy = 0
    expect(use(sand).state.opponent.roster[0].stages.accuracy).toBe(-1)
    const raised = use(setup(load('double-team'))).state
    expect(raised.player.roster[0].stages.evasion).toBe(1)
    const switched = resolveBattleTurn(
      raised,
      { kind: 'switch', index: 1 },
      { kind: 'move', index: 0 },
      () => 0.5,
    ).state
    expect(switched.player.roster[0].stages.evasion).toBe(0)
    raised.player.roster[0].moves[0].data = load('haze')
    expect(use(raised).state.player.roster[0].stages.evasion).toBe(0)
  })
})

// Report generation is opt-in and cannot turn unresolved mechanics into passing assertions.
afterAll(() => {
  if (!process.env.BATTLE_AUDIT_REPORT) return
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
    const gaps: string[] = []
    if (!reference) gaps.push('Reference ID unavailable')
    if (reference && JSON.stringify(reference).includes('callbackSource'))
      gaps.push(
        'Conditional callbacks require dedicated scenario coverage; presence of a local handler does not prove equivalence',
      )
    if (reference && ('isZ' in reference || 'isMax' in reference))
      gaps.push('Z/Max activation, eligibility and power conversion are not modeled')
    if (reference && 'selfdestruct' in reference) gaps.push('Self-destruction timing is not implemented')
    if (reference && 'hasCrashDamage' in reference) gaps.push('Crash damage on failure is not implemented')
    if (reference && 'forceSwitch' in reference) gaps.push('Forced replacement selection is not random')
    if (reference && 'secondaries' in reference)
      gaps.push('Multiple independent secondary effects are not fully represented')
    if (reference && 'selfSwitch' in reference && reference.selfSwitch === 'copyvolatile')
      gaps.push('Baton Pass does not transfer all stages/volatiles')
    if (payload.meta === null && !supplementalMoveMetadata[move.name])
      gaps.push('PokéAPI metadata absent; supplemental effect/timing alone is not a complete behavior specification')
    if (!gaps.length)
      gaps.push(
        'Baseline execution tested; full interaction parity with items, abilities, target rules and cartridge rounding is not certified',
      )
    return {
      id: payload.id,
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
      'Generation policy: use the current Showdown base move definition as a comparison reference. The existing project-specific Encore duration remains 2–6 actions. Legacy/Legends/Z/Max moves need explicit format decisions; API availability does not imply availability in Scarlet/Violet.',
      '',
      'Global limitations: complete ability/contact interactions, move-calling restrictions, precise integer rounding, targeting/Protect exceptions and per-hit secondary effects are not comprehensively implemented. No row is a claim of full correctness. “0” in the timing columns describes the local engine, not proof that the canonical move has no lockout. See conditional callbacks.',
      '',
      'Project rules verified by dedicated regressions: OHKO faints a directly hit target using the normal accuracy check (no level gate); Sky Drop carries for its charge turn, releases next turn and cancels damage if the defender switches; Gigaton Hammer/Blood Moon fail after success on the immediately preceding turn but permit retry after failure; accuracy/evasion use separate 3-based stage ratios, followed by Bright Powder and weather evasion modifiers. Z/Max remain unimplemented.',
      '',
      'Refresh: `python scripts/fetch-battle-moves.py`; obtain the reviewed Showdown `data/moves.ts`, then `node scripts/extract-move-reference.mjs <path>`; run `npm run audit:battle-moves`. Tests never fetch the network. Snapshot changes require review.',
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
