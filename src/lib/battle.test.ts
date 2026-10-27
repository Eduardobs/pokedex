import { BATTLE_DIFFICULTIES } from './battle-ai'
import { describe, expect, it } from 'vitest'
import {
  battleMoveEffectiveness,
  STRUGGLE_INDEX,
  STRUGGLE_MOVE,
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

describe('Struggle fallback', () => {
  const setup = () => {
    const player = team('player')
    const opponent = team('opponent')
    const state = createBattleState(player, roster(player), opponent, roster(opponent))
    state.player.roster[0].moves.forEach((slot) => {
      slot.pp = 0
    })
    return state
  }

  it('only offers the fallback when all moves are unusable, including restrictions', () => {
    const state = setup()
    const user = state.player.roster[0]
    expect(legalBattleMoveIndexes(user)).toEqual([STRUGGLE_INDEX])
    user.moves[0].pp = 1
    expect(legalBattleMoveIndexes(user)).toEqual([0])
    user.disabledMoveIndex = 0
    user.volatile.disable = 3
    expect(legalBattleMoveIndexes(user)).toEqual([STRUGGLE_INDEX])
    user.recharging = true
    expect(legalBattleMoveIndexes(user)).toEqual([])
  })

  it.each(['magic-guard', 'rock-head', 'reckless'])(
    'hits Ghosts through Wonder Guard and applies maximum-HP recoil with %s',
    (ability) => {
      const state = setup()
      const user = state.player.roster[0]
      user.ability.name = ability
      user.maxHp = user.hp = 301
      user.stages.accuracy = -6
      const target = state.opponent.roster[0]
      target.pokemon.types = ['ghost']
      target.ability.name = 'wonder-guard'
      target.stages.evasion = 6
      expect(battleMoveEffectiveness(STRUGGLE_MOVE, target, user)).toBe(1)
      const result = resolveBattleTurn(state, { kind: 'move', index: -1 }, { kind: 'switch', index: 0 }, () => 0.99)
      expect(result.state.opponent.roster[0].hp).toBeLessThan(target.hp)
      expect(result.state.player.roster[0].hp).toBe(226)
      expect(result.state.player.roster[0].moves.map((slot) => slot.pp)).toEqual([0, 0, 0, 0])
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'move', move: 'struggle' }))
      expect(result.events.some((event) => event.type === 'miss')).toBe(false)
    },
  )

  it.each(['protect', 'detect'])('is blocked by %s without recoil', (name) => {
    const state = setup()
    state.opponent.roster[0].moves[0].data = move({
      name,
      damageClass: 'status',
      power: null,
      target: 'user',
      priority: 4,
    })
    const result = resolveBattleTurn(state, { kind: 'move', index: -1 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(result.state.player.roster[0].hp).toBe(state.player.roster[0].hp)
    expect(result.state.opponent.roster[0].hp).toBe(state.opponent.roster[0].hp)
    expect(result.events.some((event) => event.type === 'protected')).toBe(true)
  })

  it('does not receive STAB, including Normal Terastallization', () => {
    const damage = (types: string[], tera: boolean) => {
      const state = setup()
      state.player.roster[0].pokemon.types = types
      state.player.roster[0].terastallized = tera
      return resolveBattleTurn(state, { kind: 'move', index: -1 }, { kind: 'switch', index: 0 }, () => 0.5).state
        .opponent.roster[0].hp
    }
    expect(damage(['normal'], true)).toBe(damage(['water'], false))
  })

  it('applies recoil through Substitute and can faint the user', () => {
    const state = setup()
    state.player.roster[0].hp = 1
    state.opponent.roster[0].substituteHp = 100
    const result = resolveBattleTurn(state, { kind: 'move', index: -1 }, { kind: 'switch', index: 0 }, () => 0.5)
    expect(result.state.opponent.roster[0].hp).toBe(state.opponent.roster[0].hp)
    expect(result.state.opponent.roster[0].substituteHp).toBeLessThan(100)
    expect(result.state.player.roster[0].hp).toBe(0)
    expect(result.events).toContainEqual({ type: 'faint', pokemon: state.player.roster[0].pokemon.name })
    expect(result.state.phase).toBe('player-switch')
  })

  it.each(BATTLE_DIFFICULTIES)('allows the %s AI to use Struggle repeatedly', (difficulty) => {
    const state = setup()
    state.opponent.roster.forEach((pokemon) =>
      pokemon.moves.forEach((slot) => {
        slot.pp = 0
      }),
    )
    const choice = chooseOpponentAction(state, () => 0.5, difficulty)
    expect(choice).toMatchObject({ kind: 'move', index: STRUGGLE_INDEX })
    const result = resolveBattleTurn(state, { kind: 'move', index: -1 }, choice, () => 0.5)
    expect(legalBattleMoveIndexes(result.state.opponent.roster[0])).toEqual([STRUGGLE_INDEX])
  })
})

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
    pokemon.stages = { accuracy: 0, evasion: 0, attack: 2, defense: -1, specialAttack: 1, specialDefense: -2, speed: 1 }
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

  it.each([
    ['volt-absorb', 'electric', 'heal', null],
    ['water-absorb', 'water', 'heal', null],
    ['dry-skin', 'water', 'heal', null],
    ['earth-eater', 'ground', 'heal', null],
    ['lightning-rod', 'electric', 'stage', 'specialAttack'],
    ['motor-drive', 'electric', 'stage', 'speed'],
    ['storm-drain', 'water', 'stage', 'specialAttack'],
    ['sap-sipper', 'grass', 'stage', 'attack'],
    ['well-baked-body', 'fire', 'stage', 'defense'],
  ] as const)('%s absorbs %s moves and applies its follow-up effect', (ability, type, effect, stat) => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ type, damageClass: 'special' })
    state.player.roster[0].stats[5] = 999
    state.opponent.roster[0].ability.name = ability
    state.opponent.roster[0].hp -= 100

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)

    expect(result.events).toContainEqual({ type: 'immune', pokemon: 'opponent-0' })
    expect(result.events).toContainEqual({ type: 'ability', pokemon: 'opponent-0', ability })
    if (effect === 'heal') expect(result.state.opponent.roster[0].hp).toBeGreaterThan(state.opponent.roster[0].hp)
    if (stat) expect(result.state.opponent.roster[0].stages[stat]).toBe(ability === 'well-baked-body' ? 2 : 1)
  })

  it('lets Mold Breaker bypass supplemental move-type immunities', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].ability.name = 'mold-breaker'
    state.player.roster[0].moves[0].data = move({ type: 'ground' })
    state.player.roster[0].stats[5] = 999
    state.opponent.roster[0].ability.name = 'levitate'

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)

    expect(result.events).not.toContainEqual({ type: 'immune', pokemon: 'opponent-0' })
    expect(result.state.opponent.roster[0].hp).toBeLessThan(state.opponent.roster[0].hp)
  })

  it('applies supplemental weather recovery and status immunity rules', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.field.weather = 'rain'
    state.field.weatherTurns = 5
    state.player.roster[0].ability.name = 'rain-dish'
    state.player.roster[0].hp -= 100
    state.player.roster[0].moves[0].data = move({
      damageClass: 'status',
      power: null,
      ailment: 'poison',
      ailmentChance: 100,
    })
    state.opponent.roster[0].ability.name = 'pastel-veil'

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0)

    expect(result.state.player.roster[0].hp).toBeGreaterThan(state.player.roster[0].hp)
    expect(result.state.opponent.roster[0].status).toBeNull()
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
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'damage',
        pokemon: 'opponent-0',
        amount: 100,
        effectiveness: 1,
        critical: false,
      }),
    )
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
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'heal', pokemon: 'player-0', amount: 99 }))
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'damage',
        pokemon: 'opponent-0',
        amount: 100,
        effectiveness: 1,
        critical: false,
      }),
    )
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
      accuracy: 0,
      evasion: 0,
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
    expect(currentBattleStats(returned.state.player.roster[0])[1]).toBe(Math.floor(persistentAttack * 1.5))
  })

  it('consumes White Herb once and restores every lowered stat stage', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    const pokemon = state.player.roster[0]
    pokemon.item = { name: 'white-herb', names: [], descriptions: [], sprite: null }
    pokemon.stages.attack = -2
    pokemon.stages.speed = -1
    pokemon.stats[5] = 999

    const result = resolveBattleTurn(state, { kind: 'move', index: 2 }, { kind: 'move', index: 2 }, () => 0.5)

    expect(result.state.player.roster[0].stages).toMatchObject({ attack: 0, speed: 0 })
    expect(result.state.player.roster[0].item).toBeNull()
    expect(result.events).toContainEqual({
      type: 'itemActivated',
      pokemon: 'player-0',
      item: 'white-herb',
      consumed: true,
    })
  })

  it('applies Life Orb damage power and recoil after a damaging move', () => {
    const makeState = (withItem: boolean) => {
      const playerTeam = team('player')
      const opponentTeam = team('opponent')
      const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
      state.player.roster[0].stats[5] = 999
      if (withItem) state.player.roster[0].item = { name: 'life-orb', names: [], descriptions: [], sprite: null }
      return state
    }
    const regular = resolveBattleTurn(
      makeState(false),
      { kind: 'move', index: 0 },
      { kind: 'move', index: 3 },
      () => 0.5,
    )
    const boosted = resolveBattleTurn(
      makeState(true),
      { kind: 'move', index: 0 },
      { kind: 'move', index: 3 },
      () => 0.5,
    )

    expect(boosted.state.opponent.roster[0].hp).toBeLessThan(regular.state.opponent.roster[0].hp)
    expect(boosted.state.player.roster[0].hp).toBe(
      boosted.state.player.roster[0].maxHp - Math.floor(boosted.state.player.roster[0].maxHp / 10),
    )
    expect(boosted.events).toContainEqual({
      type: 'itemActivated',
      pokemon: 'player-0',
      item: 'life-orb',
      consumed: false,
    })
  })

  it('restores HP with Leftovers at the end of each turn', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    const pokemon = state.player.roster[0]
    pokemon.item = { name: 'leftovers', names: [], descriptions: [], sprite: null }
    pokemon.hp -= 100
    const expected = pokemon.hp + Math.floor(pokemon.maxHp / 16)

    const result = resolveBattleTurn(state, { kind: 'move', index: 3 }, { kind: 'move', index: 3 }, () => 0.5)

    expect(result.state.player.roster[0].hp).toBe(expected)
    expect(result.events).toContainEqual({
      type: 'itemActivated',
      pokemon: 'player-0',
      item: 'leftovers',
      consumed: false,
    })
  })

  it('removes dynamic held-item stat boosts and enforces Choice move locking', () => {
    const pokemon = createBattlePokemon({ ...member(0), item: 'choice-band' }, teamPokemon('choice-user'), [
      move(),
      move(),
      move(),
      move(),
    ])
    const baseAttack = pokemon.stats[1]
    pokemon.lastMoveIndex = 1

    expect(currentBattleStats(pokemon)[1]).toBe(Math.floor(baseAttack * 1.5))
    expect(legalBattleMoveIndexes(pokemon)).toEqual([1])
    pokemon.item = null
    expect(currentBattleStats(pokemon)[1]).toBe(baseAttack)
    expect(legalBattleMoveIndexes(pokemon)).toEqual([0, 1, 2, 3])
  })

  it('applies defensive, threshold, and move-timing held items once', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const sashState = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    sashState.player.roster[0].stats[1] = 9999
    sashState.player.roster[0].stats[5] = 999
    sashState.opponent.roster[0].item = { name: 'focus-sash', names: [], descriptions: [], sprite: null }
    const sash = resolveBattleTurn(sashState, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(sash.state.opponent.roster[0].hp).toBe(1)
    expect(sash.state.opponent.roster[0].item).toBeNull()

    const berryState = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    const berryHolder = berryState.player.roster[0]
    berryHolder.item = { name: 'sitrus-berry', names: [], descriptions: [], sprite: null }
    berryHolder.hp = Math.floor(berryHolder.maxHp / 2)
    const beforeBerry = berryHolder.hp
    const berry = resolveBattleTurn(berryState, { kind: 'move', index: 3 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(berry.state.player.roster[0].hp).toBe(beforeBerry + Math.floor(berryHolder.maxHp / 4))
    expect(berry.state.player.roster[0].item).toBeNull()

    const herbState = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    herbState.player.roster[0].stats[5] = 999
    herbState.player.roster[0].moves[0].data = move({ name: 'solar-beam', type: 'grass', power: 120 })
    herbState.player.roster[0].item = { name: 'power-herb', names: [], descriptions: [], sprite: null }
    const herb = resolveBattleTurn(herbState, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(herb.state.player.roster[0].chargingMoveIndex).toBeUndefined()
    expect(herb.state.player.roster[0].item).toBeNull()
    expect(herb.state.opponent.roster[0].hp).toBeLessThan(herb.state.opponent.roster[0].maxHp)
  })

  it('prevents status moves while Assault Vest is held', () => {
    const pokemon = createBattlePokemon({ ...member(0), item: 'assault-vest' }, teamPokemon('vest-user'), [
      move(),
      move(),
      move({ damageClass: 'status', power: null }),
      move({ damageClass: 'status', power: null }),
    ])
    expect(legalBattleMoveIndexes(pokemon)).toEqual([0, 1])
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
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'damage',
        pokemon: 'player-0',
        amount: hpCost,
        effectiveness: 1,
        critical: false,
      }),
    )
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

  it('resolves each Pokémon’s Terastallization before either action and only once', () => {
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
    expect(teraEvent).toBeLessThan(first.events.findIndex((event) => event.type === 'move'))
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

  it('restores the active replacement with Wish one turn after it is used', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({ name: 'wish', damageClass: 'status', power: null, target: 'user' })
    state.player.roster[0].stats[5] = 999

    const wished = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 3 }, () => 0.5)
    expect(wished.state.player.wish).toMatchObject({ turns: 1, amount: Math.floor(state.player.roster[0].maxHp / 2) })
    wished.state.player.roster[1].hp = 1

    const resolved = resolveBattleTurn(
      wished.state,
      { kind: 'switch', index: 1 },
      { kind: 'move', index: 3 },
      () => 0.5,
    )
    expect(resolved.state.player.roster[1].hp).toBe(1 + Math.floor(state.player.roster[0].maxHp / 2))
    expect(resolved.events).toContainEqual(
      expect.objectContaining({
        type: 'heal',
        pokemon: 'player-1',
        amount: Math.floor(state.player.roster[0].maxHp / 2),
      }),
    )
  })

  it('prevents the target’s action when Iron Head causes flinching', () => {
    const playerTeam = team('player')
    const opponentTeam = team('opponent')
    const state = createBattleState(playerTeam, roster(playerTeam), opponentTeam, roster(opponentTeam))
    state.player.roster[0].moves[0].data = move({
      name: 'iron-head',
      type: 'steel',
      power: 80,
      ailment: 'flinch',
      ailmentChance: 30,
    })
    state.player.roster[0].stats[5] = 999

    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 0 }, () => 0)
    expect(result.events).toContainEqual({ type: 'status', pokemon: 'opponent-0', status: 'flinch' })
    expect(result.events).toContainEqual({ type: 'failed', pokemon: 'opponent-0' })
    expect(result.state.player.roster[0].hp).toBe(state.player.roster[0].maxHp)
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
    expect(switched.events).toContainEqual(
      expect.objectContaining({
        type: 'hazardDamage',
        pokemon: 'opponent-1',
        hazard: 'spikes',
        amount: Math.floor(layered.opponent.roster[1].maxHp / 4),
      }),
    )
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
    expect(grounded.events).toContainEqual(
      expect.objectContaining({
        type: 'hazardDamage',
        pokemon: 'opponent-1',
        hazard: 'spikes',
        amount: Math.floor(state.opponent.roster[1].maxHp / 8),
      }),
    )

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

describe('multi-turn moves', () => {
  function setup(name: string) {
    const a = team('player')
    const b = team('opponent')
    const state = createBattleState(a, roster(a), b, roster(b))
    state.player.roster[0].moves[0] = { data: move({ name, power: 40 }), pp: 1 }
    state.player.roster[0].stats[5] = 500
    return state
  }
  const act = (state: ReturnType<typeof setup>, index = 0, opponentIndex = 3) =>
    resolveBattleTurn(state, { kind: 'move', index }, { kind: 'move', index: opponentIndex }, () => 0.5)

  it('resolves Future Sight two turns later against the replacement, even after its user leaves', () => {
    const initial = setup('future-sight')
    const first = act(initial).state
    expect(first.opponent.roster[0].hp).toBe(first.opponent.roster[0].maxHp)
    expect(first.opponent.futureSight?.turns).toBe(2)
    expect(first.player.roster[0].chargingMoveIndex).toBeUndefined()
    const second = resolveBattleTurn(first, { kind: 'switch', index: 1 }, { kind: 'switch', index: 1 }, () => 0.5).state
    expect(second.opponent.futureSight?.turns).toBe(1)
    const third = act(second, 2).state
    expect(third.opponent.futureSight).toBeUndefined()
    expect(third.opponent.roster[1].hp).toBeLessThan(third.opponent.roster[1].maxHp)
    expect(initial.opponent.futureSight).toBeUndefined()
    expect(first.opponent.futureSight?.turns).toBe(2)
  })

  it.each([
    'fly',
    'dig',
    'dive',
    'bounce',
    'phantom-force',
    'shadow-force',
    'solar-beam',
    'solar-blade',
    'meteor-beam',
    'electro-shot',
    'skull-bash',
    'razor-wind',
    'sky-attack',
    'freeze-shock',
    'ice-burn',
  ])('%s charges, locks the action, then hits without spending another PP', (name) => {
    const first = act(setup(name)).state
    expect(first.player.roster[0].chargingMoveIndex).toBe(0)
    expect(first.opponent.roster[0].hp).toBe(first.opponent.roster[0].maxHp)
    expect(legalBattleMoveIndexes(first.player.roster[0])).toEqual([0])
    const second = resolveBattleTurn(first, { kind: 'switch', index: 1 }, { kind: 'move', index: 3 }, () => 0.5).state
    expect(second.player.active).toBe(0)
    expect(second.player.roster[0].chargingMoveIndex).toBeUndefined()
    expect(second.player.roster[0].moves[0].pp).toBe(0)
    expect(second.opponent.roster[0].hp).toBeLessThan(second.opponent.roster[0].maxHp)
  })

  it.each([
    'hyper-beam',
    'giga-impact',
    'blast-burn',
    'hydro-cannon',
    'frenzy-plant',
    'rock-wrecker',
    'roar-of-time',
    'meteor-assault',
    'prismatic-laser',
    'eternabeam',
  ])('%s spends its next turn recharging and cannot switch', (name) => {
    const first = act(setup(name)).state
    expect(first.player.roster[0].recharging).toBe(true)
    const second = resolveBattleTurn(first, { kind: 'switch', index: 1 }, { kind: 'move', index: 0 }, () => 0.5)
    expect(second.state.player.active).toBe(0)
    expect(second.state.player.roster[0].recharging).toBeUndefined()
    expect(second.events).toContainEqual({ type: 'recharging', pokemon: 'player-0' })
    expect(second.state.player.roster[0].hp).toBeLessThan(first.player.roster[0].hp)
  })

  it('cancels a charge on sleep and applies Geomancy boosts only on release', () => {
    const state = setup('geomancy')
    state.player.roster[0].moves[0].data = move({
      name: 'geomancy',
      damageClass: 'status',
      target: 'user',
      power: null,
    })
    const first = act(state).state
    expect(first.player.roster[0].stages.specialAttack).toBe(0)
    const second = act(first).state
    expect(second.player.roster[0].stages).toMatchObject({ specialAttack: 2, specialDefense: 2, speed: 2 })
    first.player.roster[0].status = 'sleep'
    first.player.roster[0].sleepTurns = 2
    const cancelled = act(first).state
    expect(cancelled.player.roster[0].chargingMoveIndex).toBeUndefined()
    expect(cancelled.player.roster[0].stages.specialAttack).toBe(0)
  })

  it.each([
    ['solar-beam', 'sun'],
    ['solar-blade', 'sun'],
    ['electro-shot', 'rain'],
  ] as const)('%s attacks immediately in %s', (name, weather) => {
    const state = setup(name)
    state.field.weather = weather
    state.field.weatherTurns = 5
    const first = act(state).state
    expect(first.player.roster[0].chargingMoveIndex).toBeUndefined()
    expect(first.opponent.roster[0].hp).toBeLessThan(first.opponent.roster[0].maxHp)
    if (name === 'electro-shot') expect(first.player.roster[0].stages.specialAttack).toBe(1)
  })

  it.each(['fly', 'dig', 'dive', 'bounce', 'phantom-force', 'shadow-force'])(
    '%s avoids ordinary attacks during charging',
    (name) => {
      const state = act(setup(name), 0, 0).state
      expect(state.player.roster[0].hp).toBe(state.player.roster[0].maxHp)
    },
  )

  it.each([
    ['fly', 'thunder'],
    ['fly', 'hurricane'],
    ['fly', 'twister'],
    ['bounce', 'smack-down'],
    ['dig', 'earthquake'],
    ['dig', 'magnitude'],
    ['dive', 'surf'],
    ['dive', 'whirlpool'],
  ])('%s can be hit by %s', (name, counter) => {
    const state = setup(name)
    state.opponent.roster[0].moves[0].data.name = counter
    const first = act(state, 0, 0).state
    expect(first.player.roster[0].hp).toBeLessThan(first.player.roster[0].maxHp)
    if (counter === 'smack-down') expect(first.player.roster[0].chargingMoveIndex).toBeUndefined()
  })
  it.each(['meteor-beam', 'electro-shot', 'skull-bash'])('%s boosts only during preparation', (name) => {
    const first = act(setup(name)).state
    const stat = name === 'skull-bash' ? 'defense' : 'specialAttack'
    expect(first.player.roster[0].stages[stat]).toBe(1)
    expect(act(first).state.player.roster[0].stages[stat]).toBe(1)
  })

  it.each(['phantom-force', 'shadow-force'])('%s breaks Protect on release', (name) => {
    const first = act(setup(name)).state
    first.opponent.roster[0].moves[0].data = move({
      name: 'protect',
      damageClass: 'status',
      power: null,
      target: 'user',
      priority: 4,
    })
    const second = act(first, 0, 0)
    expect(second.state.opponent.roster[0].hp).toBeLessThan(first.opponent.roster[0].hp)
    expect(second.events.some((event) => event.type === 'protected')).toBe(false)
  })

  it.each([
    ['dig', 'earthquake'],
    ['dig', 'magnitude'],
    ['dive', 'surf'],
    ['dive', 'whirlpool'],
  ])('%s takes double damage from %s', (name, counter) => {
    const state = setup(name)
    state.opponent.roster[0].moves[0].data.name = counter
    state.player.roster[0].moves[3].data.statChanges = []
    const damage = (result: ReturnType<typeof act>) => {
      const hit = result.events.find((event) => event.type === 'damage' && event.pokemon === 'player-0')
      return hit?.type === 'damage' ? hit.amount : 0
    }
    const control = damage(act(state, 3, 0))
    expect(control).toBeGreaterThan(0)
    expect(damage(act(state, 0, 0))).toBeGreaterThanOrEqual(control * 2)
  })

  it('does not replace a pending Future Sight or block it with Protect', () => {
    const initial = setup('future-sight')
    initial.player.roster[0].moves[0].pp = 3
    const first = act(initial).state
    const second = act(first)
    expect(second.state.opponent.futureSight?.turns).toBe(1)
    expect(second.events).toContainEqual({ type: 'failed', pokemon: 'player-0' })
    second.state.opponent.roster[0].moves[0].data = move({
      name: 'protect',
      damageClass: 'status',
      power: null,
      target: 'user',
      priority: 4,
    })
    const third = act(second.state, 3, 0).state
    expect(third.opponent.roster[0].hp).toBeLessThan(third.opponent.roster[0].maxHp)
  })
  it('releases Solar Beam immediately under Desolate Land', () => {
    const state = setup('solar-beam')
    state.player.roster[0].ability.name = 'desolate-land'
    const result = act(state).state
    expect(result.player.roster[0].chargingMoveIndex).toBeUndefined()
    expect(result.opponent.roster[0].hp).toBeLessThan(result.opponent.roster[0].maxHp)
  })

  it.each(['rain', 'snow', 'sandstorm'] as const)('halves Solar Beam damage in %s', (weather) => {
    const charged = act(setup('solar-beam')).state
    const damage = (result: ReturnType<typeof act>) => result.events.find((event) => event.type === 'damage')
    const normal = damage(act(charged))
    charged.field.weather = weather
    charged.field.weatherTurns = 5
    const reduced = damage(act(charged))
    expect(
      normal?.type === 'damage' && reduced?.type === 'damage' && Math.abs(normal.amount / 2 - reduced.amount) < 1,
    ).toBe(true)
  })

  it.each([
    'solar-beam',
    'solar-blade',
    'meteor-beam',
    'electro-shot',
    'geomancy',
    'skull-bash',
    'razor-wind',
    'sky-attack',
    'freeze-shock',
    'ice-burn',
  ])('%s remains vulnerable while charging', (name) => {
    const result = act(setup(name), 0, 0).state
    expect(result.player.roster[0].hp).toBeLessThan(result.player.roster[0].maxHp)
  })
})

describe('Opponent difficulty and information boundaries', () => {
  const battle = () => {
    const player = team('player')
    const opponent = team('opponent')
    return createBattleState(player, roster(player, ['grass']), opponent, roster(opponent, ['water']))
  }

  it.each(BATTLE_DIFFICULTIES)('ignores private player information at %s difficulty', (difficulty) => {
    const state = battle()
    state.player.roster[0].revealedMoves = ['tackle']
    const before = JSON.stringify(state)
    const expected = chooseOpponentAction(state, () => 0.5, difficulty)
    expect(JSON.stringify(state)).toBe(before)
    const hidden = state.player.roster[0]
    hidden.member.tera = 'dragon'
    hidden.member.evs = [252, 252, 0, 0, 0, 0]
    hidden.member.nature = 'adamant'
    hidden.member.item = 'choice-band'
    hidden.stats = [900, 900, 900, 900, 900, 900]
    hidden.ability.name = 'wonder-guard'
    hidden.item = { name: 'choice-band', names: [], descriptions: [], sprite: null }
    hidden.moves[1].data = move({ name: 'thunder', type: 'electric', power: 110 })
    hidden.moves[0].pp = 0
    hidden.lastMoveIndex = 1
    hidden.chargingMoveIndex = 1
    hidden.encoreMoveIndex = 1
    state.player.team.members.reverse()
    for (const entry of state.player.roster.slice(1)) {
      entry.pokemon.types = ['electric']
      entry.pokemon.stats = [255, 255, 255, 255, 255, 255]
      entry.hp = 0
      entry.moves = []
    }
    expect(chooseOpponentAction(state, () => 0.5, difficulty)).toEqual(expected)
  })

  it('keeps very easy on the field and avoids voluntary pivot moves', () => {
    const state = battle()
    state.opponent.roster[0].moves[0].data = move({ name: 'u-turn', type: 'bug' })
    expect(chooseOpponentAction(state, () => 0, 'very-easy')).toEqual({ kind: 'move', index: 1 })
    state.opponent.roster[0].hp = 0
    expect(chooseOpponentAction(state, () => 0, 'very-easy')).toEqual({ kind: 'switch', index: 1 })
  })

  it('uses type effectiveness on easy without switching', () => {
    const state = battle()
    state.opponent.roster[0].moves[0].data = move({ type: 'water', power: 80 })
    state.opponent.roster[0].moves[1].data = move({ type: 'fire', power: 80 })
    expect(chooseOpponentAction(state, () => 0.5, 'easy')).toEqual({ kind: 'move', index: 1 })
  })

  it('switches out of a bad matchup from medium onward but respects trapping', () => {
    const state = battle()
    state.player.roster[0].pokemon.types = ['electric']
    state.opponent.roster[0].pokemon.types = ['water', 'flying']
    state.opponent.roster[1].pokemon.types = ['ground']
    state.opponent.roster[1].moves[0].data = move({ type: 'ground', power: 100 })
    expect(chooseOpponentAction(state, () => 0.5, 'medium')).toEqual({ kind: 'switch', index: 1 })
    state.opponent.roster[0].volatile.bound = 3
    expect(chooseOpponentAction(state, () => 0.5, 'medium').kind).toBe('move')
  })

  it('learns player attacks only after the turn has exposed them', () => {
    const state = battle()
    expect(state.player.roster[0].revealedMoves).toEqual([])
    const result = resolveBattleTurn(state, { kind: 'move', index: 0 }, { kind: 'move', index: 2 }, () => 0.5)
    expect(result.state.player.roster[0].revealedMoves).toEqual(['tackle'])
    expect(state.player.roster[0].revealedMoves).toEqual([])
  })

  it.each(BATTLE_DIFFICULTIES)('obeys PP, Encore and recharge on %s', (difficulty) => {
    const state = battle()
    const own = state.opponent.roster[0]
    own.volatile.bound = 3
    own.moves[0].pp = 0
    own.encoreTurns = 2
    own.encoreMoveIndex = 1
    expect(chooseOpponentAction(state, () => 0.5, difficulty)).toMatchObject({ kind: 'move', index: 1 })
    own.recharging = true
    expect(chooseOpponentAction(state, () => 0.5, difficulty)).toMatchObject({ kind: 'move', index: 0 })
  })

  it('avoids a forced replacement that would faint to entry hazards on very hard', () => {
    const state = battle()
    state.phase = 'opponent-switch'
    state.opponent.roster[0].hp = 0
    state.opponent.roster[1].hp = 1
    state.opponent.roster[1].moves[0].data = move({ type: 'fire', power: 150 })
    state.opponent.hazards.stealthRock = true
    const choice = chooseOpponentAction(state, () => 0.5, 'very-hard')
    expect(choice.kind).toBe('switch')
    expect(choice.index).not.toBe(1)
  })
})

describe('Advanced opponent tactics', () => {
  const battle = () => {
    const player = team('player')
    const opponent = team('opponent')
    const state = createBattleState(player, roster(player), opponent, roster(opponent))
    state.opponent.roster[0].volatile.bound = 3
    return state
  }

  it('uses revealed threats to choose defensive Tera without changing resources', () => {
    const state = battle()
    const own = state.opponent.roster[0]
    own.pokemon.types = ['water', 'flying']
    own.member.tera = 'ground'
    state.player.roster[0].moves[0].data = move({ name: 'thunderbolt', type: 'electric', power: 90 })
    const unknown = chooseOpponentAction(state, () => 0.5, 'expert')
    expect(unknown).not.toHaveProperty('tera', true)
    state.player.roster[0].revealedMoves = ['thunderbolt']
    expect(chooseOpponentAction(state, () => 0.5, 'expert')).toMatchObject({ kind: 'move', tera: true })
    expect(own.terastallized).toBe(false)
    own.terastallized = true
    expect(chooseOpponentAction(state, () => 0.5, 'expert')).not.toHaveProperty('tera', true)
  })

  it('prioritizes clearing entry hazards at very hard', () => {
    const state = battle()
    state.opponent.roster[0].moves[0].data = move({ name: 'rapid-spin', power: 20 })
    state.opponent.roster[0].moves[1].data = move({ power: 70 })
    expect(chooseOpponentAction(state, () => 0.5, 'very-hard')).toMatchObject({ kind: 'move', index: 1 })
    state.opponent.hazards.spikes = 3
    expect(chooseOpponentAction(state, () => 0.5, 'very-hard')).toMatchObject({ kind: 'move', index: 0 })
  })
})
