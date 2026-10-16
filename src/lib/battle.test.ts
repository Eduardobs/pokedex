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

  it('records each opponent move once, up to its four move slots', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    let state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))

    for (const index of [0, 1, 2, 3, 3]) {
      state = resolveBattleTurn(state, { kind: 'move', index: 2 }, { kind: 'move', index }, () => 0.5).state
    }

    expect(state.opponent.roster[0].revealedMoves).toEqual(['tackle', 'quick-attack', 'recover', 'growl'])
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

  it('applies status-linked ability modifiers and status-healing abilities', () => {
    const abilityPokemon = (ability: string) =>
      createBattlePokemon({ ...member(0), ability }, { ...teamPokemon(ability), abilities: [ability] }, [
        move(),
        move(),
        move(),
        move(),
      ])

    const guts = abilityPokemon('guts')
    guts.status = 'burn'
    expect(currentBattleStats(guts)[1]).toBe(Math.floor(guts.stats[1] * 1.5))

    const quickFeet = abilityPokemon('quick-feet')
    quickFeet.status = 'paralysis'
    expect(currentBattleStats(quickFeet)[5]).toBe(Math.floor(quickFeet.stats[5] * 1.5))

    const marvelScale = abilityPokemon('marvel-scale')
    marvelScale.status = 'sleep'
    expect(currentBattleStats(marvelScale)[2]).toBe(Math.floor(marvelScale.stats[2] * 1.5))

    const flareBoost = abilityPokemon('flare-boost')
    flareBoost.status = 'burn'
    expect(currentBattleStats(flareBoost)[3]).toBe(flareBoost.stats[3] * 2)

    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const hydrated = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    hydrated.player.roster[0].ability.name = 'hydration'
    hydrated.player.roster[0].status = 'burn'
    hydrated.field.weather = 'rain'
    hydrated.field.weatherTurns = 5
    const cured = resolveBattleTurn(hydrated, { kind: 'move', index: 2 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(cured.state.player.roster[0].status).toBeNull()

    const poisonHeal = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    poisonHeal.player.roster[0].ability.name = 'poison-heal'
    poisonHeal.player.roster[0].status = 'poison'
    poisonHeal.player.roster[0].hp -= 50
    const healed = resolveBattleTurn(poisonHeal, { kind: 'move', index: 2 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(healed.state.player.roster[0].hp).toBeGreaterThan(poisonHeal.player.roster[0].hp)
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

  it('splits the combatants current HP with Pain Split', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'pain-split',
      type: 'normal',
      damageClass: 'status',
      power: null,
    })
    state.player.roster[0].hp = 101
    state.opponent.roster[0].hp = 300
    state.player.roster[0].stats[5] = 999

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)

    expect(result.state.player.roster[0].hp).toBe(200)
    expect(result.state.opponent.roster[0].hp).toBe(200)
    expect(result.events).toContainEqual({ type: 'heal', pokemon: 'player-0', amount: 99 })
    expect(result.events).toContainEqual({
      type: 'damage',
      pokemon: 'opponent-0',
      amount: 100,
      effectiveness: 1,
      critical: false,
    })
  })

  it('creates a Substitute that costs HP and absorbs incoming damage', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'substitute',
      type: 'normal',
      damageClass: 'status',
      power: null,
      target: 'user',
    })
    state.player.roster[0].stats[5] = 999
    const initialHp = state.player.roster[0].hp
    const substituteCost = Math.floor(state.player.roster[0].maxHp / 4)

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(result.state.player.roster[0].hp).toBe(initialHp - substituteCost)
    expect(result.state.player.roster[0].substituteHp).toBeGreaterThan(0)
    expect(result.state.player.roster[0].substituteHp).toBeLessThan(substituteCost)
    expect(result.events).toContainEqual({ type: 'substituteSet', pokemon: 'player-0', hp: substituteCost })
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'substituteDamage', pokemon: 'player-0', broken: false }),
    )
    expect(result.events).not.toContainEqual(expect.objectContaining({ type: 'damage', pokemon: 'player-0' }))
  })

  it('breaks a Substitute without carrying excess damage to its user and rejects an unaffordable replacement', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'substitute',
      type: 'normal',
      damageClass: 'status',
      power: null,
      target: 'user',
    })
    state.opponent.roster[0].moves[0].data = move({ power: 1_000 })
    state.player.roster[0].stats[5] = 999
    const substituteCost = Math.floor(state.player.roster[0].maxHp / 4)

    const broken = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(broken.state.player.roster[0].hp).toBe(state.player.roster[0].hp - substituteCost)
    expect(broken.state.player.roster[0].substituteHp).toBe(0)
    expect(broken.events).toContainEqual({
      type: 'substituteDamage',
      pokemon: 'player-0',
      amount: substituteCost,
      broken: true,
    })

    broken.state.player.roster[0].hp = substituteCost
    broken.state.opponent.roster[0].moves[0].data = move({ name: 'growl', damageClass: 'status', power: null })
    const failed = resolveBattleTurn(broken.state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(failed.state.player.roster[0].hp).toBe(substituteCost)
    expect(failed.state.player.roster[0].substituteHp).toBe(0)
    expect(failed.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })
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
    reset.state.player.roster[2].confusionTurns = 2
    reset.state.player.roster[3].attracted = true
    const cured = resolveBattleTurn(reset.state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(cured.state.player.roster.every((pokemon) => pokemon.status === null)).toBe(true)
    expect(cured.state.player.roster[2].confusionTurns).toBe(2)
    expect(cured.state.player.roster[3].attracted).toBe(true)
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

  it('enforces major-status immunities and applies burn through the calculated attack stat', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const immune = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    immune.player.roster[0].moves[0].data = move({
      name: 'will-o-wisp',
      type: 'fire',
      damageClass: 'status',
      power: null,
      ailment: 'burn',
      ailmentChance: 100,
    })
    immune.player.roster[0].stats[5] = 999
    immune.opponent.roster[0].pokemon.types = ['fire']

    const result = resolveBattleTurn(immune, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(result.state.opponent.roster[0].status).toBeNull()

    const burned = createBattlePokemon(member(0), teamPokemon('burned'), [move(), move(), move(), move()])
    burned.status = 'burn'
    expect(currentBattleStats(burned)[1]).toBe(Math.floor(burned.stats[1] / 2))
  })

  it('applies escalating toxic damage and keeps Toxic after switching while resetting its counter', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'toxic',
      type: 'poison',
      damageClass: 'status',
      power: null,
      ailment: 'poison',
      ailmentChance: 100,
    })
    state.player.roster[0].stats[5] = 999

    const poisoned = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    const firstDamage = poisoned.events.find((event) => event.type === 'statusDamage' && event.pokemon === 'opponent-0')
    expect(poisoned.state.opponent.roster[0]).toMatchObject({ status: 'badly-poisoned', toxicTurns: 1 })
    expect(firstDamage).toMatchObject({
      status: 'badly-poisoned',
      amount: Math.floor(poisoned.state.opponent.roster[0].maxHp / 16),
    })

    const switched = resolveBattleTurn(
      poisoned.state,
      { kind: 'move', index: 2 },
      { kind: 'switch', index: 1 },
      () => 0.5,
    )
    expect(switched.state.opponent.roster[0]).toMatchObject({ status: 'badly-poisoned', toxicTurns: 0 })
  })

  it('allows volatile statuses beside a major status and clears them when switching out', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'confuse-ray',
      type: 'ghost',
      damageClass: 'status',
      power: null,
      ailment: 'confusion',
      ailmentChance: 100,
    })
    state.player.roster[0].stats[5] = 999
    state.opponent.roster[0].status = 'burn'

    const confused = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(confused.state.opponent.roster[0].status).toBe('burn')
    expect(confused.state.opponent.roster[0].confusionTurns).toBeGreaterThan(0)

    const switched = resolveBattleTurn(
      confused.state,
      { kind: 'move', index: 2 },
      { kind: 'switch', index: 1 },
      () => 0.5,
    )
    expect(switched.state.opponent.roster[0].confusionTurns).toBe(0)
    expect(switched.state.opponent.roster[0].status).toBe('burn')
  })

  it('uses current-generation sleep, confusion, Toxic, and residual ability rules', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const confused = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    confused.player.roster[0].confusionTurns = 1
    confused.player.roster[0].stats[5] = 999
    const hp = confused.player.roster[0].hp
    const hurt = resolveBattleTurn(confused, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0)
    expect(hurt.state.player.roster[0].hp).toBeLessThan(hp)
    expect(hurt.events).toContainEqual(expect.objectContaining({ type: 'damage', pokemon: 'player-0' }))
    expect(hurt.state.player.roster[0].confusionTurns).toBe(0)

    const protectedState = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    protectedState.player.roster[0].moves[0].data = move({ name: 'safeguard', damageClass: 'status', power: null })
    protectedState.player.roster[0].stats[5] = 999
    const safeguarded = resolveBattleTurn(
      protectedState,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(safeguarded.state.player.conditions.safeguard).toBeGreaterThan(0)

    const poisoned = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    poisoned.player.roster[0].ability.name = 'poison-heal'
    poisoned.player.roster[0].status = 'poison'
    poisoned.player.roster[0].hp -= 100
    const poisonHealed = resolveBattleTurn(poisoned, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(poisonHealed.events).toContainEqual(
      expect.objectContaining({
        type: 'heal',
        pokemon: 'player-0',
        amount: Math.floor(poisoned.player.roster[0].maxHp / 8),
      }),
    )

    const heatproof = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    heatproof.player.roster[0].ability.name = 'heatproof'
    heatproof.player.roster[0].status = 'burn'
    const burned = resolveBattleTurn(heatproof, { kind: 'move', index: 2 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(burned.events).toContainEqual(
      expect.objectContaining({
        type: 'statusDamage',
        pokemon: 'player-0',
        amount: Math.floor(heatproof.player.roster[0].maxHp / 32),
      }),
    )
  })

  it('applies volatile move effects, their restrictions, and their residual damage', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const seeded = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    seeded.player.roster[0].moves[0].data = move({
      name: 'leech-seed',
      type: 'grass',
      damageClass: 'status',
      power: null,
    })
    seeded.player.roster[0].stats[5] = 999
    seeded.player.roster[0].hp -= 80
    const drained = resolveBattleTurn(seeded, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(drained.state.opponent.roster[0].volatile['leech-seed']).toBeLessThan(0)
    expect(drained.state.opponent.roster[0].hp).toBeLessThan(seeded.opponent.roster[0].hp)
    expect(drained.state.player.roster[0].hp).toBeGreaterThan(seeded.player.roster[0].hp)

    const healingBlocked = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    healingBlocked.player.roster[0].moves[0].data = move({
      name: 'heal-block',
      type: 'psychic',
      damageClass: 'status',
      power: null,
    })
    healingBlocked.player.roster[0].stats[5] = 999
    const blocked = resolveBattleTurn(healingBlocked, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(blocked.state.opponent.roster[0].volatile['heal-block']).toBeGreaterThan(0)
    const before = blocked.state.opponent.roster[0].hp
    blocked.state.opponent.roster[0].hp -= 50
    blocked.state.opponent.roster[0].moves[2].data = move({
      name: 'recover',
      damageClass: 'status',
      power: null,
      healing: 50,
    })
    const cannotHeal = resolveBattleTurn(
      blocked.state,
      { kind: 'move', index: 2 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(cannotHeal.state.opponent.roster[0].hp).toBeLessThanOrEqual(before - 50)
  })

  it('enforces the remaining modern volatile effects and their immunities', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')

    const aquaRing = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    aquaRing.player.roster[0].moves[0].data = move({
      name: 'aqua-ring',
      type: 'water',
      damageClass: 'status',
      power: null,
    })
    aquaRing.player.roster[0].hp -= 80
    aquaRing.player.roster[0].stats[5] = 999
    const ringed = resolveBattleTurn(aquaRing, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(ringed.state.player.roster[0].volatile['aqua-ring']).toBeLessThan(0)
    expect(ringed.state.player.roster[0].hp).toBeGreaterThan(aquaRing.player.roster[0].hp)

    const yawned = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    yawned.player.roster[0].moves[0].data = move({ name: 'yawn', damageClass: 'status', power: null })
    yawned.player.roster[0].stats[5] = 999
    const drowsy = resolveBattleTurn(yawned, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    const asleep = resolveBattleTurn(drowsy.state, { kind: 'move', index: 2 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(asleep.state.opponent.roster[0].status).toBe('sleep')

    const disabled = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    disabled.player.roster[0].moves[0].data = move({ name: 'disable', damageClass: 'status', power: null })
    disabled.opponent.roster[0].lastMoveIndex = 1
    disabled.player.roster[0].stats[5] = 999
    const cannotUse = resolveBattleTurn(disabled, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(legalBattleMoveIndexes(cannotUse.state.opponent.roster[0])).not.toContain(1)

    const nightmare = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    nightmare.player.roster[0].moves[0].data = move({ name: 'nightmare', damageClass: 'status', power: null })
    nightmare.player.roster[0].stats[5] = 999
    nightmare.opponent.roster[0].status = 'sleep'
    nightmare.opponent.roster[0].sleepTurns = 3
    const haunted = resolveBattleTurn(nightmare, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(haunted.state.opponent.roster[0].volatile.nightmare).toBeLessThan(0)

    const salt = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    salt.player.roster[0].moves[0].data = move({ name: 'salt-cure', type: 'rock', power: 40 })
    salt.player.roster[0].stats[5] = 999
    salt.opponent.roster[0].pokemon.types = ['water']
    const salted = resolveBattleTurn(salt, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(salted.state.opponent.roster[0].volatile['salt-cure']).toBeLessThan(0)
    expect(salted.events).toContainEqual(expect.objectContaining({ type: 'damage', pokemon: 'opponent-0' }))

    const tarred = createBattlePokemon(member(0), teamPokemon('tarred'), [move(), move(), move(), move()])
    tarred.volatile['tar-shot'] = -1
    expect(battleMoveEffectiveness(move({ type: 'fire' }), tarred)).toBe(2)

    const guarded = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    guarded.player.conditions.safeguard = 5
    guarded.opponent.roster[0].moves[0].data = move({
      name: 'will-o-wisp',
      type: 'fire',
      damageClass: 'status',
      power: null,
      ailment: 'burn',
      ailmentChance: 100,
    })
    guarded.opponent.roster[0].stats[5] = 999
    const protectedResult = resolveBattleTurn(
      guarded,
      { kind: 'move', index: 2 },
      { kind: 'move', index: 0 },
      () => 0.5,
    )
    expect(protectedResult.state.player.roster[0].status).toBeNull()
  })

  it('applies attraction only to compatible genders and makes Ghost Curse deal residual damage', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const attracted = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    attracted.player.roster[0].moves[0].data = move({
      name: 'attract',
      damageClass: 'status',
      power: null,
      ailment: 'infatuation',
      ailmentChance: 100,
    })
    attracted.player.roster[0].stats[5] = 999
    attracted.opponent.roster[0].member.gender = 'female'
    const attractedResult = resolveBattleTurn(
      attracted,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.9,
    )
    expect(attractedResult.state.opponent.roster[0].attracted).toBe(true)

    const cursed = createBattleState(playerTeam, roster(playerTeam, ['ghost']), opponentTeam, roster(opponentTeam))
    cursed.player.roster[0].moves[0].data = move({ name: 'curse', type: 'ghost', damageClass: 'status', power: null })
    cursed.player.roster[0].stats[5] = 999
    const cursedResult = resolveBattleTurn(cursed, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(cursedResult.state.opponent.roster[0].cursed).toBe(true)
    expect(cursedResult.events).toContainEqual(
      expect.objectContaining({ type: 'statusDamage', pokemon: 'opponent-0', status: 'curse' }),
    )
  })

  it('fully executes Ghost Curse through Protect and lets its HP cost knock out the user', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam, ['ghost']), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'curse',
      type: 'ghost',
      damageClass: 'status',
      power: null,
    })
    state.opponent.roster[0].moves[0].data = move({
      name: 'protect',
      damageClass: 'status',
      power: null,
      priority: 4,
      target: 'user',
    })
    const hpCost = Math.floor(state.player.roster[0].maxHp / 2)
    state.player.roster[0].hp = hpCost

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(result.state.player.roster[0].hp).toBe(0)
    expect(result.state.opponent.roster[0].cursed).toBe(true)
    expect(result.events).toContainEqual({
      type: 'damage',
      pokemon: 'player-0',
      amount: hpCost,
      effectiveness: 1,
      critical: false,
    })
    expect(result.events).toContainEqual({ type: 'status', pokemon: 'opponent-0', status: 'curse' })
    expect(result.events).toContainEqual({ type: 'faint', pokemon: 'player-0' })
  })

  it('does not charge Ghost Curse when the target is already cursed or protected by Crafty Shield', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const curseMove = move({ name: 'curse', type: 'ghost', damageClass: 'status', power: null })
    const alreadyCursed = createBattleState(
      playerTeam,
      roster(playerTeam, ['ghost']),
      opponentTeam,
      roster(opponentTeam),
    )
    alreadyCursed.player.roster[0].moves[0].data = curseMove
    alreadyCursed.player.roster[0].stats[5] = 999
    alreadyCursed.opponent.roster[0].cursed = true
    const initialHp = alreadyCursed.player.roster[0].hp

    const failed = resolveBattleTurn(alreadyCursed, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(failed.state.player.roster[0].hp).toBe(initialHp)
    expect(failed.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })

    const shielded = createBattleState(playerTeam, roster(playerTeam, ['ghost']), opponentTeam, roster(opponentTeam))
    shielded.player.roster[0].moves[0].data = curseMove
    shielded.opponent.roster[0].moves[0].data = move({
      name: 'crafty-shield',
      type: 'fairy',
      damageClass: 'status',
      power: null,
      priority: 3,
      target: 'user-side',
    })
    const blocked = resolveBattleTurn(shielded, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(blocked.state.player.roster[0].hp).toBe(shielded.player.roster[0].hp)
    expect(blocked.state.opponent.roster[0].cursed).toBe(false)
    expect(blocked.events).toContainEqual({ type: 'protected', pokemon: 'player-0' })
  })

  it('uses the current type for both Curse variants and applies the non-Ghost stage changes', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const curseMove = move({
      name: 'curse',
      type: 'ghost',
      damageClass: 'status',
      power: null,
      target: 'user',
      statChanges: [
        { stat: 'speed', change: -1 },
        { stat: 'attack', change: 1 },
        { stat: 'defense', change: 1 },
      ],
    })
    const lostGhostType = createBattleState(
      playerTeam,
      roster(playerTeam, ['ghost']),
      opponentTeam,
      roster(opponentTeam),
    )
    lostGhostType.player.roster[0].moves[0].data = curseMove
    lostGhostType.player.roster[0].terastallized = true
    lostGhostType.player.roster[0].member.tera = 'water'
    lostGhostType.player.roster[0].stats[5] = 999

    const boosted = resolveBattleTurn(lostGhostType, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(boosted.state.player.roster[0].stages).toMatchObject({ attack: 1, defense: 1, speed: -1 })
    expect(boosted.state.opponent.roster[0].cursed).toBe(false)

    const gainedGhostType = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    gainedGhostType.player.roster[0].moves[0].data = curseMove
    gainedGhostType.player.roster[0].terastallized = true
    gainedGhostType.player.roster[0].member.tera = 'ghost'
    gainedGhostType.player.roster[0].stats[5] = 999
    const initialGhostHp = gainedGhostType.player.roster[0].hp

    const cursed = resolveBattleTurn(gainedGhostType, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(cursed.state.player.roster[0].hp).toBe(
      initialGhostHp - Math.floor(gainedGhostType.player.roster[0].maxHp / 2),
    )
    expect(cursed.state.player.roster[0].stages).toMatchObject({ attack: 0, defense: 0, speed: 0 })
    expect(cursed.state.opponent.roster[0].cursed).toBe(true)
  })

  it('fails non-Ghost Curse when no opponent remains on the field', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'curse',
      type: 'ghost',
      damageClass: 'status',
      power: null,
      target: 'user',
    })
    state.player.roster[0].stats[5] = 999
    state.opponent.roster.forEach((pokemon) => {
      pokemon.hp = 0
    })

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(result.state.player.roster[0].stages).toMatchObject({ attack: 0, defense: 0, speed: 0 })
  })

  it('transfers Ghost Curse when the afflicted Pokémon switches with Baton Pass', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].cursed = true
    state.player.roster[0].moves[0].data = move({
      name: 'baton-pass',
      damageClass: 'status',
      power: null,
      target: 'user',
    })
    state.player.roster[0].stats[5] = 999

    const passing = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(passing.state.phase).toBe('player-switch')
    const switched = resolveBattleTurn(
      passing.state,
      { kind: 'switch', index: 1 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )

    expect(switched.state.player.roster[0].cursed).toBe(false)
    expect(switched.state.player.roster[1].cursed).toBe(true)
  })

  it('handles Rest, thawing moves, status cures on switch, and two layers of Toxic Spikes', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')

    const resting = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    resting.player.roster[0].moves[0].data = move({ name: 'rest', type: 'psychic', damageClass: 'status', power: null })
    resting.player.roster[0].hp -= 100
    resting.player.roster[0].status = 'burn'
    resting.player.roster[0].stats[5] = 999
    const rested = resolveBattleTurn(resting, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(rested.state.player.roster[0]).toMatchObject({
      hp: rested.state.player.roster[0].maxHp,
      status: 'sleep',
      sleepTurns: 2,
    })

    const firstSleepingTurn = resolveBattleTurn(
      rested.state,
      { kind: 'move', index: 2 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(firstSleepingTurn.state.player.roster[0]).toMatchObject({ status: 'sleep', sleepTurns: 1 })
    const secondSleepingTurn = resolveBattleTurn(
      firstSleepingTurn.state,
      { kind: 'move', index: 2 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(secondSleepingTurn.state.player.roster[0]).toMatchObject({ status: 'sleep', sleepTurns: 0 })
    const restedAwake = resolveBattleTurn(
      secondSleepingTurn.state,
      { kind: 'move', index: 2 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(restedAwake.state.player.roster[0].status).toBeNull()

    const restBlocked = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    restBlocked.player.roster[0].moves[0].data = move({
      name: 'rest',
      type: 'psychic',
      damageClass: 'status',
      power: null,
    })
    restBlocked.player.roster[0].hp -= 100
    restBlocked.player.roster[0].status = 'burn'
    restBlocked.player.roster[0].volatile['heal-block'] = 5
    restBlocked.player.roster[0].stats[5] = 999
    const restBlockedHp = restBlocked.player.roster[0].hp
    const blockedRest = resolveBattleTurn(
      restBlocked,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(blockedRest.state.player.roster[0].hp).toBeLessThan(restBlockedHp)
    expect(blockedRest.state.player.roster[0].status).toBe('burn')
    expect(blockedRest.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })

    const frozen = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    frozen.player.roster[0].moves[0].data = move({ name: 'flame-wheel', type: 'fire', power: 60 })
    frozen.player.roster[0].status = 'freeze'
    frozen.player.roster[0].stats[5] = 999
    const thawed = resolveBattleTurn(frozen, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(thawed.state.player.roster[0].status).toBeNull()
    expect(thawed.events).toContainEqual({ type: 'thaw', pokemon: 'player-0' })

    const naturalCure = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    naturalCure.player.roster[0].ability.name = 'natural-cure'
    naturalCure.player.roster[0].status = 'paralysis'
    const switched = resolveBattleTurn(naturalCure, { kind: 'switch', index: 1 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(switched.state.player.roster[0].status).toBeNull()

    const spikes = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    spikes.opponent.hazards.toxicSpikes = 2
    spikes.phase = 'opponent-switch'
    const spiked = resolveBattleTurn(spikes, { kind: 'move', index: 2 }, { kind: 'switch', index: 1 }, () => 0.5)
    expect(spiked.state.opponent.roster[1].status).toBe('badly-poisoned')
  })

  it('blocks attacks with Protect, reduces its successive success chance, and resets it after failure', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'protect', damageClass: 'status', power: null, priority: 4 })
    const protectedTurn = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0.5)

    expect(protectedTurn.state.player.roster[0].hp).toBe(state.player.roster[0].hp)
    expect(protectedTurn.state.player.roster[0].protectStreak).toBe(1)
    expect(protectedTurn.events).toContainEqual({ type: 'protected', pokemon: 'player-0' })

    const failedSuccessiveProtect = resolveBattleTurn(
      protectedTurn.state,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
      () => 0.5,
    )
    expect(failedSuccessiveProtect.state.player.roster[0].hp).toBeLessThan(protectedTurn.state.player.roster[0].hp)
    expect(failedSuccessiveProtect.state.player.roster[0].protectStreak).toBe(0)
  })

  it('fails Ally Switch in the singles battle format because no ally is on the field', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'ally-switch',
      damageClass: 'status',
      power: null,
      priority: 2,
    })
    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)

    expect(result.state.player.active).toBe(0)
    expect(result.state.player.roster[0].moves[0].pp).toBe(34)
    expect(result.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })
  })

  it('allows sleep moves and cures their documented target statuses', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')

    const sleepTalk = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    sleepTalk.player.roster[0].moves[0].data = move({ name: 'sleep-talk', damageClass: 'status', power: null })
    sleepTalk.player.roster[0].status = 'sleep'
    sleepTalk.player.roster[0].sleepTurns = 1
    sleepTalk.player.roster[0].stats[5] = 999
    const talked = resolveBattleTurn(sleepTalk, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0)
    expect(talked.events).toContainEqual(
      expect.objectContaining({ type: 'move', pokemon: 'player-0', move: 'sleep-talk' }),
    )
    expect(talked.events).toContainEqual(
      expect.objectContaining({ type: 'move', pokemon: 'player-0', move: 'quick-attack' }),
    )

    const awakeSleepMoves = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    awakeSleepMoves.player.roster[0].moves[0].data = move({ name: 'sleep-talk', damageClass: 'status', power: null })
    awakeSleepMoves.player.roster[0].stats[5] = 999
    const awakeSleepTalk = resolveBattleTurn(
      awakeSleepMoves,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(awakeSleepTalk.state.opponent.roster[0].hp).toBe(awakeSleepMoves.opponent.roster[0].hp)
    expect(awakeSleepTalk.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })

    awakeSleepMoves.player.roster[0].moves[0].data = move({ name: 'snore', damageClass: 'special', power: 50 })
    const awakeSnore = resolveBattleTurn(
      awakeSleepMoves,
      { kind: 'move', index: 0 },
      { kind: 'move', index: 2 },
      () => 0.5,
    )
    expect(awakeSnore.state.opponent.roster[0].hp).toBe(awakeSleepMoves.opponent.roster[0].hp)
    expect(awakeSnore.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })

    const wakeUpSlap = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    wakeUpSlap.player.roster[0].moves[0].data = move({ name: 'wake-up-slap', type: 'fighting', power: 70 })
    wakeUpSlap.player.roster[0].stats[5] = 999
    wakeUpSlap.opponent.roster[0].status = 'sleep'
    wakeUpSlap.opponent.roster[0].sleepTurns = 2
    const awakened = resolveBattleTurn(wakeUpSlap, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(awakened.state.opponent.roster[0].status).toBeNull()

    const salts = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    salts.player.roster[0].moves[0].data = move({ name: 'smelling-salts', type: 'normal', power: 70 })
    salts.player.roster[0].stats[5] = 999
    salts.opponent.roster[0].status = 'paralysis'
    const cured = resolveBattleTurn(salts, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(cured.state.opponent.roster[0].status).toBeNull()
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
