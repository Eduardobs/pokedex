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
        encounter_method_rates: [
          {
            encounter_method: {
              name: 'old-rod',
              url: 'https://pokeapi.co/api/v2/encounter-method/2/',
            },
            version_details: [
              {
                rate: 10,
                version: { name: 'firered', url: 'https://pokeapi.co/api/v2/version/10/' },
              },
            ],
          },
        ],
        location: { name: 'celadon-city', url: 'https://pokeapi.co/api/v2/location/67/' },
        pokemon_encounters: [],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explore/location-area/283']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource/:name" element={<ResourceDetailPage />} />
          </Routes>
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
      <MemoryRouter initialEntries={['/explore/move-damage-class/special']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource/:name" element={<ResourceDetailPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Especial')).toBeVisible()
    expect(container.querySelector('.damage-class-detail-icon img')).toHaveAttribute(
      'src',
      `${import.meta.env.BASE_URL}icons/damage-special.png`,
    )
    expect(container.querySelector('.damage-badge img')).toHaveAttribute(
      'src',
      `${import.meta.env.BASE_URL}icons/damage-special.png`,
    )
  })

  it('uses the standardized Pokemon type treatment in the move type card', () => {
    useApiMock.mockReturnValue({
      data: {
        id: 44,
        name: 'bite',
        names: [],
        type: { name: 'dark', url: 'https://pokeapi.co/api/v2/type/17/' },
        damage_class: { name: 'physical', url: 'https://pokeapi.co/api/v2/move-damage-class/2/' },
        power: 60,
        accuracy: 100,
        pp: 25,
        priority: 0,
        target: { name: 'selected-pokemon', url: 'https://pokeapi.co/api/v2/move-target/10/' },
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explore/move/bite']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource/:name" element={<ResourceDetailPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const typeCard = screen.getByRole('heading', { name: 'Tipo' }).closest('article')
    const typeLink = typeCard?.querySelector('a')

    expect(typeLink).toHaveAttribute('href', '/explore/type/17')
    expect(typeLink?.querySelector('.type-badge')).toHaveClass('type-dark')
    expect(typeLink?.querySelector('use')).toHaveAttribute(
      'href',
      `${import.meta.env.BASE_URL}type-icons.svg#type-dark`,
    )
    expect(container.querySelectorAll('.type-dark')).toHaveLength(2)
  })

  it('shows the berry sprite instead of the generic resource icon', () => {
    useApiMock.mockReturnValue({
      data: { id: 1, name: 'cheri' },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explore/berry/cheri']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource/:name" element={<ResourceDetailPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const berryImage = container.querySelector('.resource-detail-header img')

    expect(berryImage).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png',
    )
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
      <MemoryRouter initialEntries={['/explore/pokemon-color/black']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource/:name" element={<ResourceDetailPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { name: 'Espécies de Pokémon' })
    expect(heading.closest('article')).toHaveClass('related-pokemon-field')
    expect(screen.getByRole('img', { name: 'Murkrow' })).toBeInTheDocument()
    expect(screen.getByText('#0198')).toBeInTheDocument()
  })

  it('uses female varieties in the required-for-evolution cards on the female gender page', () => {
    useApiMock.mockReturnValue({
      data: {
        id: 1,
        name: 'female',
        required_for_evolution: [{ name: 'meowstic', url: 'https://pokeapi.co/api/v2/pokemon-species/678/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explore/gender/female']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource/:name" element={<ResourceDetailPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Abrir Meowstic, Pokémon número 678' })
    expect(link).toHaveAttribute('href', '/pokemon/meowstic-female')
    expect(screen.getByRole('img', { name: 'Meowstic' })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10025.png',
    )
  })
})
