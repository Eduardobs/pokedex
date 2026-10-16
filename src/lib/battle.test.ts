import { describe, expect, it } from 'vitest'
import {
  battleMoveEffectiveness,
  battleSameTypeAttackBonus,
  chooseOpponentAction,
  createBattlePokemon,
  createBattleState,
  currentBattleStats,
  isBattleReadyTeam,
  legalBattleMoveIndexes,
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
  gender: 'male',
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

  it('locks an Encored Pokémon into its last move for a random two to six actions and clears it on switch', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'encore', damageClass: 'status', power: null })
    state.player.roster[0].stats[5] = 999
    state.opponent.roster[0].lastMoveIndex = 1

    const encored = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(encored.events).toContainEqual({
      type: 'encore',
      pokemon: 'opponent-0',
      move: 'quick-attack',
      turns: 4,
    })
    expect(encored.events).toContainEqual(
      expect.objectContaining({ type: 'move', side: 'opponent', move: 'quick-attack' }),
    )
    expect(encored.state.opponent.roster[0]).toMatchObject({ encoreMoveIndex: 1, encoreTurns: 3 })
    expect(legalBattleMoveIndexes(encored.state.opponent.roster[0])).toEqual([1])

    encored.state.phase = 'opponent-switch'
    const switched = resolveBattleTurn(
      encored.state,
      { kind: 'move', index: 0 },
      { kind: 'switch', index: 1 },
      () => 0.5,
    )
    expect(switched.state.opponent.roster[0]).toMatchObject({
      lastMoveIndex: null,
      encoreMoveIndex: null,
      encoreTurns: 0,
    })
  })

  it('selects both inclusive Encore duration boundaries', () => {
    const makeState = () => {
      const playerTeam = team('player')
      const opponentTeam = team('opponent')
      const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
      state.player.roster[0].moves[0].data = move({ name: 'encore', damageClass: 'status', power: null })
      state.player.roster[0].stats[5] = 999
      state.opponent.roster[0].lastMoveIndex = 1
      return state
    }

    const minimum = resolveBattleTurn(makeState(), { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0)
    const maximum = resolveBattleTurn(makeState(), { kind: 'move', index: 0 }, { kind: 'move', index: 1 }, () => 0.999)

    expect(minimum.events).toContainEqual(expect.objectContaining({ type: 'encore', turns: 2 }))
    expect(maximum.events).toContainEqual(expect.objectContaining({ type: 'encore', turns: 6 }))
  })

  it('sets weather and terrain with timed field state', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'rain-dance',
      type: 'water',
      damageClass: 'status',
      power: null,
    })
    state.player.roster[0].stats[5] = 999

    const rain = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(rain.state.field).toMatchObject({ weather: 'rain', weatherTurns: 4 })
    expect(rain.events).toContainEqual({ type: 'fieldSet', field: 'rain', turns: 5 })

    rain.state.player.roster[0].moves[0].data = move({
      name: 'grassy-terrain',
      type: 'grass',
      damageClass: 'status',
      power: null,
    })
    rain.state.player.roster[0].hp -= 100
    const terrain = resolveBattleTurn(rain.state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(terrain.state.field).toMatchObject({ terrain: 'grassy', terrainTurns: 4 })
    expect(terrain.state.player.roster[0].hp).toBeGreaterThan(rain.state.player.roster[0].hp)
  })

  it('applies field damage modifiers and terrain protections', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const makeState = () => createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    const normal = makeState()
    const rain = makeState()
    normal.player.roster[0].moves[0].data = move({ type: 'water', power: 80 })
    rain.player.roster[0].moves[0].data = move({ type: 'water', power: 80 })
    normal.player.roster[0].stats[5] = 999
    rain.player.roster[0].stats[5] = 999
    rain.field.weather = 'rain'
    rain.field.weatherTurns = 5

    const normalHit = resolveBattleTurn(normal, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    const rainHit = resolveBattleTurn(rain, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    const normalDamage = normalHit.events.find((event) => event.type === 'damage' && event.pokemon === 'opponent-0')
    const rainDamage = rainHit.events.find((event) => event.type === 'damage' && event.pokemon === 'opponent-0')
    expect(rainDamage?.type === 'damage' && normalDamage?.type === 'damage' && rainDamage.amount).toBeGreaterThan(
      normalDamage?.type === 'damage' ? normalDamage.amount : 0,
    )

    const psychic = makeState()
    psychic.field.terrain = 'psychic'
    psychic.field.terrainTurns = 5
    const blocked = resolveBattleTurn(psychic, { kind: 'move', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(blocked.events).toContainEqual({ type: 'fieldBlocked', pokemon: 'opponent-0', field: 'psychic' })

    const electric = makeState()
    electric.field.terrain = 'electric'
    electric.field.terrainTurns = 5
    electric.player.roster[0].stats[5] = 999
    electric.player.roster[0].moves[0].data = move({
      name: 'spore',
      type: 'grass',
      damageClass: 'status',
      power: null,
      ailment: 'sleep',
      ailmentChance: 100,
    })
    const awake = resolveBattleTurn(electric, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(awake.state.opponent.roster[0].status).toBeNull()
  })

  it('applies Trick Room, Tailwind, and screen side conditions', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'trick-room',
      type: 'psychic',
      damageClass: 'status',
      power: null,
    })
    state.player.roster[0].moves[0].data.priority = -7
    const room = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(room.state.field.trickRoomTurns).toBe(4)

    room.state.player.roster[0].moves[0].data = move()
    room.state.player.roster[0].stats[5] = 999
    room.state.opponent.roster[0].stats[5] = 1
    const reversed = resolveBattleTurn(room.state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(reversed.events.filter((event) => event.type === 'move')[0]).toMatchObject({ side: 'opponent' })

    reversed.state.player.roster[0].moves[0].data = move({
      name: 'reflect',
      type: 'psychic',
      damageClass: 'status',
      power: null,
    })
    const reflected = resolveBattleTurn(
      reversed.state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      () => 0.5,
    )
    expect(reflected.state.player.conditions.reflect).toBe(4)
    expect(reflected.events).toContainEqual({
      type: 'sideConditionSet',
      side: 'player',
      condition: 'reflect',
      turns: 5,
    })
  })

  it('prevents status moves while Taunt is active', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'taunt', type: 'dark', damageClass: 'status', power: null })
    state.player.roster[0].stats[5] = 999

    const taunted = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)

    expect(taunted.events).toContainEqual({ type: 'taunt', pokemon: 'opponent-0' })
    expect(taunted.events).not.toContainEqual(expect.objectContaining({ type: 'stage', pokemon: 'player-0' }))
    expect(legalBattleMoveIndexes(taunted.state.opponent.roster[0])).toEqual([0, 1])
    expect(chooseOpponentAction(taunted.state, () => 0).index).toBe(0)
  })

  it('supports fixed-damage moves whose damage is not structured by PokéAPI', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'seismic-toss', type: 'fighting', power: null })
    state.player.roster[0].stats[5] = 999
    const initialHp = state.opponent.roster[0].hp

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)

    expect(result.state.opponent.roster[0].hp).toBe(initialHp - 100)
    expect(result.events).toContainEqual({
      type: 'damage',
      pokemon: 'opponent-0',
      amount: 100,
      effectiveness: 1,
      critical: false,
    })
  })

  it('resets stat stages and cures the allied roster with supplemental effects', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'haze', type: 'ice', damageClass: 'status', power: null })
    state.player.roster[0].stages.attack = 2
    state.opponent.roster[0].stages.defense = -2
    state.player.roster[0].stats[5] = 999

    const reset = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(reset.state.player.roster[0].stages.attack).toBe(0)
    expect(reset.state.opponent.roster[0].stages.defense).toBe(0)

    reset.state.player.roster[0].moves[0].data = move({
      name: 'heal-bell',
      damageClass: 'status',
      power: null,
    })
    reset.state.player.roster[0].status = 'burn'
    reset.state.player.roster[1].status = 'poison'
    const cured = resolveBattleTurn(reset.state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(cured.state.player.roster.every((pokemon) => pokemon.status === null)).toBe(true)
    expect(cured.events).toContainEqual({ type: 'teamStatusCured', side: 'player' })
  })

  it('applies self-lowering and target-raising stat changes to the correct Pokémon', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'close-combat',
      type: 'fighting',
      power: 120,
      statChanges: [
        { stat: 'defense', change: -1 },
        { stat: 'specialDefense', change: -1 },
      ],
    })
    state.player.roster[0].stats[5] = 999

    const lowered = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(lowered.state.player.roster[0].stages).toMatchObject({ defense: -1, specialDefense: -1 })
    expect(lowered.state.opponent.roster[0].stages).toMatchObject({ defense: 0, specialDefense: 0 })

    lowered.state.player.roster[0].moves[0].data = move({
      name: 'swagger',
      type: 'normal',
      damageClass: 'status',
      power: null,
      statChanges: [{ stat: 'attack', change: 2 }],
    })
    const playerAttackBeforeSwagger = lowered.state.player.roster[0].stages.attack
    const raised = resolveBattleTurn(lowered.state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(raised.state.opponent.roster[0].stages.attack).toBe(2)
    expect(raised.state.player.roster[0].stages.attack).toBe(playerAttackBeforeSwagger)
  })

  it('removes a held item only when a removal move hits', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.opponent.roster[0].item = { name: 'leftovers', names: [], descriptions: [], sprite: null }
    state.player.roster[0].moves[0].data = move({ name: 'knock-off', type: 'dark', power: 65 })
    state.player.roster[0].stats[5] = 999

    const removed = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(removed.state.opponent.roster[0].item).toBeNull()
    expect(removed.events).toContainEqual({ type: 'itemRemoved', pokemon: 'opponent-0', item: 'leftovers' })

    const missed = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    missed.opponent.roster[0].item = { name: 'leftovers', names: [], descriptions: [], sprite: null }
    missed.player.roster[0].moves[0].data = move({ name: 'knock-off', type: 'dark', power: 65, accuracy: 50 })
    missed.player.roster[0].stats[5] = 999
    expect(
      resolveBattleTurn(missed, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5).state.opponent
        .roster[0].item,
    ).not.toBeNull()
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

  it('clears move stages on a switch while retaining Nature and item stats', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    playerTeam.members[0] = { ...playerTeam.members[0], nature: 'adamant', item: 'choice-band' }
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    const persistentAttack = state.player.roster[0].stats[1]
    state.player.roster[0].stages.attack = 2
    state.player.roster[0].stages.defense = -1

    const switched = resolveBattleTurn(state, { kind: 'switch', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(switched.state.player.roster[0].stages).toEqual({
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    })

    const returned = resolveBattleTurn(
      switched.state,
      { kind: 'switch', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(returned.state.player.roster[0].stats[1]).toBe(persistentAttack)
    expect(currentBattleStats(returned.state.player.roster[0])[1]).toBe(persistentAttack)
  })

  it('activates entry abilities on the initial send-out and each return to the field', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    playerTeam.members = playerTeam.members.map((entry) => ({
      ...entry,
      ability: 'intrepid-sword',
      abilityActive: true,
    }))
    const playerRoster = playerTeam.members.map((entry) =>
      createBattlePokemon(entry, { ...teamPokemon(entry.pokemon), abilities: ['intrepid-sword'] }, [
        move(),
        move(),
        move(),
        move(),
      ]),
    )
    const state = createBattleState(playerTeam, playerRoster, opponentTeam, roster(opponentTeam))

    expect(state.player.roster[0].stages.attack).toBe(1)
    expect(state.player.roster[0].stats[1]).toBe(state.player.roster[0].originalStats[1])

    const switched = resolveBattleTurn(state, { kind: 'switch', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(switched.state.player.roster[0].stages.attack).toBe(0)
    expect(switched.state.player.roster[1].stages.attack).toBe(1)
    expect(switched.events).toContainEqual(
      expect.objectContaining({ type: 'ability', pokemon: 'player-1', ability: 'intrepid-sword' }),
    )

    const returned = resolveBattleTurn(
      switched.state,
      { kind: 'switch', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(returned.state.player.roster[0].stages.attack).toBe(1)
    expect(returned.events).toContainEqual(
      expect.objectContaining({ type: 'ability', pokemon: 'player-0', ability: 'intrepid-sword' }),
    )
  })

  it('reapplies weather from an entry ability whenever its Pokémon returns', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    playerTeam.members[0] = { ...playerTeam.members[0], ability: 'drizzle' }
    playerTeam.members[1] = { ...playerTeam.members[1], ability: 'drought' }
    const playerRoster = playerTeam.members.map((entry) =>
      createBattlePokemon(entry, { ...teamPokemon(entry.pokemon), abilities: [entry.ability] }, [
        move(),
        move(),
        move(),
        move(),
      ]),
    )
    const state = createBattleState(playerTeam, playerRoster, opponentTeam, roster(opponentTeam))
    expect(state.field.weather).toBe('rain')

    const sun = resolveBattleTurn(state, { kind: 'switch', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(sun.state.field.weather).toBe('sun')
    expect(sun.events).toContainEqual(expect.objectContaining({ type: 'ability', ability: 'drought' }))

    const rain = resolveBattleTurn(sun.state, { kind: 'switch', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(rain.state.field.weather).toBe('rain')
    expect(rain.events).toContainEqual(expect.objectContaining({ type: 'ability', ability: 'drizzle' }))
  })

  it('applies terrain and Intimidate as Pokémon enter the field', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    playerTeam.members[0] = { ...playerTeam.members[0], ability: 'electric-surge' }
    opponentTeam.members[0] = { ...opponentTeam.members[0], ability: 'intimidate' }
    const playerRoster = playerTeam.members.map((entry) =>
      createBattlePokemon(entry, { ...teamPokemon(entry.pokemon), abilities: [entry.ability] }, [
        move(),
        move(),
        move(),
        move(),
      ]),
    )
    const opponentRoster = opponentTeam.members.map((entry) =>
      createBattlePokemon(entry, { ...teamPokemon(entry.pokemon), abilities: [entry.ability] }, [
        move(),
        move(),
        move(),
        move(),
      ]),
    )

    const state = createBattleState(playerTeam, playerRoster, opponentTeam, opponentRoster)

    expect(state.field).toMatchObject({ terrain: 'electric', terrainTurns: 5 })
    expect(state.player.roster[0].stages.attack).toBe(-1)
  })

  it('shows frozen Pokémon as unable to act until they thaw', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const frozenState = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    frozenState.player.roster[0].status = 'freeze'
    frozenState.player.roster[0].stats[5] = 999

    const frozen = resolveBattleTurn(frozenState, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(frozen.state.player.roster[0].status).toBe('freeze')
    expect(frozen.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })

    const thawedState = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    thawedState.player.roster[0].status = 'freeze'
    thawedState.player.roster[0].stats[5] = 999
    const thawed = resolveBattleTurn(thawedState, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0)
    expect(thawed.state.player.roster[0].status).toBeNull()
    expect(thawed.events).toContainEqual({ type: 'thaw', pokemon: 'player-0' })
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

  it('applies the correct same-type damage bonus while Terastallized', () => {
    const pokemon = createBattlePokemon({ ...member(0), tera: 'fire' }, teamPokemon('tera-attacker', ['water']), [
      move(),
      move(),
      move(),
      move(),
    ])

    expect(battleSameTypeAttackBonus(pokemon, 'water')).toBe(1.5)
    expect(battleSameTypeAttackBonus(pokemon, 'fire')).toBe(1)

    pokemon.terastallized = true
    expect(battleSameTypeAttackBonus(pokemon, 'water')).toBe(1.5)
    expect(battleSameTypeAttackBonus(pokemon, 'fire')).toBe(1.5)
    expect(battleSameTypeAttackBonus(pokemon, 'grass')).toBe(1)

    pokemon.pokemon.types = ['fire']
    expect(battleSameTypeAttackBonus(pokemon, 'fire')).toBe(2)
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

  it('moves both sides’ entry hazards with Court Change', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.hazards = { stealthRock: true, spikes: 2, toxicSpikes: 0, stickyWeb: false }
    state.opponent.hazards = { stealthRock: false, spikes: 0, toxicSpikes: 1, stickyWeb: true }
    state.player.roster[0].moves[0].data = move({
      name: 'court-change',
      type: 'normal',
      damageClass: 'status',
      power: null,
    })
    state.player.roster[0].stats[5] = 999

    const changed = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(changed.state.player.hazards).toEqual({ stealthRock: false, spikes: 0, toxicSpikes: 1, stickyWeb: true })
    expect(changed.state.opponent.hazards).toEqual({ stealthRock: true, spikes: 2, toxicSpikes: 0, stickyWeb: false })
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
