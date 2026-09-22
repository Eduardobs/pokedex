import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ResourceDetailPage } from './ResourceDetailPage'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))

describe('ResourceDetailPage berry presentation', () => {
  it('renders location-area fields and encounter methods in Portuguese', () => {
    useApiMock.mockReturnValue({
      data: {
        id: 283,
        name: 'celadon-city-area',
        game_index: 100,
        encounter_method_rates: [{
          encounter_method: { name: 'old-rod', url: 'https://pokeapi.co/api/v2/encounter-method/2/' },
          version_details: [{ rate: 10, version: { name: 'firered', url: 'https://pokeapi.co/api/v2/version/10/' } }],
        }],
        location: { name: 'celadon-city', url: 'https://pokeapi.co/api/v2/location/67/' },
        pokemon_encounters: [],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explorar/location-area/283']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource/:name" element={<ResourceDetailPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Índice no jogo' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Taxas por método de encontro' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Local' })).toBeVisible()
    expect(screen.getByText('Vara velha')).toBeVisible()
    expect(screen.queryByText('Game Index')).not.toBeInTheDocument()
    expect(screen.queryByText('Encounter Method Rates')).not.toBeInTheDocument()
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })

  it('uses the referenced damage-class treatment on its catalog detail page', () => {
    useApiMock.mockReturnValue({
      data: { id: 2, name: 'special', names: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explorar/move-damage-class/special']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource/:name" element={<ResourceDetailPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Especial')).toBeVisible()
    expect(container.querySelector('.damage-class-detail-icon img')).toHaveAttribute('src', '/icons/damage-special.png')
    expect(container.querySelector('.damage-badge img')).toHaveAttribute('src', '/icons/damage-special.png')
  })

  it('shows the berry sprite instead of the generic resource icon', () => {
    useApiMock.mockReturnValue({
      data: { id: 1, name: 'cheri' },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explorar/berry/cheri']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource/:name" element={<ResourceDetailPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const berryImage = container.querySelector('.resource-detail-header img')

    expect(berryImage).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png')
    expect(berryImage).toHaveAttribute('width', '72')
    expect(berryImage).toHaveAttribute('height', '72')
    expect(container.querySelector('.resource-detail-mark')).not.toBeInTheDocument()
  })

  it('gives related Pokémon lists the full-width standardized presentation', () => {
    useApiMock.mockReturnValue({
      data: {
        id: 1,
        name: 'black',
        pokemon_species: [{ name: 'murkrow', url: 'https://pokeapi.co/api/v2/pokemon-species/198/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explorar/pokemon-color/black']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource/:name" element={<ResourceDetailPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { name: 'Espécies de Pokémon' })
    expect(heading.closest('article')).toHaveClass('related-pokemon-field')
    expect(screen.getByRole('img', { name: 'Murkrow' })).toBeInTheDocument()
    expect(screen.getByText('#0198')).toBeInTheDocument()
  })
})
