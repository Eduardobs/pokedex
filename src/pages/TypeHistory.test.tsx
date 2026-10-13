import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { TypesTablePage } from './TypesTablePage'
import { BATTLE_TYPES } from '../lib/type-chart'

function response(name: string) {
  const generation = name === 'fairy' ? 6 : ['steel', 'dark'].includes(name) ? 2 : 1
  const relations = { no_damage_to: [], half_damage_to: [], double_damage_to: [] }
  return {
    name,
    generation: { name: 'generation-i', url: `https://pokeapi.co/api/v2/generation/${generation}/` },
    damage_relations: relations,
    past_damage_relations:
      name === 'ghost'
        ? [
            {
              generation: { name: 'generation-v', url: 'https://pokeapi.co/api/v2/generation/5/' },
              damage_relations: { ...relations, half_damage_to: [{ name: 'steel' }] },
            },
          ]
        : [],
  }
}
function select(value: string) {
  fireEvent.click(screen.getByRole('combobox', { name: 'Geração' }))
  fireEvent.click(screen.getByRole('option', { name: value }))
}
let clock = Date.now()
beforeEach(() => {
  clock += 600000
  vi.spyOn(Date, 'now').mockReturnValue(clock)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('historical type chart', () => {
  it('loads the bounded catalog, applies historical matchups and removes unavailable types', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => Promise.resolve(Response.json(response(url.split('/').at(-1)!)))),
    )
    render(
      <MemoryRouter>
        <LanguageProvider>
          <TypesTablePage />
        </LanguageProvider>
      </MemoryRouter>,
    )
    select('Geração 5')
    expect(await screen.findByLabelText('Fantasma → Metal: Dano ½×')).toBeVisible()
    expect(screen.queryByLabelText('Fada → Normal: Dano 1×')).not.toBeInTheDocument()
    select('Geração 1')
    expect(screen.queryByLabelText('Metal → Normal: Dano 1×')).not.toBeInTheDocument()
    select('Atual')
    expect(screen.getByLabelText('Fantasma → Metal: Dano 1×')).toBeVisible()
    expect(screen.getByLabelText('Fada → Normal: Dano 1×')).toBeVisible()
  })
  it('keeps a failed history request retryable without showing current values as historical', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    render(
      <MemoryRouter>
        <LanguageProvider>
          <TypesTablePage />
        </LanguageProvider>
      </MemoryRouter>,
    )
    select('Geração 4')
    const retry = await screen.findByRole('button', { name: 'Tentar novamente' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fetch.mockImplementation((url: string) => Promise.resolve(Response.json(response(url.split('/').at(-1)!))))
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getByRole('table')).toBeVisible())
    expect(screen.getAllByRole('button', { name: /Normal →/ })).toHaveLength(BATTLE_TYPES.length - 1)
  })
})
