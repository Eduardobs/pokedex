import { API_BASE_URL } from '../config/app'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  it('preserves the numeric API order inside explore collections', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 2,
        results: [
          { name: 'zeta-item', url: `${API_BASE_URL}/item/1/` },
          { name: 'alpha-item', url: `${API_BASE_URL}/item/2/` },
        ],
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

    expect(Array.from(container.querySelectorAll('.data-list > a b')).map((entry) => entry.textContent)).toEqual([
      'Zeta Item',
      'Alpha Item',
    ])
  })

  it('jumps to the last page while preserving the collection search', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 125,
        results: Array.from({ length: 125 }, (_, index) => ({
          name: `ability-${index + 1}`,
          url: `${API_BASE_URL}/ability/${index + 1}/`,
        })),
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/explore/ability?q=ability']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Última página' })[0])
    expect(screen.getAllByText('Página 4')).toHaveLength(2)
    expect(screen.getByRole('textbox', { name: 'Buscar em toda a coleção…' })).toHaveValue('ability')
    expect(screen.getByRole('link', { name: /Ability 125/ })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Ability 1$/ })).not.toBeInTheDocument()
  })

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
    expect(useApiMock).toHaveBeenLastCalledWith('ability?limit=40&offset=80', expect.any(Function))
  })
})

describe('ResourceListPage item presentation', () => {
  it('shows the localized ability description in its own column', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'stench', url: `${API_BASE_URL}/ability/1/` }],
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

    render(
      <MemoryRouter initialEntries={['/explore/ability']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const heading = screen.getByLabelText('Controles das colunas')
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
        results: [{ name: 'stench', url: `${API_BASE_URL}/ability/1/` }],
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
        results: [{ name: 'thunderbolt', url: `${API_BASE_URL}/move/85/` }],
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
        results: [{ name: 'physical', url: `${API_BASE_URL}/move-damage-class/2/` }],
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
        results: [{ name, url: `${API_BASE_URL}/pokemon-species/${name}/` }],
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
        results: [{ name: 'bulbasaur', url: `${API_BASE_URL}/pokemon/1/` }],
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
        results: [{ name: 'master-ball', url: `${API_BASE_URL}/item/1/` }],
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

  it('shows an item glyph when an item has no available sprite', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'axew-scales', url: `${API_BASE_URL}/item/2000/` }],
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

    fireEvent.error(container.querySelector('.data-resource-icon img')!)
    fireEvent.error(container.querySelector('.data-resource-icon img')!)
    fireEvent.error(container.querySelector('.data-resource-icon img')!)

    expect(container.querySelector('.data-resource-icon img')).not.toBeInTheDocument()
    expect(container.querySelector('.data-resource-icon svg.item-image-fallback')).toBeInTheDocument()
  })

  it('shows each berry sprite instead of the generic resource icon', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ name: 'cheri', url: `${API_BASE_URL}/berry/1/` }],
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

describe('ResourceListPage collection search', () => {
  it('finds an item beyond the first page and preserves input focus while searching', async () => {
    const resources = Array.from({ length: 45 }, (_, index) => ({
      name: index === 44 ? 'thunderbolt' : `move-${index}`,
      url: `${API_BASE_URL}/move/${index + 1}/`,
    }))
    useApiMock.mockImplementation((path: string) => ({
      data: {
        count: 45,
        results: path.includes('limit=10000') ? resources : resources.slice(0, 40),
        next: 'next',
        previous: null,
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    }))
    render(
      <MemoryRouter initialEntries={['/explore/move']}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: /Thunderbolt/ })).not.toBeInTheDocument()
    const search = screen.getByRole('textbox', { name: 'Buscar em toda a coleção…' })
    search.focus()
    fireEvent.change(search, { target: { value: 'thunder' } })
    expect(await screen.findByRole('link', { name: /Thunderbolt/ })).toBeVisible()
    expect(search).toHaveFocus()
    fireEvent.change(search, { target: { value: 'missing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))
    expect(search).toHaveValue('')
    expect(screen.getAllByText('Página 1').length).toBeGreaterThan(0)
  })
})

describe('ResourceListPage column controls', () => {
  const moves = Array.from({ length: 45 }, (_, i) => ({ name: `move-${i + 1}`, url: `${API_BASE_URL}/move/${i + 1}/` }))
  function setupMoves() {
    useApiMock.mockReturnValue({ data: { count: 45, results: moves }, loading: false, error: null, retry: vi.fn() })
    useMoveListDetailsMock.mockReturnValue({
      data: Object.fromEntries(
        moves.map((move, i) => [
          move.name,
          {
            names: [{ name: `Golpe ${i + 1}`, language: { name: 'pt-br' } }],
            type: i === 44 ? 'fire' : 'water',
            damageClass: i === 44 ? 'special' : 'physical',
            power: i + 1,
            accuracy: i + 1,
            pp: i + 1,
          },
        ]),
      ),
      loading: false,
      error: null,
      retry: vi.fn(),
    })
  }
  function show(resource: string, search = '') {
    return render(
      <MemoryRouter initialEntries={[`/explore/${resource}${search}`]}>
        <LanguageProvider>
          <Routes>
            <Route path="explore/:resource" element={<ResourceListPage />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )
  }

  it('combines filters on every move column across all pages', () => {
    setupMoves()
    show('move')
    for (const [column, value] of Object.entries({
      '#': '#045',
      Golpe: 'Golpe 45',
      Tipo: 'Fogo',
      Classe: 'Especial',
      Poder: '45',
      Precisão: '45%',
      PP: '45',
    })) {
      fireEvent.change(screen.getByRole('textbox', { name: `Filtrar ${column}` }), { target: { value } })
    }
    expect(screen.getByRole('link', { name: /Abrir detalhes de Golpe 45\./ })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Abrir detalhes de Golpe 1\./ })).not.toBeInTheDocument()
    expect(useApiMock).toHaveBeenLastCalledWith('move?limit=10000&offset=0', expect.any(Function))
    expect(useMoveListDetailsMock.mock.lastCall?.[0]).toHaveLength(45)
  })

  it.each(['#', 'Golpe', 'Tipo', 'Classe', 'Poder', 'Precisão', 'PP'])(
    'sorts %s before pagination and preserves sorting when changing pages',
    (column) => {
      setupMoves()
      const { container } = show('move')
      const button = screen.getByRole('button', { name: `Ordenar por ${column}` })
      fireEvent.click(button)
      if (column !== 'Classe') fireEvent.click(button)
      expect(container.querySelector('.move-list-row b')).toHaveTextContent('Golpe 45')
      expect(container.querySelectorAll('.move-list-row')).toHaveLength(40)
      fireEvent.click(screen.getAllByRole('button', { name: 'Próxima' })[0])
      expect(container.querySelectorAll('.move-list-row')).toHaveLength(5)
      expect(button).toHaveAttribute('aria-pressed', 'true')
    },
  )

  it('filters localized ability descriptions and combines with the existing collection search', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 2,
        results: [
          { name: 'alpha', url: `${API_BASE_URL}/ability/1/` },
          { name: 'beta', url: `${API_BASE_URL}/ability/2/` },
        ],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    useAbilityListDetailsMock.mockReturnValue({
      data: {
        alpha: { effectEntries: [{ short_effect: 'Aumenta a potência.', language: { name: 'pt-br' } }] },
        beta: { effectEntries: [{ short_effect: 'Reduz a defesa.', language: { name: 'pt-br' } }] },
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    show('ability', '?q=alpha&filter.description=potencia')
    expect(screen.getByRole('link', { name: /Alpha/ })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Beta/ })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Buscar em toda a coleção…' })).toHaveValue('alpha')
  })

  it('sorts ordinary collections and clears filters with no matches', () => {
    useApiMock.mockReturnValue({
      data: {
        count: 2,
        results: [
          { name: 'zeta', url: `${API_BASE_URL}/item/1/` },
          { name: 'alpha', url: `${API_BASE_URL}/item/2/` },
        ],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })
    const { container } = show('item', '?sort=displayName')
    expect(container.querySelector('.data-list > a b')).toHaveTextContent('Alpha')
    fireEvent.change(screen.getByRole('textbox', { name: 'Filtrar Itens' }), { target: { value: 'missing' } })
    expect(container.querySelectorAll('.data-list > a')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))
    expect(container.querySelectorAll('.data-list > a')).toHaveLength(2)
    expect(container.querySelector('.data-list > a b')).toHaveTextContent('Zeta')
  })

  it('waits for complete details and offers retry instead of showing incomplete filtered results', () => {
    setupMoves()
    const retry = vi.fn()
    useMoveListDetailsMock.mockReturnValue({ data: null, loading: false, error: new Error('Unavailable'), retry })
    const { container } = show('move', '?filter.type=Fogo')
    expect(container.querySelectorAll('.move-list-row')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
