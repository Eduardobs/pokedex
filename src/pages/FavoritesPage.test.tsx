import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FavoritesProvider } from '../contexts/FavoritesContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { STORAGE_KEYS } from '../config/app'
import { FavoritesPage } from './FavoritesPage'

vi.mock('../hooks/useApi', () => ({ useApi: vi.fn() }))
vi.mock('../components/FavoritePokemonCard', () => ({
  FavoritePokemonCard: ({ name, shiny }: { name: string; shiny?: boolean }) => (
    <div data-testid="favorite-card" data-shiny={shiny ? 'true' : 'false'}>
      {name}
    </div>
  ),
}))

const useApiMock = vi.mocked(useApi)

afterEach(() => {
  localStorage.clear()
  useApiMock.mockReset()
})

describe('FavoritesPage', () => {
  it('uses the Pokédex catalog filters to search favorite Pokémon', () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['pikachu', 'bulbasaur']))
    useApiMock.mockReturnValue({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [
          { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
          { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
        ],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/favorites']}>
        <LanguageProvider>
          <FavoritesProvider>
            <FavoritesPage />
          </FavoritesProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('combobox', { name: 'Buscar nos favoritos...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exibir filtros' })).toBeInTheDocument()
    expect(screen.getAllByTestId('favorite-card')).toHaveLength(2)

    fireEvent.change(screen.getByRole('combobox', { name: 'Buscar nos favoritos...' }), {
      target: { value: 'pik' },
    })

    expect(screen.getAllByTestId('favorite-card')).toHaveLength(1)
    expect(screen.getByTestId('favorite-card')).toHaveTextContent('pikachu')
  })
})
