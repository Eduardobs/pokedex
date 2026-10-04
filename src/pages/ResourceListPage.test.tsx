import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ResourceListPage } from './ResourceListPage'

const { useAbilityListDetailsMock, useApiMock, useMoveListDetailsMock } = vi.hoisted(() => ({
  useAbilityListDetailsMock: vi.fn(),
  useApiMock: vi.fn(),
  useMoveListDetailsMock: vi.fn(),
}))
vi.mock('../hooks/useAbilityListDetails', () => ({ useAbilityListDetails: useAbilityListDetailsMock }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../hooks/useMoveListDetails', () => ({ useMoveListDetails: useMoveListDetailsMock }))

beforeEach(() => {
  useAbilityListDetailsMock.mockReturnValue({ data: null, loading: false, error: null, retry: vi.fn() })
  useMoveListDetailsMock.mockReturnValue({ data: null, loading: false, error: null, retry: vi.fn() })
})

afterEach(cleanup)

describe('ResourceListPage pagination', () => {
  it('redirects an offset beyond the collection to the last valid page', async () => {
    useApiMock.mockReturnValue({
      data: { count: 100, previous: 'previous', next: null, results: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explore/ability?offset=100000']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getAllByText('Página 3').length).toBeGreaterThan(0))
    expect(screen.getAllByText('81–100 de 100').length).toBeGreaterThan(0)
    expect(useApiMock).toHaveBeenLastCalledWith('ability?limit=40&offset=80')
  })
})

describe('ResourceListPage item presentation', () => {
  it('shows the localized ability description in its own column', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'stench', url: 'https://pokeapi.co/api/v2/ability/1/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    useAbilityListDetailsMock.mockReturnValue({
      data: {
        stench: {
          id: 1,
          name: 'stench',
          effectEntries: [
            {
              short_effect: 'Pode fazer o alvo recuar a cada golpe.',
              language: { name: 'pt-br' },
            },
          ],
        },
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/explore/ability']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const heading = container.querySelector('.ability-list-heading')
    expect(heading).toHaveTextContent('Habilidade')
    expect(heading).toHaveTextContent('Descrição')
    expect(screen.getByText('Pode fazer o alvo recuar a cada golpe.')).toHaveAttribute('lang', 'pt-br')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('marks an English fallback with a tooltip when the ability translation is missing', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'stench', url: 'https://pokeapi.co/api/v2/ability/1/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    useAbilityListDetailsMock.mockReturnValue({
      data: {
        stench: {
          id: 1,
          name: 'stench',
          effectEntries: [
            {
              short_effect: 'May make the target flinch with each hit.',
              language: { name: 'en' },
            },
          ],
        },
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explore/ability']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('May make the target flinch with each hit.')).toHaveAttribute('lang', 'en')
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Esta descrição não existe no idioma selecionado')
    expect(tooltip.closest('a')).toHaveAttribute('aria-describedby', tooltip.id)
  })

  it('shows the type, damage class, power, accuracy and PP for moves', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'thunderbolt', url: 'https://pokeapi.co/api/v2/move/85/' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    useMoveListDetailsMock.mockReturnValue({
      data: {
        thunderbolt: {
          id: 85,
          name: 'thunderbolt',
          names: [{ name: 'Thunderbolt', language: { name: 'en' } }],
          type: 'electric',
          damageClass: 'special',
          power: 90,
          accuracy: 100,
          pp: 15,
        },
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explore/move']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: /Abrir detalhes de Thunderbolt.*Tipo: Elétrico.*Classe: Especial/ }),
    ).toHaveAttribute('href', '/explore/move/thunderbolt')
    expect(screen.getByText('Elétrico')).toBeVisible()
    expect(screen.getByLabelText('Classe: Especial')).toBeVisible()
    expect(screen.getByText('90')).toBeVisible()
    expect(screen.getByText('100%')).toBeVisible()
    expect(screen.getByText('15')).toBeVisible()
  })

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
      <MemoryRouter initialEntries={['/explore/move-damage-class']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Físico')).toBeVisible()
    expect(container.querySelector('.damage-class-resource-icon img')).toHaveAttribute(
      'src',
      `${import.meta.env.BASE_URL}icons/damage-physical.png`,
    )
    expect(container.querySelector('.damage-badge img')).toHaveAttribute(
      'src',
      `${import.meta.env.BASE_URL}icons/damage-physical.png`,
    )
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
      <MemoryRouter initialEntries={['/explore/pokemon-species']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
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
      <MemoryRouter initialEntries={['/explore/pokemon']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const pokemonLink = screen.getByRole('link', { name: /Bulbasaur/ })
    const pokemonImage = pokemonLink.querySelector('img')

    expect(pokemonImage).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    )
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
      <MemoryRouter initialEntries={['/explore/item']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const itemLink = screen.getByRole('link', { name: /Master Ball/ })
    const itemImage = itemLink.querySelector('img')

    expect(itemImage).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
    )
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
      <MemoryRouter initialEntries={['/explore/berry']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const berryLink = screen.getByRole('link', { name: /Cheri/ })
    const berryImage = berryLink.querySelector('img')

    expect(berryImage).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png',
    )
    expect(berryImage).toHaveAttribute('width', '30')
    expect(berryImage).toHaveAttribute('height', '30')
    expect(container.querySelector('.data-resource-icon svg')).not.toBeInTheDocument()
  })
})
