import { describe, expect, it } from 'vitest'
import { newMember, type TeamPokemon } from './teams'
import { createTeamExport, importTeam, parseTeamExport, TEAM_EXPORT_FORMAT, TEAM_EXPORT_VERSION } from './team-transfer'

const pokemon: TeamPokemon = {
  name: 'pikachu',
  species: 'pikachu',
  id: 25,
  stats: [35, 55, 40, 50, 50, 90],
  types: ['electric'],
  abilities: ['static'],
  moves: ['thunderbolt'],
}

describe('team transfer', () => {
  it('exports every editable team field and restores it with fresh local identifiers', () => {
    const member = newMember(pokemon)
    member.level = 50
    member.friendship = 120
    member.shiny = true
    member.gender = 'female'
    member.tera = 'fire'
    member.nature = 'adamant'
    member.item = 'eviolite'
    member.moves = ['thunderbolt', '', '', '']
    member.evs = [0, 252, 0, 0, 0, 252]
    member.ivs = [31, 0, 31, 31, 31, 31]
    member.abilityActive = true
    member.itemActive = true
    const team = { id: 'team-1', name: 'Kanto', competitiveFormat: 'doubles-4v4' as const, members: [member] }

    const parsed = parseTeamExport(JSON.parse(JSON.stringify(createTeamExport(team))))
    expect(parsed).toEqual(team)
    const imported = importTeam(parsed!)
    expect({
      ...imported,
      id: team.id,
      members: imported.members.map((value) => ({ ...value, id: member.id })),
    }).toEqual(team)
    expect(imported.id).not.toBe(team.id)
    expect(imported.members[0].id).not.toBe(member.id)
  })

  it('rejects unsupported or invalid JSON documents', () => {
    expect(parseTeamExport({ format: TEAM_EXPORT_FORMAT, version: TEAM_EXPORT_VERSION + 1, team: {} })).toBeNull()
    expect(
      parseTeamExport({ format: TEAM_EXPORT_FORMAT, version: TEAM_EXPORT_VERSION, team: { members: [] } }),
    ).toBeNull()
  })
})
