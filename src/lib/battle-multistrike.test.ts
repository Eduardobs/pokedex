import { describe, expect, it } from 'vitest'
import apiMoves from '../data/third-party/pokeapi-battle-moves.json'
import { parseBattleMove } from './battle-data'
import { multistrikeMoves } from './battle-multistrike'
import { createBattlePokemon, createBattleState, resolveBattleTurn, type BattleMove } from './battle'
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
const executeMove = (state: ReturnType<typeof setup>, roll = 0.5) =>
  resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => roll)
const load = (name: string) => {
  const payload = apiMoves.find((move) => move.name === name)
  if (!payload) throw new Error(`Missing move ${name}`)
  return parseBattleMove(payload)
}

// Scarlet/Violet rules; older moves retain their latest main-series multistrike behavior.
const fixedMoves = [
  'bonemerang',
  'double-hit',
  'double-iron-bash',
  'double-kick',
  'dragon-darts',
  'dual-chop',
  'dual-wingbeat',
  'gear-grind',
  'tachyon-cutter',
  'twin-beam',
  'twineedle',
]
const tripleMoves = ['surging-strikes', 'triple-dive', 'triple-axel', 'triple-kick']
const variableMoves = [
  'arm-thrust',
  'barrage',
  'bone-rush',
  'bullet-seed',
  'comet-punch',
  'double-slap',
  'fury-attack',
  'fury-swipes',
  'icicle-spear',
  'pin-missile',
  'rock-blast',
  'scale-shot',
  'spike-cannon',
  'tail-slap',
  'water-shuriken',
]
const strikes = (result: ReturnType<typeof executeMove>) =>
  result.events.filter((event) => event.type === 'damage' && event.pokemon === 'target')
const queued =
  (values: number[], fallback = 0.5) =>
  () =>
    values.shift() ?? fallback
const equip = (state: ReturnType<typeof setup>, name: string) => {
  state.player.roster[0].item = { name, names: [], descriptions: [], sprite: null }
}

describe('Generation IX multistrike moves', () => {
  it.each(fixedMoves)('%s deals exactly two strikes', (name) =>
    expect(strikes(executeMove(setup(load(name))))).toHaveLength(2),
  )
  it.each(tripleMoves)('%s deals exactly three strikes after successful checks', (name) =>
    expect(strikes(executeMove(setup(load(name))))).toHaveLength(3),
  )
  it.each(variableMoves)('%s uses the 2–5 distribution', (name) => {
    for (const [roll, count] of [
      [0, 2],
      [0.35, 3],
      [0.7, 4],
      [0.85, 5],
    ]) {
      const state = setup(load(name))
      const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, queued([0, roll]))
      expect(strikes(result)).toHaveLength(count)
    }
  })
  it.each(['triple-axel', 'triple-kick', 'population-bomb'])(
    '%s stops when a subsequent accuracy check fails and logs the miss',
    (name) => {
      const state = setup(load(name))
      const result = resolveBattleTurn(
        state,
        { kind: 'move', index: 0 },
        { kind: 'move', index: 0 },
        queued([0, 0.5, 0.5, 0.95]),
      )
      expect(strikes(result)).toHaveLength(1)
      expect(result.events).toContainEqual({ type: 'miss', pokemon: 'target' })
      expect(result.state.player.roster[0].moves[0].pp).toBe(state.player.roster[0].moves[0].pp - 1)
    },
  )
  it.each(['triple-axel', 'triple-kick', 'population-bomb'])(
    '%s makes only one accuracy check with Skill Link',
    (name) => {
      const state = setup(load(name))
      state.player.roster[0].ability.name = 'skill-link'
      const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, queued([0], 0.95))
      expect(strikes(result)).toHaveLength(name === 'population-bomb' ? 10 : 3)
    },
  )
  it.each(['triple-axel', 'triple-kick'])('%s makes only one accuracy check with Loaded Dice', (name) => {
    const state = setup(load(name))
    equip(state, 'loaded-dice')
    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, queued([0], 0.95))
    expect(strikes(result)).toHaveLength(3)
  })
  it.each([
    [0, 10],
    [0.999, 4],
  ])('Loaded Dice Population Bomb rolls 4–10 hits (roll %f)', (roll, count) => {
    const state = setup(load('population-bomb'))
    equip(state, 'loaded-dice')
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      queued([0, roll], 0.95),
    )
    expect(strikes(result)).toHaveLength(count)
  })
  it('stops when Effect Spore puts the user to sleep between strikes', () => {
    const state = setup(load('double-kick'))
    state.opponent.roster[0].ability.name = 'effect-spore'
    expect(strikes(executeMove(state, 0))).toHaveLength(1)
  })
  it('Beat Up uses only eligible party members and each member’s base Attack', () => {
    const state = setup(load('beat-up'))
    state.player.roster[1].hp = 0
    state.player.roster[2].status = 'burn'
    state.player.roster[3].baseAttack = 10
    state.player.roster[4].baseAttack = 200
    const result = executeMove(state)
    expect(strikes(result)).toHaveLength(4)
    const amounts = strikes(result).map((event) => (event.type === 'damage' ? event.amount : 0))
    expect(amounts[1]).toBeLessThan(amounts[0])
    expect(amounts[2]).toBeGreaterThan(amounts[0])
  })
  it('covers every move in the Generation IX multistrike list', () => {
    expect(Object.keys(multistrikeMoves).sort()).toEqual(
      [...fixedMoves, ...tripleMoves, ...variableMoves, 'population-bomb', 'beat-up'].sort(),
    )
  })
  it('logs only landed strikes, in order, including a broken Substitute', () => {
    const state = setup(load('double-kick'))
    state.opponent.roster[0].substituteHp = 1
    const result = executeMove(state)
    expect(result.events.filter((event) => event.type === 'hit')).toEqual([
      { type: 'hit', pokemon: 'target', move: 'double-kick', hit: 1 },
      { type: 'hit', pokemon: 'target', move: 'double-kick', hit: 2 },
    ])
    expect(result.events).toContainEqual({ type: 'substituteDamage', pokemon: 'target', amount: 1, broken: true })
    expect(strikes(result)).toHaveLength(1)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(10000)
  })
  it.each(['triple-axel', 'triple-kick'])('%s increases its power on every strike', (name) => {
    const damage = strikes(executeMove(setup(load(name)))).map((event) => (event.type === 'damage' ? event.amount : 0))
    expect(damage).toHaveLength(3)
    expect(damage[1]).toBeGreaterThan(damage[0])
    expect(damage[2]).toBeGreaterThan(damage[1])
  })
  it('checks critical hits separately for each strike', () => {
    const state = setup(load('triple-axel'))
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      queued([0, 0.99, 0.5, 0, 0, 0.5, 0, 0.99, 0.5]),
    )
    expect(strikes(result).map((event) => event.type === 'damage' && event.critical)).toEqual([false, true, false])
  })
  it('stops on a knockout and does not log planned but unexecuted hits', () => {
    const state = setup(load('triple-axel'))
    state.opponent.roster[0].hp = 1
    const result = executeMove(state)
    expect(strikes(result)).toHaveLength(1)
    expect(result.events.filter((event) => event.type === 'hit')).toHaveLength(1)
  })
  it('can faint after Focus Sash activates on the first hit', () => {
    const state = setup(load('triple-axel'))
    const target = state.opponent.roster[0]
    target.hp = target.maxHp = 10
    target.item = { name: 'focus-sash', names: [], descriptions: [], sprite: null }
    const result = executeMove(state)
    expect(strikes(result)).toHaveLength(2)
    expect(result.state.opponent.roster[0].hp).toBe(0)
  })
  it('Focus Band checks survival independently on every lethal hit', () => {
    const state = setup(load('triple-axel'))
    const target = state.opponent.roster[0]
    target.hp = 1
    target.item = { name: 'focus-band', names: [], descriptions: [], sprite: null }
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      queued([0, 0.5, 0.5, 0.05, 0, 0.5, 0.5, 0.5]),
    )
    expect(strikes(result)).toHaveLength(2)
    expect(result.state.opponent.roster[0].hp).toBe(0)
  })
  it('stops when Rocky Helmet faints the attacker', () => {
    const state = setup(load('double-kick'))
    state.player.roster[0].hp = 1
    state.opponent.roster[0].item = { name: 'rocky-helmet', names: [], descriptions: [], sprite: null }
    const result = executeMove(state)
    expect(strikes(result)).toHaveLength(1)
    expect(result.state.player.roster[0].hp).toBe(0)
  })
  it('Color Change activates after the last strike, preserving the sequence effectiveness', () => {
    const state = setup(load('double-kick'))
    state.opponent.roster[0].ability.name = 'color-change'
    const result = executeMove(state)
    expect(strikes(result).map((event) => event.type === 'damage' && event.effectiveness)).toEqual([2, 2])
    expect(result.state.opponent.roster[0].abilityMemory?.types).toEqual(['fighting'])
  })
  it('Counter reflects only the final strike', () => {
    const state = setup(load('triple-axel'))
    state.opponent.roster[0].moves[0] = { data: load('counter'), pp: 20 }
    const result = executeMove(state)
    const last = strikes(result).at(-1)
    expect(last?.type).toBe('damage')
    if (last?.type === 'damage')
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'damage', pokemon: 'user', amount: 2 * last.amount }),
      )
  })
  it('rechecks per-strike accuracy with the subsequent-hit stage ratios', () => {
    const state = setup(load('triple-axel'))
    state.player.roster[0].stages.accuracy = -2
    state.opponent.roster[0].stages.evasion = 2
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      queued([0, 0.5, 0.5, 0.35]),
    )
    expect(strikes(result)).toHaveLength(1)
  })
  it.each(variableMoves)('%s always strikes five times with Skill Link', (name) => {
    const state = setup(load(name))
    state.player.roster[0].ability.name = 'skill-link'
    expect(strikes(executeMove(state, 0))).toHaveLength(5)
  })
  it.each([
    [0, 4],
    [0.999, 5],
  ])('Loaded Dice gives 4–5 strikes to variable moves (roll %f)', (roll, count) => {
    const state = setup(load('icicle-spear'))
    equip(state, 'loaded-dice')
    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, queued([0, roll]))
    expect(strikes(result)).toHaveLength(count)
  })
  it('Klutz prevents Loaded Dice from bypassing per-strike accuracy', () => {
    const state = setup(load('population-bomb'))
    equip(state, 'loaded-dice')
    state.player.roster[0].ability.name = 'klutz'
    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, queued([0], 0.95))
    expect(strikes(result)).toHaveLength(1)
  })
  it('Stench rolls flinch on each strike', () => {
    const state = setup(load('double-kick'))
    state.player.roster[0].ability.name = 'stench'
    const result = resolveBattleTurn(
      state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      queued([0, 0.5, 0.5, 0.99, 0.5, 0.5, 0]),
    )
    expect(strikes(result)).toHaveLength(2)
    expect(result.events).toContainEqual({ type: 'status', pokemon: 'target', status: 'flinch' })
  })
  it('Life Orb applies recoil once after the sequence', () => {
    const state = setup(load('triple-axel'))
    equip(state, 'life-orb')
    const result = executeMove(state)
    expect(result.events.filter((event) => event.type === 'damage' && event.pokemon === 'user')).toHaveLength(1)
    expect(result.state.player.roster[0].hp).toBe(
      state.player.roster[0].hp - Math.floor(state.player.roster[0].maxHp / 10),
    )
  })
  it('Shell Bell heals once using damage from the complete sequence', () => {
    const state = setup(load('triple-axel'))
    equip(state, 'shell-bell')
    state.player.roster[0].hp = 100
    const result = executeMove(state)
    const damage = strikes(result).reduce((sum, event) => sum + (event.type === 'damage' ? event.amount : 0), 0)
    const healing = result.events.filter((event) => event.type === 'heal' && event.pokemon === 'user')
    expect(healing).toHaveLength(1)
    expect(result.state.player.roster[0].hp).toBe(100 + Math.max(1, Math.floor(damage / 8)))
  })
  it.each(['loaded-dice', 'skill-link'])('%s does not bypass the first accuracy check', (modifier) => {
    const state = setup(load('triple-axel'))
    if (modifier === 'skill-link') state.player.roster[0].ability.name = modifier
    else equip(state, modifier)
    const result = executeMove(state, 0.95)
    expect(result.events.filter((event) => event.type === 'hit')).toHaveLength(0)
    expect(strikes(result)).toHaveLength(0)
  })
  it('No Guard bypasses all of the sequence’s accuracy checks', () => {
    const state = setup(load('triple-axel'))
    state.player.roster[0].ability.name = 'no-guard'
    expect(strikes(executeMove(state, 0.95))).toHaveLength(3)
  })
  it('announces the move once and spends PP once for the complete sequence', () => {
    const state = setup(load('triple-axel'))
    const pp = state.player.roster[0].moves[0].pp
    const result = executeMove(state)
    expect(result.events.filter((event) => event.type === 'move' && event.move === 'triple-axel')).toHaveLength(1)
    expect(result.events.filter((event) => event.type === 'hit')).toHaveLength(3)
    expect(result.state.player.roster[0].moves[0].pp).toBe(pp - 1)
  })
  it.each(['stamina', 'weak-armor'])('applies %s between strikes', (ability) => {
    const state = setup(load('double-kick'))
    state.opponent.roster[0].ability.name = ability
    const damage = strikes(executeMove(state)).map((event) => (event.type === 'damage' ? event.amount : 0))
    if (ability === 'stamina') expect(damage[1]).toBeLessThan(damage[0])
    else expect(damage[1]).toBeGreaterThan(damage[0])
  })
  it('Parental Bond does not add an extra strike to multistrike or excluded moves', () => {
    const state = setup(load('double-kick'))
    state.player.roster[0].ability.name = 'parental-bond'
    expect(strikes(executeMove(state))).toHaveLength(2)
    state.player.roster[0].moves[0].data = load('explosion')
    expect(strikes(executeMove(state))).toHaveLength(1)
  })
  it('does not trigger Color Change through a Substitute', () => {
    const state = setup(load('double-kick'))
    state.opponent.roster[0].ability.name = 'color-change'
    state.opponent.roster[0].substituteHp = 10000
    const result = executeMove(state)
    expect(result.state.opponent.roster[0].abilityMemory?.types).toBeUndefined()
    expect(result.events.filter((event) => event.type === 'hit')).toHaveLength(2)
  })
})
