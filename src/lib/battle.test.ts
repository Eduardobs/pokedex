import { describe, expect, it } from 'vitest'
import {
  battleMoveEffectiveness,
  chooseOpponentAction,
  createBattlePokemon,
  createBattleState,
  currentBattleStats,
  isBattleReadyTeam,
  possibleBattleStats,
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
  effectChance: null,
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
  it('uses the selected ability when calculating battle stats', () => {
    const pokemon = { ...teamPokemon('azumarill'), abilities: ['huge-power', 'thick-fat'] }
    const selectedMember = { ...member(0, 'azumarill'), ability: 'huge-power' }
    const neutralMember = { ...selectedMember, ability: 'thick-fat' }
    const moves = [move(), move(), move(), move()]

    const selected = createBattlePokemon(selectedMember, pokemon, moves)
    const neutral = createBattlePokemon(neutralMember, pokemon, moves)

    expect(selected.ability.name).toBe('huge-power')
    expect(selected.originalStats[1]).toBe(neutral.originalStats[1])
    expect(selected.stats[1]).toBe(neutral.stats[1] * 2)
  })

  it('applies conditional ability stats only when their condition is active', () => {
    const pokemon = { ...teamPokemon('ursaring'), abilities: ['guts'] }
    const inactiveMember = { ...member(0, 'ursaring'), ability: 'guts' }
    const activeMember = { ...inactiveMember, abilityActive: true }
    const moves = [move(), move(), move(), move()]

    const inactive = createBattlePokemon(inactiveMember, pokemon, moves)
    const active = createBattlePokemon(activeMember, pokemon, moves)

    expect(active.stats[1]).toBe(Math.floor(inactive.stats[1] * 1.5))
  })

  it('calculates the current stats after battle stage and paralysis modifiers', () => {
    const pokemon = createBattlePokemon(member(0), teamPokemon('modified'), [move(), move(), move(), move()])
    pokemon.stages = { attack: 2, defense: -1, specialAttack: 1, specialDefense: -2, speed: 1 }
    pokemon.status = 'paralysis'

    expect(currentBattleStats(pokemon)).toEqual([341, 472, 157, 354, 118, 177])
  })

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

  it('calculates the full legal stat range for an opponent with unknown training', () => {
    const ranges = possibleBattleStats(teamPokemon('range-test'), 100)
    expect(ranges).toEqual([
      [310, 404],
      [184, 328],
      [184, 328],
      [184, 328],
      [184, 328],
      [184, 328],
    ])
    expect(possibleBattleStats(teamPokemon('range-test'), 50)[5]).toEqual([94, 167])
  })

  it('uses Effect chance for secondary stat changes', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      damageClass: 'status',
      power: null,
      effectChance: 25,
      statChanges: [{ stat: 'attack', change: -1 }],
    })

    const missedEffect = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    const appliedEffect = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.1)

    expect(missedEffect.state.opponent.roster[0].stages.attack).toBe(0)
    expect(appliedEffect.state.opponent.roster[0].stages.attack).toBe(-1)
  })

  it('tracks which Pokémon have entered the battle for team indicators', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    expect(state.player.roster.map((pokemon) => pokemon.hasEnteredBattle)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ])

    const switched = resolveBattleTurn(state, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(switched.state.player.roster.map((pokemon) => pokemon.hasEnteredBattle)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ])
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

  it('resolves each Pokémon’s Terastallization after both actions and only once', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].member.tera = 'ghost'
    state.player.roster[1].member.tera = 'fire'

    const first = resolveBattleTurn(
      state,
      { kind: 'move', index: 0, tera: true },
      { kind: 'move', index: 0 },
      () => 0.5,
    )
    const teraEvent = first.events.findIndex((event) => event.type === 'tera')
    expect(teraEvent).toBeGreaterThan(
      Math.max(...first.events.map((event, index) => (event.type === 'move' ? index : -1))),
    )
    expect(first.state.player.roster[0].terastallized).toBe(true)

    const switched = resolveBattleTurn(first.state, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5)
    const second = resolveBattleTurn(
      switched.state,
      { kind: 'move', index: 0, tera: true },
      { kind: 'move', index: 0 },
      () => 0.5,
    )
    expect(second.state.player.roster[0].terastallized).toBe(true)
    expect(second.state.player.roster[1].terastallized).toBe(true)
  })

  it('calculates move effectiveness against the active Pokémon’s current types', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(
      playerTeam,
      roster(playerTeam),
      opponentTeam,
      roster(opponentTeam, ['water', 'ground']),
    )
    expect(battleMoveEffectiveness(move({ type: 'electric' }), state.opponent.roster[0])).toBe(0)
  })

  it('sets entry hazards and damages an opposing Pokémon that switches in', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'stealth-rock',
      type: 'rock',
      damageClass: 'status',
      power: null,
    })
    state.player.roster[0].stats[5] = 999

    const rocks = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(rocks.state.opponent.hazards.stealthRock).toBe(true)
    expect(rocks.events).toContainEqual({ type: 'hazardSet', side: 'opponent', hazard: 'stealth-rock' })

    const switched = resolveBattleTurn(rocks.state, { kind: 'move', index: 3 }, { kind: 'switch', index: 1 }, () => 0.5)
    const damage = switched.events.find((event) => event.type === 'hazardDamage' && event.hazard === 'stealth-rock')
    expect(damage).toMatchObject({
      pokemon: 'opponent-1',
      amount: Math.floor(rocks.state.opponent.roster[1].maxHp / 8),
    })
  })

  it('stacks Spikes and applies the layer damage when the opposing Pokémon switches in', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'spikes', type: 'ground', damageClass: 'status', power: null })
    state.player.roster[0].stats[5] = 999

    let layered = state
    for (let layer = 0; layer < 3; layer += 1)
      layered = resolveBattleTurn(layered, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5).state
    expect(layered.opponent.hazards.spikes).toBe(3)

    const switched = resolveBattleTurn(layered, { kind: 'move', index: 3 }, { kind: 'switch', index: 1 }, () => 0.5)
    expect(switched.events).toContainEqual({
      type: 'hazardDamage',
      pokemon: 'opponent-1',
      hazard: 'spikes',
      amount: Math.floor(layered.opponent.roster[1].maxHp / 4),
    })
  })

  it('applies grounded entry effects and lets Defog clear hazards from both sides', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.opponent.hazards = { stealthRock: false, spikes: 1, toxicSpikes: 1, stickyWeb: true }

    const grounded = resolveBattleTurn(state, { kind: 'move', index: 3 }, { kind: 'switch', index: 1 }, () => 0.5)
    const replacement = grounded.state.opponent.roster[1]
    expect(replacement.status).toBe('poison')
    expect(replacement.stages.speed).toBe(-1)
    expect(grounded.events).toContainEqual({
      type: 'hazardDamage',
      pokemon: 'opponent-1',
      hazard: 'spikes',
      amount: Math.floor(state.opponent.roster[1].maxHp / 8),
    })

    const airborne = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    airborne.opponent.roster[1].pokemon.types = ['flying']
    airborne.opponent.hazards = { stealthRock: false, spikes: 3, toxicSpikes: 2, stickyWeb: true }
    const switchedAirborne = resolveBattleTurn(
      airborne,
      { kind: 'move', index: 3 },
      { kind: 'switch', index: 1 },
      () => 0.5,
    )
    expect(switchedAirborne.events.some((event) => event.type === 'hazardDamage')).toBe(false)
    expect(switchedAirborne.state.opponent.roster[1].status).toBeNull()
    expect(switchedAirborne.state.opponent.roster[1].stages.speed).toBe(0)

    const defog = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    defog.player.hazards.stealthRock = true
    defog.opponent.hazards.spikes = 2
    defog.player.roster[0].moves[0].data = move({ name: 'defog', type: 'flying', damageClass: 'status', power: null })
    const cleared = resolveBattleTurn(defog, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(cleared.state.player.hazards).toEqual({ stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false })
    expect(cleared.state.opponent.hazards).toEqual({ stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false })
  })

  it('requests a replacement after a pivot move and handles forced switches and hazard removal', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'u-turn', type: 'bug', power: 70 })
    state.player.roster[0].stats[5] = 999

    const pivoted = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(pivoted.state.phase).toBe('player-switch')
    const replaced = resolveBattleTurn(
      pivoted.state,
      { kind: 'switch', index: 1 },
      { kind: 'move', index: 3 },
      () => 0.5,
    )
    expect(replaced.state.player.active).toBe(1)

    const forced = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    forced.player.roster[0].moves[0].data = move({ name: 'dragon-tail', type: 'dragon', power: 60 })
    forced.player.roster[0].stats[5] = 999
    expect(
      resolveBattleTurn(forced, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5).state.phase,
    ).toBe('opponent-switch')

    const cleared = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    cleared.player.hazards.spikes = 2
    cleared.player.roster[0].moves[0].data = move({ name: 'rapid-spin', type: 'normal', power: 50 })
    const spun = resolveBattleTurn(cleared, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(spun.state.player.hazards.spikes).toBe(0)
    expect(spun.events).toContainEqual({ type: 'hazardsCleared', side: 'player' })
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
