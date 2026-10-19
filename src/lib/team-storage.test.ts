import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/app'
import { newMember, type TeamPokemon } from './teams'
import { readTeams, writeTeams } from './team-storage'

const pokemon: TeamPokemon = {
  name: 'pikachu',
  species: 'pikachu',
  id: 25,
  stats: [35, 55, 40, 50, 50, 90],
  types: ['electric'],
  abilities: ['static'],
  moves: ['thunderbolt'],
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('team storage', () => {
  it('uses the versioned team key and preserves valid saved teams', () => {
    const teams = [{ id: 'team-1', name: 'Kanto', members: [newMember(pokemon)] }]

    expect(writeTeams(teams)).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.teams)).not.toBeNull()
    expect(readTeams()).toEqual(teams)
  })

  it('falls back safely for invalid saved teams and storage failures', () => {
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([{ name: 'invalid' }]))
    expect(readTeams()).toEqual([])

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    expect(writeTeams([])).toBe(false)
  })
})
