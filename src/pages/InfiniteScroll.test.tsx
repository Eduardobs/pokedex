import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import type { ApiList, NamedResource } from '../types'
import { FormsPage } from './FormsPage'
import { PokedexPage } from './PokedexPage'

const { fetchPokemonRarityDetailsMock, useApiMock } = vi.hoisted(() => ({
  fetchPokemonRarityDetailsMock: vi.fn(),
  useApiMock: vi.fn(),
}))

vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../lib/pokemon-catalog', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/pokemon-catalog')>(),
  fetchPokemonRarityDetails: fetchPokemonRarityDetailsMock,
}))
vi.mock('../components/PokemonCard', () => ({
  PokemonCard: ({ name }: { name: string }) => <div>{name}</div>,
}))
vi.mock('../components/PokemonFormDirectoryCard', async (importOriginal) => {
  const original = await importOriginal<typeof import('../components/PokemonFormDirectoryCard')>()
  return {
    ...original,
    PokemonFormDirectoryCard: ({ resource }: { resource: NamedResource }) => <div>{resource.name}</div>,
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

  observe = (target: Element) => { this.targets.add(target) }
  unobserve = (target: Element) => { this.targets.delete(target) }
  disconnect = () => { this.targets.clear() }
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
  return <MemoryRouter><LanguageProvider>{page}</LanguageProvider></MemoryRouter>
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
    useApiMock.mockImplementation((pathOrUrl: string) => ({
      data: pathOrUrl.startsWith('pokemon-form') ? apiList(forms) : apiList(species),
      loading,
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
  it('suggests matching Pokémon names while typing', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))
    const search = screen.getByRole('combobox', { name: 'Filtrar todos os Pokémon por nome ou número' })

    fireEvent.change(search, { target: { value: 'pokemon-2' } })

    const suggestions = screen.getByRole('listbox')
    expect(within(suggestions).getAllByRole('option')[0]).toHaveTextContent('Pokemon 2')
  })

  it('shows type filters as icons with their name in a tooltip', () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    render(renderPage(<PokedexPage />))

    const fireFilter = screen.getByRole('button', { name: 'Fogo' })
    expect(fireFilter).toHaveAttribute('title', 'Fogo')
    expect(fireFilter).not.toHaveTextContent('Fogo')
    expect(fireFilter.querySelector('.type-badge')).toHaveClass('icon-only')
  })

  it('filters legendary and mythical Pokémon with unchecked checkboxes by default', async () => {
    useApiMock.mockReturnValue({ data: apiList(pokemon), loading: false, error: null })
    fetchPokemonRarityDetailsMock.mockResolvedValue({
      'pokemon-1': { isLegendary: true, isMythical: false },
      'pokemon-2': { isLegendary: false, isMythical: true },
    })
    render(renderPage(<PokedexPage />))

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
})
