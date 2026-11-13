import { API_BASE_URL } from '../../config/app'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Pokemon } from '../../types'
import Pokemon3DTab from './Pokemon3DTab'

vi.mock('../../lib/model-viewer', () => ({}))
const { fetchModel } = vi.hoisted(() => ({ fetchModel: vi.fn() }))
vi.mock('../../lib/pokemon-model', () => ({ fetchPokemonModel: fetchModel }))
beforeEach(() => {
  let index = 0
  fetchModel.mockResolvedValue(new Blob(['model']))
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => `blob:model-${++index}`)
      static revokeObjectURL = vi.fn()
    },
  )
})
const { fetchCatalog } = vi.hoisted(() => ({ fetchCatalog: vi.fn() }))
vi.mock('../../lib/pokemon-3d', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/pokemon-3d')>()),
  fetchPokemon3D: fetchCatalog,
}))
const pokemon = {
  id: 25,
  name: 'pikachu',
  is_default: true,
  species: { url: `${API_BASE_URL}/pokemon-species/25/` },
} as Pokemon
const catalog = [
  {
    id: 25,
    forms: [
      { name: 'Pikachu', formName: 'regular', model: 'regular.glb' },
      { name: 'Shiny Pikachu', formName: 'shiny', model: 'shiny.glb' },
    ],
  },
]
const view = (shiny = false) => (
  <LanguageProvider>
    <Pokemon3DTab pokemon={pokemon} shiny={shiny} />
  </LanguageProvider>
)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
describe('Pokemon3D tab', () => {
  it('changes the model with the shared shiny state and handles viewer errors', async () => {
    fetchCatalog.mockResolvedValue(catalog)
    const { container, rerender } = render(view())
    await waitFor(() => expect(container.querySelector('model-viewer')).toHaveAttribute('src', 'blob:model-1'))
    fireEvent(container.querySelector('model-viewer')!, new Event('load'))
    expect(screen.queryByText('Carregando modelo 3D…')).not.toBeInTheDocument()
    await act(async () => {
      rerender(view(true))
    })
    await waitFor(() => expect(container.querySelector('model-viewer')).toHaveAttribute('src', 'blob:model-2'))
    fireEvent(container.querySelector('model-viewer')!, new Event('error'))
    expect(screen.getByText('Não foi possível carregar o modelo 3D.')).toBeVisible()
    expect(container.querySelector('model-viewer')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('Carregando modelo 3D…')).toBeVisible()
  })
  it('retries a failed catalog and displays unavailable models', async () => {
    fetchCatalog.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    render(view())
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Modelo 3D indisponível'))
  })
  it('aborts the catalog request when leaving the tab', () => {
    fetchCatalog.mockImplementation(() => new Promise(() => {}))
    const { unmount } = render(view())
    const signal = fetchCatalog.mock.calls[0][0] as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
  })
})

it('cancels a model download when leaving the tab and revokes loaded blobs', async () => {
  fetchCatalog.mockResolvedValue(catalog)
  fetchModel.mockImplementationOnce(() => new Promise(() => {}))
  const pending = render(view())
  await waitFor(() => expect(fetchModel).toHaveBeenCalled())
  const signal = fetchModel.mock.calls.at(-1)![1] as AbortSignal
  pending.unmount()
  expect(signal.aborted).toBe(true)
  fetchModel.mockResolvedValue(new Blob(['model']))
  const loaded = render(view())
  await waitFor(() => expect(loaded.container.querySelector('model-viewer')).not.toBeNull())
  loaded.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})

it('reports failed model downloads and can retry them', async () => {
  fetchCatalog.mockResolvedValue(catalog)
  fetchModel.mockRejectedValueOnce(new Error('oversized')).mockResolvedValue(new Blob(['model']))
  const { container } = render(view())
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(container.querySelector('model-viewer')).not.toBeNull())
})
