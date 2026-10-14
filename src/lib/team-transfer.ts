import { record } from './resource-data'
import { validTeams, type Team } from './teams'

export const TEAM_EXPORT_FORMAT = 'atlas-pokemon-team'
export const TEAM_EXPORT_VERSION = 1

export type TeamExport = {
  format: typeof TEAM_EXPORT_FORMAT
  version: typeof TEAM_EXPORT_VERSION
  team: Team
}

export function createTeamExport(team: Team): TeamExport {
  return { format: TEAM_EXPORT_FORMAT, version: TEAM_EXPORT_VERSION, team }
}

/** Validates an untrusted JSON document before adding its team to local storage. */
export function parseTeamExport(value: unknown): Team | null {
  const document = record(value)
  const teams = [document.team]
  if (document.format !== TEAM_EXPORT_FORMAT || document.version !== TEAM_EXPORT_VERSION || !validTeams(teams))
    return null
  return teams[0]
}

/** Imported identifiers are local implementation details, so regenerate them to prevent collisions. */
export function importTeam(team: Team): Team {
  return {
    ...team,
    id: crypto.randomUUID(),
    members: team.members.map((member) => ({
      ...member,
      id: crypto.randomUUID(),
      friendship: member.friendship ?? 255,
      moves: [...member.moves],
      evs: [...member.evs] as Team['members'][number]['evs'],
      ivs: [...member.ivs] as Team['members'][number]['ivs'],
    })),
  }
}
