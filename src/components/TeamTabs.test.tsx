import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { LanguageProvider } from '../contexts/LanguageContext'
import { TeamTabs } from './TeamTabs'
import { newMember, type Team } from '../lib/teams'
const ref = (name: string, endpoint: string) => ({ name, url: `https://pokeapi.co/api/v2/${endpoint}/1/` })
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})
it('switches one visible editor with arrow keys and keeps edits when switching back', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const path = new URL(url).pathname
      const name = path.split('/').at(-1)!
      const data = path.includes('/pokemon-species/')
        ? { id: 25, gender_rate: 4 }
        : path.includes('/pokemon/')
          ? {
              name,
              id: name === 'pikachu' ? 25 : 1,
              species: ref(name, 'pokemon-species'),
              types: [{ type: ref('grass', 'type') }],
              abilities: [{ ability: ref('overgrow', 'ability') }],
              moves: [],
              sprites: {
                other: {
                  home: {
                    front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${name === 'pikachu' ? 25 : 1}.png`,
                    front_shiny: null,
                  },
                },
              },
              stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name) => ({
                stat: ref(name, 'stat'),
                base_stat: 50,
              })),
            }
          : { results: [], names: [], effect_entries: [] }
      return Promise.resolve(Response.json(data))
    }),
  )
  function Show() {
    const [team, setTeam] = useState<Team>({
      id: 'team',
      name: 'Team',
      members: ['pikachu', 'bulbasaur'].map((name) =>
        newMember({
          name,
          id: 1,
          species: name,
          types: ['grass'],
          abilities: ['overgrow'],
          moves: [],
          stats: [50, 50, 50, 50, 50, 50],
        }),
      ),
    })
    return (
      <LanguageProvider>
        <TeamTabs team={team} onChange={setTeam} />
      </LanguageProvider>
    )
  }
  const view = render(<Show />)
  await screen.findByLabelText('Nível')
  await waitFor(() =>
    expect(view.container.querySelector('[role="tab"] img')).toHaveAttribute(
      'src',
      expect.stringContaining('/sprites/pokemon/other/home/25.png'),
    ),
  )
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('Nível'), { target: { value: '42' } })
  const first = screen.getByRole('tab', { name: 'Pikachu' })
  const second = screen.getByRole('tab', { name: 'Bulbasaur' })
  fireEvent.keyDown(first, { key: 'ArrowRight' })
  expect(second).toHaveFocus()
  expect(second).toHaveAttribute('aria-selected', 'true')
  await waitFor(() => expect(screen.getByLabelText('Nível')).toHaveValue(100))
  fireEvent.keyDown(second, { key: 'Home' })
  await waitFor(() => expect(screen.getByLabelText('Nível')).toHaveValue(42))
  fireEvent.keyDown(first, { key: 'End' })
  expect(second).toHaveFocus()
  fireEvent.keyDown(second, { key: 'ArrowLeft' })
  expect(first).toHaveFocus()
  fireEvent.click(second)
  await screen.findByLabelText('Nível')
  fireEvent.click(screen.getByRole('button', { name: 'Remover Pokémon' }))
  expect(screen.queryByRole('tab', { name: 'Bulbasaur' })).toBeNull()
  expect(first).toHaveAttribute('aria-selected', 'true')
  await waitFor(() => expect(screen.getByLabelText('Nível')).toHaveValue(42))
})
