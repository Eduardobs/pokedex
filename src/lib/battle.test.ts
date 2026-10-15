import { describe, expect, it } from 'vitest'
import {
  chooseOpponentAction,
  createBattlePokemon,
  createBattleState,
  isBattleReadyTeam,
  resolveBattleTurn,
  type BattleMove,
} from './battle'
import type { Team, TeamMember, TeamPokemon } from './teams'

const move = (overrides: Partial<BattleMove> = {}): BattleMove => ({
  name: 'tackle',
  type: 'normal',
  damageClass: 'physical',
  power: 40,
  accuracy: 100,
  priority: 0,
  pp: 35,
  target: 'selected-pokemon',
  healing: 0,
  drain: 0,
  ailment: null,
  ailmentChance: 0,
  statChanges: [],
  ...overrides,
})

const teamPokemon = (name: string, types = ['normal']): TeamPokemon => ({
  id: 1,
  name,
  species: name,
  stats: [100, 100, 100, 100, 100, 100],
  types,
  abilities: ['run-away'],
  moves: ['tackle', 'quick-attack', 'recover', 'growl'],
})

const member = (index: number, pokemon = `pokemon-${index}`): TeamMember => ({
  id: `member-${index}`,
  pokemon,
  level: 100,
  friendship: 255,
  shiny: false,
  gender: 'random',
  tera: 'normal',
  ability: 'run-away',
  nature: 'hardy',
  item: '',
  moves: ['tackle', 'quick-attack', 'recover', 'growl'],
  evs: [0, 0, 0, 0, 0, 0],
  ivs: [31, 31, 31, 31, 31, 31],
  abilityActive: false,
  itemActive: false,
})

const team = (id: string): Team => ({
  id,
  name: id,
  competitiveFormat: 'singles-6v6',
  members: Array.from({ length: 6 }, (_, index) => member(index, `${id}-${index}`)),
})

const roster = (source: Team, firstTypes = ['normal']) =>
  source.members.map((entry, index) =>
    createBattlePokemon(entry, teamPokemon(entry.pokemon, index === 0 ? firstTypes : ['normal']), [
      move(),
      move({ name: 'quick-attack', priority: 1 }),
      move({ name: 'recover', damageClass: 'status', power: null, healing: 50 }),
      move({ name: 'growl', damageClass: 'status', power: null, statChanges: [{ stat: 'attack', change: -1 }] }),
    ]),
  )

describe('Random Battle engine', () => {
  it('accepts only complete teams with four selected moves per member', () => {
    const complete = team('player')
    expect(isBattleReadyTeam(complete)).toBe(true)
    expect(isBattleReadyTeam({ ...complete, members: complete.members.slice(0, 5) })).toBe(false)
    expect(
      isBattleReadyTeam({
        ...complete,
        members: [{ ...complete.members[0], moves: ['tackle', '', 'recover', 'growl'] }, ...complete.members.slice(1)],
      }),
    ).toBe(false)
  })

  it('uses priority, consumes PP, applies damage, and preserves a complete immutable state', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    const result = resolveBattleTurn(state, { kind: 'move', index: 1 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(result.events.filter((event) => event.type === 'move')[0]).toMatchObject({
      side: 'player',
      move: 'quick-attack',
    })
    expect(result.state.player.roster[0].moves[1].pp).toBe(34)
    expect(result.state.opponent.roster[0].hp).toBeLessThan(result.state.opponent.roster[0].maxHp)
    expect(state.player.roster[0].moves[1].pp).toBe(35)
    expect(result.state.turn).toBe(2)
  })

  it('respects type immunity and supports a voluntary switch without taking damage first', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const immune = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam, ['ghost']))
    const attack = resolveBattleTurn(immune, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(attack.events).toContainEqual({ type: 'immune', pokemon: 'opponent-0' })
    expect(attack.state.opponent.roster[0].hp).toBe(attack.state.opponent.roster[0].maxHp)

    const switched = resolveBattleTurn(immune, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(switched.state.player.active).toBe(1)
    expect(switched.events).toContainEqual({ type: 'switch', side: 'player', pokemon: 'player-1' })
    expect(switched.state.player.roster[1].hp).toBeLessThan(switched.state.player.roster[1].maxHp)
  })

  it('requires a replacement after the active Pokémon faints', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].hp = 1
    state.opponent.roster[0].moves[0].data.power = 1000
    state.opponent.roster[0].stats[5] = 999

    const fainted = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(fainted.state.phase).toBe('player-switch')
    expect(fainted.events).toContainEqual({ type: 'faint', pokemon: 'player-0' })

    const replacement = resolveBattleTurn(
      fainted.state,
      { kind: 'switch', index: 2 },
      { kind: 'move', index: 0 },
      () => 0.5,
    )
    expect(replacement.state.phase).toBe('choice')
    expect(replacement.state.player.active).toBe(2)
  })

  it('automatically chooses and completes an opponent replacement', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.opponent.roster[0].hp = 1
    state.player.roster[0].moves[0].data.power = 1000
    state.player.roster[0].stats[5] = 999

    const fainted = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(fainted.state.phase).toBe('opponent-switch')
    const choice = chooseOpponentAction(fainted.state, () => 0)
    expect(choice).toEqual({ kind: 'switch', index: 1 })
    const replacement = resolveBattleTurn(fainted.state, { kind: 'move', index: 0 }, choice, () => 0.5)
    expect(replacement.state.phase).toBe('choice')
    expect(replacement.state.opponent.active).toBe(1)
  })

  it('applies recovery, stat changes, status damage, and the terminal win state', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const support = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    support.player.roster[0].hp = 100
    const supported = resolveBattleTurn(support, { kind: 'move', index: 2 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(supported.events.some((event) => event.type === 'heal')).toBe(true)
    expect(supported.events).toContainEqual({
      type: 'stage',
      pokemon: 'player-0',
      stat: 'attack',
      change: -1,
    })

    const status = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    status.player.roster[0].moves[0].data.ailment = 'burn'
    status.player.roster[0].moves[0].data.ailmentChance = 100
    status.player.roster[0].stats[5] = 999
    const afflicted = resolveBattleTurn(status, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(afflicted.state.opponent.roster[0].status).toBe('burn')
    expect(afflicted.events.some((event) => event.type === 'statusDamage')).toBe(true)

    const terminal = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    terminal.opponent.roster.forEach((pokemon, index) => {
      if (index > 0) pokemon.hp = 0
    })
    terminal.opponent.roster[0].hp = 1
    terminal.player.roster[0].moves[0].data.power = 1000
    terminal.player.roster[0].stats[5] = 999
    const victory = resolveBattleTurn(terminal, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(victory.state.phase).toBe('won')
    expect(victory.events).toContainEqual({ type: 'win', side: 'player' })
  })
})
