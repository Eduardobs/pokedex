import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { clearApiCache } from '../lib/api-client'
import { TeamMemberSetSelect } from './TeamMemberSetSelect'
import { applyTeamMemberSet, randomizeTeamMember, teamMemberSets } from '../lib/random-team'
import { natureNames, teraTypes, type TeamMember, type TeamPokemon } from '../lib/teams'

const pokemon: TeamPokemon = {
  id: 25,
  name: 'pikachu',
  species: 'pikachu',
  genderRate: -1,
  stats: [35, 55, 40, 50, 50, 90],
  types: ['electric'],
  abilities: ['lightning-rod'],
  moves: ['fake-out', 'knock-off', 'play-rough', 'surf', 'volt-switch', 'volt-tackle'],
}
const member: TeamMember = {
  id: 'member',
  pokemon: 'pikachu',
  level: 100,
  friendship: 255,
  shiny: false,
  gender: 'none',
  tera: 'electric',
  ability: 'lightning-rod',
  nature: 'hardy',
  item: '',
  moves: ['', '', '', ''],
  evs: [0, 0, 0, 0, 0, 0],
  ivs: [31, 31, 31, 31, 31, 31],
  abilityActive: false,
  itemActive: false,
}
afterEach(() => {
  cleanup()
  clearApiCache()
  vi.unstubAllGlobals()
  localStorage.clear()
})

it('randomizes every build field within available choices and spends all EVs even at random boundaries', () => {
  for (const value of [0, 0.2, 0.5, 0.999999]) {
    const result = randomizeTeamMember(member, pokemon, ['eviolite'], () => value)
    expect(result.id).toBe(member.id)
    expect(result.pokemon).toBe(member.pokemon)
    expect(result.evs.reduce((a, b) => a + b, 0)).toBe(510)
    expect(result.evs.every((ev) => ev >= 0 && ev <= 252)).toBe(true)
    expect(result.ivs.every((iv) => iv >= 0 && iv <= 31)).toBe(true)
    expect(new Set(result.moves).size).toBe(4)
    expect(result.moves.every((move) => pokemon.moves.includes(move))).toBe(true)
    expect(pokemon.abilities).toContain(result.ability)
    expect(natureNames).toContain(result.nature)
    expect(teraTypes).toContain(result.tera)
    expect(result.gender).toBe('none')
    expect(result.level).toBeGreaterThanOrEqual(1)
    expect(result.level).toBeLessThanOrEqual(100)
    expect(result.friendship).toBeGreaterThanOrEqual(0)
    expect(result.friendship).toBeLessThanOrEqual(255)
    expect(['', 'eviolite']).toContain(result.item)
  }
  expect(randomizeTeamMember(member, pokemon, [], () => 0)).not.toEqual(
    randomizeTeamMember(member, pokemon, [], () => 0.9),
  )
})

it('applies a compatible role without changing member identity', () => {
  const set = teamMemberSets(pokemon)[0]
  expect(set).toBeDefined()
  const result = applyTeamMemberSet(member, pokemon, set, () => 0)
  expect(result.id).toBe(member.id)
  expect(result.moves.every((move) => set.movepool.includes(move))).toBe(true)
  expect(set.abilities).toContain(result.ability)
  expect(set.teraTypes).toContain(result.tera)
  expect(result.item).toBe('light-ball')
})

it('fills only compatible distinct moves when fewer than four exist', () => {
  expect(randomizeTeamMember(member, { ...pokemon, moves: ['transform'] }, [], () => 0).moves).toEqual([
    'transform',
    '',
    '',
    '',
  ])
})

it.each([pokemon, { ...pokemon, name: 'ditto' }])(
  'allows repeated random selection and shows only available roles for $name',
  async (entry) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [{ name: 'eviolite' }] })))
    const onChange = vi.fn()
    render(
      <LanguageProvider>
        <TeamMemberSetSelect member={member} pokemon={entry} onChange={onChange} />
      </LanguageProvider>,
    )
    const combo = screen.getByRole('combobox', { name: 'Set' })
    await waitFor(() => expect(combo).toBeEnabled())
    for (let index = 0; index < 2; index++) {
      fireEvent.click(combo)
      expect(screen.getAllByRole('option')).toHaveLength(1 + teamMemberSets(entry).length)
      fireEvent.click(screen.getByRole('option', { name: 'Aleatório' }))
    }
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange.mock.calls[0][0]).not.toEqual(onChange.mock.calls[1][0])
  },
)
