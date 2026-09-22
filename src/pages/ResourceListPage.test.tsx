import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ResourceListPage } from './ResourceListPage'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))

describe('ResourceListPage pagination', () => {
  it('redirects an offset beyond the collection to the last valid page', async () => {
    useApiMock.mockReturnValue({
      data: { count: 100, previous: 'previous', next: null, results: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explorar/ability?offset=100000']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getAllByText('Página 3').length).toBeGreaterThan(0))
    expect(screen.getAllByText('81–100 de 100').length).toBeGreaterThan(0)
    expect(useApiMock).toHaveBeenLastCalledWith('ability?limit=40&offset=80')
  })
})

describe('ResourceListPage item presentation', () => {
  it('uses the referenced Scarlet/Violet icon and badge for damage classes', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 3,
        previous: null,
        next: null,
        results: [{ name: 'physical', url: 'https://pokeapi.co/api/v2/move-damage-class/2/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explorar/move-damage-class']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Físico')).toBeVisible()
    expect(container.querySelector('.damage-class-resource-icon img')).toHaveAttribute('src', '/icons/damage-physical.png')
    expect(container.querySelector('.damage-badge img')).toHaveAttribute('src', '/icons/damage-physical.png')
  })

  it.each([
    ['wormadam', '/pokemon/wormadam-plant'],
    ['meowstic', '/pokemon/meowstic-male'],
  ])('links the %s species to its canonical default variety', (name, href) => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name, url: `https://pokeapi.co/api/v2/pokemon-species/${name}/` }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explorar/pokemon-species']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: new RegExp(name, 'i') })).toHaveAttribute('href', href)
  })

  it('shows each Pokémon artwork instead of the generic resource icon', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explorar/pokemon']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const pokemonLink = screen.getByRole('link', { name: /Bulbasaur/ })
    const pokemonImage = pokemonLink.querySelector('img')

    expect(pokemonImage).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png')
    expect(pokemonImage).toHaveClass('pokemon-artwork')
    expect(pokemonImage).toHaveAttribute('width', '30')
    expect(pokemonImage).toHaveAttribute('height', '30')
    expect(container.querySelector('.data-resource-icon svg')).not.toBeInTheDocument()
  })

  it('shows each item sprite instead of the generic resource icon', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'master-ball', url: 'https://pokeapi.co/api/v2/item/1/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explorar/item']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const itemLink = screen.getByRole('link', { name: /Master Ball/ })
    const itemImage = itemLink.querySelector('img')

    expect(itemImage).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png')
    expect(itemImage).toHaveAttribute('width', '30')
    expect(itemImage).toHaveAttribute('height', '30')
    expect(container.querySelector('.data-resource-icon svg')).not.toBeInTheDocument()
  })

  it('shows each berry sprite instead of the generic resource icon', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'cheri', url: 'https://pokeapi.co/api/v2/berry/1/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explorar/berry']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const berryLink = screen.getByRole('link', { name: /Cheri/ })
    const berryImage = berryLink.querySelector('img')

    expect(berryImage).toHaveAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png')
    expect(berryImage).toHaveAttribute('width', '30')
    expect(berryImage).toHaveAttribute('height', '30')
    expect(container.querySelector('.data-resource-icon svg')).not.toBeInTheDocument()
  })
})
