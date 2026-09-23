import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import type { ApiList, NamedResource } from '../types'
import { FormsPage } from './FormsPage'
import { PokedexPage } from './PokedexPage'

const {
  fetchPokemonRarityDetailsMock,
  fetchPokemonRegionDetailsMock,
  fetchPokemonSortDetailsMock,
  useApiMock,
} = vi.hoisted(() => ({
  fetchPokemonRarityDetailsMock: vi.fn(),
  fetchPokemonRegionDetailsMock: vi.fn(),
  fetchPokemonSortDetailsMock: vi.fn(),
  useApiMock: vi.fn(),
}))

vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../lib/pokemon-catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/pokemon-catalog')>()),
  fetchPokemonRarityDetails: fetchPokemonRarityDetailsMock,
  fetchPokemonRegionDetails: fetchPokemonRegionDetailsMock,
  fetchPokemonSortDetails: fetchPokemonSortDetailsMock,
}))
vi.mock('../components/PokemonCard', () => ({
  PokemonCard: ({ name, shiny }: { name: string; shiny?: boolean }) => (
    <div data-shiny={shiny ? 'true' : 'false'}>{name}</div>
  ),
}))
vi.mock('../components/PokemonFormDirectoryCard', async (importOriginal) => {
  const original = await importOriginal<typeof import('../components/PokemonFormDirectoryCard')>()
  return {
    ...original,
    PokemonFormDirectoryCard: ({
      resource,
      shiny,
      sortMetric,
    }: {
      resource: NamedResource
      shiny?: boolean
      sortMetric?: { value: number }
    }) => (
      <div
        data-testid="form-card"
        data-shiny={shiny ? 'true' : 'false'}
        data-sort-metric={sortMetric?.value}
      >
        {resource.name}
      </div>
    ),
  }
})

class IntersectionObserverMock implements IntersectionObserver {
  static instances: IntersectionObserverMock[] = []

  readonly root = null
  readonly rootMargin = '0px'
  readonly scrollMargin = '0px'
  readonly thresholds = [0]
  private targets = new Set<Element>()

  constructor(private callback: IntersectionObserverCallback) {
    IntersectionObserverMock.instances.push(this)
  }

  observe = (target: Element) => {
    this.targets.add(target)
  }
  unobserve = (target: Element) => {
    this.targets.delete(target)
  }
  disconnect = () => {
    this.targets.clear()
  }
  takeRecords = () => []

  trigger() {
    const target = this.targets.values().next().value as Element | undefined
    if (!target) return
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this)
  }
}

const pokemon = Array.from({ length: 60 }, (_, index) => ({
  name: `pokemon-${index + 1}`,
  url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/`,
}))

const forms = Array.from({ length: 70 }, (_, index) => ({
  name: `pokemon-${index + 1}-alola`,
  url: `https://pokeapi.co/api/v2/pokemon-form/${index + 1}/`,
}))

const species = Array.from({ length: 70 }, (_, index) => ({
  name: `pokemon-${index + 1}`,
  url: `https://pokeapi.co/api/v2/pokemon-species/${index + 1}/`,
}))

function apiList(results: NamedResource[]): ApiList {
  return { count: results.length, next: null, previous: null, results }
}

function renderPage(page: React.ReactNode) {
  return (
    <MemoryRouter>
      <LanguageProvider>{page}</LanguageProvider>
    </MemoryRouter>
  )
}

function reachNextPage() {
  act(() => {
    IntersectionObserverMock.instances.forEach((observer) => observer.trigger())
  })
}

beforeEach(() => {
  IntersectionObserverMock.instances = []
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
})

afterEach(() => {
  cleanup()
  fetchPokemonRarityDetailsMock.mockReset()
  fetchPokemonRegionDetailsMock.mockReset()
  fetchPokemonSortDetailsMock.mockReset()
  useApiMock.mockReset()
  vi.unstubAllGlobals()
})

describe('infinite scroll', () => {
  it('keeps observing the Pokédex sentinel after loading a page', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })

    render(renderPage(<PokedexPage />))

    expect(screen.getByText('pokemon-24')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-25')).not.toBeInTheDocument()

    reachNextPage()
    expect(screen.getByText('pokemon-48')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-49')).not.toBeInTheDocument()

    reachNextPage()
    expect(screen.getByText('pokemon-60')).toBeInTheDocument()
    expect(screen.getByText('Você chegou ao fim da Pokédex.')).toBeInTheDocument()
  })

  it('starts observing forms after loading and keeps observing subsequent pages', () => {
    let loading = true
    useApiMock.mockImplementation((pathOrUrl: string | null) => ({
      data: pathOrUrl
        ? pathOrUrl.startsWith('pokemon-form')
          ? apiList(forms)
          : apiList(species)
        : null,
      loading: Boolean(pathOrUrl) && loading,
      error: null,
    }))

    const view = render(renderPage(<FormsPage />))
    expect(screen.getByText('Ordenando formas pela Pokédex Nacional...')).toBeInTheDocument()

    loading = false
    view.rerender(renderPage(<FormsPage />))

    expect(screen.getByText('pokemon-32-alola')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-33-alola')).not.toBeInTheDocument()

    reachNextPage()
    expect(screen.getByText('pokemon-64-alola')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-65-alola')).not.toBeInTheDocument()

    reachNextPage()
    expect(screen.getByText('pokemon-70-alola')).toBeInTheDocument()
    expect(screen.getByText('Todas as formas desta categoria foram exibidas.')).toBeInTheDocument()
  })
})

describe('Pokédex filters', () => {
  it('applies the shiny selection to every Pokémon in the list', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))

    const toggle = screen.getByRole('button', { name: 'Exibir versões shiny' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('pokemon-1')).toHaveAttribute('data-shiny', 'false')
    expect(screen.getByText('pokemon-24')).toHaveAttribute('data-shiny', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Exibir versões normais' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('pokemon-1')).toHaveAttribute('data-shiny', 'true')
    expect(screen.getByText('pokemon-24')).toHaveAttribute('data-shiny', 'true')
  })

  it('keeps primary filters visible and toggles type and rarity filters', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))

    expect(
      screen.getByRole('combobox', { name: 'Filtrar todos os Pokémon por nome ou número' }),
    ).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Região' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Ordem' })).toHaveTextContent('Crescente')
    expect(screen.queryByRole('checkbox', { name: 'Lendário' })).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Exibir filtros' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Esconder filtros' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('checkbox', { name: 'Lendário' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Fogo' })).toBeVisible()
  })

  it('changes the ordering direction independently from the selected field', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))

    expect(screen.getByText('pokemon-1')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-60')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('combobox', { name: 'Ordem' }))
    fireEvent.click(screen.getByRole('option', { name: 'Decrescente' }))

    expect(screen.getByText('pokemon-60')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-1')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveTextContent('Número')
  })

  it('suggests matching Pokémon names while typing', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))
    const search = screen.getByRole('combobox', {
      name: 'Filtrar todos os Pokémon por nome ou número',
    })

    fireEvent.change(search, { target: { value: 'pokemon-2' } })

    const suggestions = screen.getByRole('listbox')
    expect(within(suggestions).getAllByRole('option')[0]).toHaveTextContent('Pokemon 2')
  })

  it('shows every type by name in an exclusive selection group', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))
    fireEvent.click(screen.getByRole('button', { name: 'Exibir filtros' }))

    const typeGroup = screen.getByRole('group', { name: 'Tipo' })
    const allFilter = within(typeGroup).getByRole('radio', { name: 'Todos' })
    const fireFilter = within(typeGroup).getByRole('radio', { name: 'Fogo' })

    expect(allFilter).toBeChecked()
    expect(fireFilter).not.toBeChecked()
    expect(fireFilter.closest('label')).toHaveTextContent('Fogo')

    fireEvent.click(fireFilter)
    expect(fireFilter).toBeChecked()
    expect(allFilter).not.toBeChecked()
  })

  it('filters legendary and mythical Pokémon with unchecked checkboxes by default', async () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    fetchPokemonRarityDetailsMock.mockResolvedValue({
      'pokemon-1': { isLegendary: true, isMythical: false },
      'pokemon-2': { isLegendary: false, isMythical: true },
    })
    render(renderPage(<PokedexPage />))
    fireEvent.click(screen.getByRole('button', { name: 'Exibir filtros' }))

    const legendary = screen.getByRole('checkbox', { name: 'Lendário' })
    const mythical = screen.getByRole('checkbox', { name: 'Mítico' })
    expect(legendary).not.toBeChecked()
    expect(mythical).not.toBeChecked()
    expect(fetchPokemonRarityDetailsMock).not.toHaveBeenCalled()

    fireEvent.click(legendary)
    await waitFor(() => expect(screen.getByText('pokemon-1')).toBeInTheDocument())
    expect(screen.queryByText('pokemon-2')).not.toBeInTheDocument()

    fireEvent.click(mythical)
    await waitFor(() => expect(screen.getByText('pokemon-2')).toBeInTheDocument())
    expect(screen.getByText('pokemon-1')).toBeInTheDocument()
    expect(fetchPokemonRarityDetailsMock).toHaveBeenCalledTimes(1)
  })

  it('filters Pokémon by region using the region combo', async () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    fetchPokemonRegionDetailsMock.mockResolvedValue({
      'pokemon-1': 'kanto',
      'pokemon-2': 'johto',
      'pokemon-3': 'kanto',
    })
    render(renderPage(<PokedexPage />))

    const region = screen.getByRole('combobox', { name: 'Região' })
    expect(region).toHaveTextContent('Todas as regiões')
    expect(region).toHaveAttribute('aria-expanded', 'false')
    expect(fetchPokemonRegionDetailsMock).not.toHaveBeenCalled()

    fireEvent.click(region)
    expect(region).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('option', { name: 'Kanto' }))

    await waitFor(() => expect(screen.getByText('pokemon-1')).toBeInTheDocument())
    expect(screen.getByText('pokemon-3')).toBeInTheDocument()
    expect(screen.queryByText('pokemon-2')).not.toBeInTheDocument()
    expect(fetchPokemonRegionDetailsMock).toHaveBeenCalledTimes(1)
  })
})

describe('Forms filters', () => {
  const filteredForms = [
    {
      name: 'charizard-mega-x',
      url: 'https://pokeapi.co/api/v2/pokemon-form/10034/',
    },
    { name: 'raichu-alola', url: 'https://pokeapi.co/api/v2/pokemon-form/10091/' },
    {
      name: 'butterfree-gmax',
      url: 'https://pokeapi.co/api/v2/pokemon-form/10202/',
    },
  ]
  const filteredSpecies = [
    { name: 'charizard', url: 'https://pokeapi.co/api/v2/pokemon-species/6/' },
    { name: 'butterfree', url: 'https://pokeapi.co/api/v2/pokemon-species/12/' },
    { name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon-species/26/' },
  ]

  function mockFormsApi(typeNames: string[] = []) {
    useApiMock.mockImplementation((pathOrUrl: string | null) => {
      if (!pathOrUrl) return { data: null, loading: false, error: null }
      if (pathOrUrl.startsWith('pokemon-form'))
        return { data: apiList(filteredForms), loading: false, error: null }
      if (pathOrUrl.startsWith('pokemon-species'))
        return { data: apiList(filteredSpecies), loading: false, error: null }
      if (pathOrUrl.startsWith('type/'))
        return {
          data: {
            pokemon: typeNames.map((name) => ({ pokemon: { name, url: `pokemon/${name}` } })),
          },
          loading: false,
          error: null,
        }
      throw new Error(`Unexpected endpoint: ${pathOrUrl}`)
    })
  }

  it('keeps form categories and combines them with the Pokémon type filter', () => {
    mockFormsApi(['charizard-mega-x', 'butterfree-gmax'])
    render(renderPage(<FormsPage />))

    fireEvent.click(screen.getByRole('button', { name: /Mega Formas/ }))
    expect(screen.getByText('charizard-mega-x')).toBeInTheDocument()
    expect(screen.queryByText('raichu-alola')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exibir filtros' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Fogo' }))

    expect(screen.getByText('charizard-mega-x')).toBeInTheDocument()
    expect(screen.queryByText('butterfree-gmax')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mega Formas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('applies the shiny selection to every visible form', () => {
    mockFormsApi()
    render(renderPage(<FormsPage />))

    expect(screen.getAllByTestId('form-card')).toHaveLength(3)
    expect(screen.getAllByTestId('form-card')[0]).toHaveAttribute('data-shiny', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Exibir versões shiny' }))

    expect(screen.getByRole('button', { name: 'Exibir versões normais' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    screen
      .getAllByTestId('form-card')
      .forEach((card) => expect(card).toHaveAttribute('data-shiny', 'true'))
  })

  it('filters forms by region and rarity on demand', async () => {
    mockFormsApi()
    fetchPokemonRegionDetailsMock.mockResolvedValue({
      'charizard-mega-x': 'kanto',
      'raichu-alola': 'alola',
      'butterfree-gmax': 'galar',
    })
    fetchPokemonRarityDetailsMock.mockResolvedValue({
      'charizard-mega-x': { isLegendary: true, isMythical: false },
    })
    render(renderPage(<FormsPage />))

    fireEvent.click(screen.getByRole('combobox', { name: 'Região' }))
    fireEvent.click(screen.getByRole('option', { name: 'Kanto' }))
    await waitFor(() => expect(screen.getByText('charizard-mega-x')).toBeInTheDocument())
    expect(screen.queryByText('raichu-alola')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exibir filtros' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lendário' }))
    await waitFor(() => expect(screen.getByText('charizard-mega-x')).toBeInTheDocument())
    expect(fetchPokemonRegionDetailsMock).toHaveBeenCalledTimes(1)
    expect(fetchPokemonRarityDetailsMock).toHaveBeenCalledTimes(1)
  })

  it('sorts forms in descending National Pokédex order', () => {
    mockFormsApi()
    render(renderPage(<FormsPage />))

    fireEvent.click(screen.getByRole('combobox', { name: 'Ordem' }))
    fireEvent.click(screen.getByRole('option', { name: 'Decrescente' }))

    expect(screen.getAllByTestId('form-card').map((card) => card.textContent)).toEqual([
      'raichu-alola',
      'butterfree-gmax',
      'charizard-mega-x',
    ])
  })

  it('loads base stats on demand and shows the selected metric', async () => {
    mockFormsApi()
    const detail = (attack: number) => ({
      stats: [
        {
          base_stat: attack,
          effort: 0,
          stat: { name: 'attack', url: 'stat/attack' },
        },
      ],
    })
    fetchPokemonSortDetailsMock.mockResolvedValue({
      'charizard-mega-x': detail(130),
      'raichu-alola': detail(85),
      'butterfree-gmax': detail(45),
    })
    render(renderPage(<FormsPage />))

    fireEvent.click(screen.getByRole('combobox', { name: 'Ordenar por' }))
    fireEvent.click(screen.getByRole('option', { name: 'Ataque' }))

    await waitFor(() =>
      expect(screen.getAllByTestId('form-card').map((card) => card.textContent)).toEqual([
        'butterfree-gmax',
        'raichu-alola',
        'charizard-mega-x',
      ]),
    )
    expect(screen.getAllByTestId('form-card')[0]).toHaveAttribute('data-sort-metric', '45')
    expect(fetchPokemonSortDetailsMock).toHaveBeenCalledTimes(1)
  })
})
