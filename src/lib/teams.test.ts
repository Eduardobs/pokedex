import { describe, expect, it } from 'vitest'
import {
  calculatedStats,
  natureModifiers,
  editEv,
  newMember,
  parseTeamPokemon,
  validTeams,
  type TeamPokemon,
} from './teams'
const pokemon: TeamPokemon = {
  name: 'pikachu',
  species: 'pikachu',
  id: 25,
  stats: [35, 55, 40, 50, 50, 90],
  types: ['electric'],
  abilities: ['static', 'huge-power'],
  moves: ['thunderbolt'],
}
describe('team rules', () => {
  it('uses modern level, IV, EV and nature formulas', () => {
    const member = newMember(pokemon)
    expect(calculatedStats(pokemon, member)).toEqual([211, 146, 116, 136, 136, 216])
    member.nature = 'adamant'
    member.evs[1] = 252
    expect(calculatedStats(pokemon, member)[1]).toBe(229)
    expect(calculatedStats(pokemon, member)[3]).toBe(122)
    member.level = 50
    expect(calculatedStats(pokemon, member)[0]).toBe(110)
  })
  it('applies compatible abilities and species-specific items', () => {
    const member = newMember(pokemon)
    member.ability = 'huge-power'
    member.item = 'light-ball'
    expect(calculatedStats(pokemon, member)[1]).toBe(584)
    member.ability = 'invalid'
    member.item = 'thick-club'
    expect(calculatedStats(pokemon, member)[1]).toBe(146)
    member.item = 'choice-scarf'
    expect(calculatedStats(pokemon, member)[5]).toBe(324)
  })
  it('keeps Shedinja HP at one and conditional effects opt-in', () => {
    const p = { ...pokemon, name: 'shedinja', abilities: ['slow-start'] }
    const member = newMember(p)
    expect(calculatedStats(p, member)[0]).toBe(1)
    member.abilityActive = true
    expect(calculatedStats(p, member)[1]).toBe(73)
  })
  it('clamps per-stat EVs and preserves the 510 total', () => {
    expect(editEv([252, 252, 0, 0, 0, 0], 2, 252)).toEqual([252, 252, 6, 0, 0, 0])
    expect(editEv([0, 0, 0, 0, 0, 0], 0, 999)[0]).toBe(252)
    expect(editEv([0, 0, 0, 0, 0, 0], 0, -10)[0]).toBe(0)
  })
  it('rejects corrupted storage, excessive members, moves and training', () => {
    const member = newMember(pokemon)
    expect(member.friendship).toBe(255)
    const team = { id: 'team-1', name: 'Team', members: [member] }
    expect(validTeams([team])).toBe(true)
    expect(validTeams([{ ...team, competitiveFormat: 'doubles-4v4' }])).toBe(true)
    expect(validTeams([{ ...team, competitiveFormat: 'ranked-season-unknown' }])).toBe(false)
    expect(validTeams([{ ...team, members: Array.from({ length: 7 }, () => newMember(pokemon)) }])).toBe(false)
    expect(validTeams([{ ...team, members: [{ ...member, evs: [252, 252, 252, 0, 0, 0] }] }])).toBe(false)
    expect(validTeams([{ ...team, members: [{ ...member, moves: ['thunderbolt', 'thunderbolt', '', ''] }] }])).toBe(
      false,
    )
    expect(validTeams([{ ...team, members: [{ ...member, level: 101 }] }])).toBe(false)
    expect(validTeams([{ ...team, members: [{ ...member, friendship: -1 }] }])).toBe(false)
    expect(validTeams([{ ...team, members: [{ ...member, friendship: 256 }] }])).toBe(false)
    const { friendship: _legacyFriendship, ...legacyMember } = member
    expect(validTeams([{ ...team, members: [legacyMember] }])).toBe(true)
    expect(validTeams(null)).toBe(false)
  })
  it('rejects malformed remote Pokémon', () => {
    expect(() => parseTeamPokemon({ name: 'pikachu', id: 25 })).toThrow()
  })
})

it.each([
  ['huge-power', 1, 2, false],
  ['pure-power', 1, 2, false],
  ['hustle', 1, 1.5, false],
  ['fur-coat', 2, 2, false],
  ['gorilla-tactics', 1, 1.5, false],
  ['guts', 1, 1.5, true],
  ['solar-power', 3, 1.5, true],
  ['swift-swim', 5, 2, true],
  ['quick-feet', 5, 1.5, true],
  ['marvel-scale', 2, 1.5, true],
  ['grass-pelt', 2, 1.5, true],
  ['defeatist', 3, 0.5, true],
  ['orichalcum-pulse', 1, 4 / 3, true],
  ['hadron-engine', 3, 4 / 3, true],
  ['intrepid-sword', 1, 1.5, true],
  ['dauntless-shield', 2, 1.5, true],
  ['protosynthesis', 5, 1.5, true],
  ['quark-drive', 5, 1.5, true],
] as const)('calculates %s under its explicit activation condition', (ability, index, factor, active) => {
  const p = { ...pokemon, abilities: [ability] }
  const member = newMember(p)
  member.abilityActive = active
  const base = calculatedStats({ ...pokemon, abilities: ['static'] }, { ...member, ability: 'static' })
  expect(calculatedStats(p, member)[index]).toBe(Math.floor(base[index] * factor))
})

it.each([
  ['choice-band', 1, 1.5],
  ['choice-specs', 3, 1.5],
  ['assault-vest', 4, 1.5],
  ['iron-ball', 5, 0.5],
  ['macho-brace', 5, 0.5],
  ['power-weight', 5, 0.5],
  ['eviolite', 2, 1.5],
] as const)('calculates the held item %s', (item, index, factor) => {
  const member = newMember(pokemon)
  const base = calculatedStats(pokemon, member)
  member.item = item
  member.itemActive = true
  expect(calculatedStats(pokemon, member)[index]).toBe(Math.floor(base[index] * factor))
})

it('describes nature stat modifiers without attributing changes to EVs', () => {
  expect(natureModifiers('hardy')).toBeNull()
  expect(natureModifiers('unknown')).toBeNull()
  expect(natureModifiers('adamant')).toEqual({ increased: 'attack', decreased: 'special-attack' })
  expect(natureModifiers('timid')).toEqual({ increased: 'speed', decreased: 'attack' })
})
