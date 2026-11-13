import { STORAGE_KEYS } from '../config/app'
import { readStorage, writeStorage } from './storage'
import { sanitizeTeam, validTeams, type Team } from './teams'

/**
 * Owns the persisted team collection contract. Keeping this boundary here lets
 * consumers use teams without knowing their browser-storage key or validator.
 */
export function readTeams(): Team[] {
  return readStorage<Team[]>(STORAGE_KEYS.teams, validTeams, []).map(sanitizeTeam)
}

export function writeTeams(teams: Team[]): boolean {
  return validTeams(teams) && writeStorage(STORAGE_KEYS.teams, teams.map(sanitizeTeam))
}
