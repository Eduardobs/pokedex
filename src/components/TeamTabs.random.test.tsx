import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { loadRandomTeamMember } from '../lib/random-team'
import { newMember, type TeamMember } from '../lib/teams'
import { TeamTabs } from './TeamTabs'

vi.mock('../lib/random-team', () => ({ loadRandomTeamMember: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
const team = { id: 'team', name: 'Team', members: [] }

it('reports failure and allows another attempt without modifying the team', async () => {
  vi.mocked(loadRandomTeamMember).mockRejectedValue(new Error('Unavailable'))
  const onChange = vi.fn()
  render(
    <LanguageProvider>
      <TeamTabs team={team} onChange={onChange} />
    </LanguageProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '+ aleatório' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível adicionar')
  expect(screen.getByRole('button', { name: '+ aleatório' })).toBeEnabled()
  expect(onChange).not.toHaveBeenCalled()
})

it('aborts an unfinished addition when leaving the team', async () => {
  let resolve!: (member: TeamMember) => void
  vi.mocked(loadRandomTeamMember).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const onChange = vi.fn()
  const view = render(
    <LanguageProvider>
      <TeamTabs team={team} onChange={onChange} />
    </LanguageProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '+ aleatório' }))
  const signal = vi.mocked(loadRandomTeamMember).mock.calls[0][1]
  view.unmount()
  expect(signal?.aborted).toBe(true)
  await act(async () => {
    resolve(
      newMember({
        name: 'pikachu',
        id: 25,
        species: 'pikachu',
        types: ['electric'],
        abilities: ['static'],
        moves: [],
        stats: [35, 55, 40, 50, 50, 90],
      }),
    )
  })
  expect(onChange).not.toHaveBeenCalled()
})
