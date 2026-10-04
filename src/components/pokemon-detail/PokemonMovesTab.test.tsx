import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Pokemon } from '../../types'
import { PokemonMovesTab } from './PokemonMovesTab'

vi.mock('../MoveCard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../MoveCard')>()),
  MoveCard: ({ move }: { move: { name: string } }) => <div data-testid={`move-${move.name}`}>{move.name}</div>,
}))

const resource = (endpoint: string, id: number, name: string) => ({
  name,
  url: `https://pokeapi.co/api/v2/${endpoint}/${id}/`,
})

const move = (id: number, name: string, method: string, level: number) => ({
  move: resource('move', id, name),
  version_group_details: [
    {
      level_learned_at: level,
      move_learn_method: resource('move-learn-method', 1, method),
      version_group: resource('version-group', 20, 'scarlet-violet'),
    },
  ],
})

const pokemon = {
  name: 'pikachu',
  moves: [
    move(84, 'thunder-shock', 'level-up', 1),
    move(98, 'quick-attack', 'level-up', 5),
    move(231, 'iron-tail', 'machine', 0),
  ],
} as Pokemon

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderTab(active = true) {
  return render(
    <LanguageProvider>
      <PokemonMovesTab active={active} pokemon={pokemon} />
    </LanguageProvider>,
  )
}

describe('PokemonMovesTab', () => {
  it('does not render or request data while its tab is inactive', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderTab(false)

    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('combines text, learning-method and remotely loaded type filters with retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          id: 13,
          name: 'electric',
          damage_relations: { double_damage_from: [], half_damage_from: [], no_damage_from: [] },
          moves: [{ name: 'thunder-shock' }],
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderTab()

    expect(screen.getByTestId('move-thunder-shock')).toBeVisible()
    expect(screen.getByTestId('move-quick-attack')).toBeVisible()
    expect(screen.getByTestId('move-iron-tail')).toBeVisible()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar golpe...' }), { target: { value: 'quick' } })
    expect(await screen.findByTestId('move-quick-attack')).toBeVisible()
    expect(screen.queryByTestId('move-thunder-shock')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    fireEvent.click(screen.getByRole('combobox', { name: 'Aprendizado' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Máquina (TM/TR)' }))
    expect(screen.getByTestId('move-iron-tail')).toBeVisible()
    expect(screen.queryByTestId('move-quick-attack')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('combobox', { name: 'Aprendizado' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Todos os métodos' }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Tipo do golpe' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Elétrico' }))

    expect(await screen.findByText('Não foi possível buscar estes dados agora.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByTestId('move-thunder-shock')).toBeVisible())
    expect(screen.queryByTestId('move-quick-attack')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
