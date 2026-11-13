import { API_BASE_URL } from '../config/app'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FavoritesProvider } from '../contexts/FavoritesContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import type { Pokemon, PokemonType, Species } from '../types'
import { FEATURE_FLAGS } from '../config/feature-flags'
import { PokemonDetailPage } from './PokemonDetailPage'
import * as moveLearning from '../lib/move-learning'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../config/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/feature-flags')>()
  return {
    ...actual,
    FEATURE_FLAGS: {
      ...actual.FEATURE_FLAGS,
      get pokemon3D() {
        return true
      },
    },
  }
})

const apiBase = API_BASE_URL
const resource = (endpoint: string, id: number, name: string) => ({
  name,
  url: `${apiBase}/${endpoint}/${id}/`,
})
const stats = [
  ['hp', 35],
  ['attack', 55],
  ['defense', 40],
  ['special-attack', 50],
  ['special-defense', 50],
  ['speed', 90],
].map(([name, value], index) => ({
  base_stat: value as number,
  effort: 0,
  stat: resource('stat', index + 1, name as string),
}))

const pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  order: 35,
  is_default: true,
  location_area_encounters: `${apiBase}/pokemon/25/encounters`,
  sprites: {
    front_default: 'pikachu.png',
    front_shiny: 'pikachu-shiny.png',
    other: {
      'official-artwork': { front_default: 'pikachu-artwork.png', front_shiny: 'pikachu-shiny-artwork.png' },
    },
  },
  types: [{ slot: 1, type: resource('type', 13, 'electric') }],
  stats,
  abilities: [],
  moves: [],
  species: resource('pokemon-species', 25, 'pikachu'),
  forms: [],
  game_indices: [],
  held_items: [],
} as Pokemon

const species = {
  id: 25,
  name: 'pikachu',
  flavor_text_entries: [
    {
      flavor_text: 'Quando vários se juntam, sua eletricidade causa tempestades.',
      language: resource('language', 9, 'pt-br'),
      version: resource('version', 1, 'red'),
    },
  ],
  genera: [{ genus: 'Pokémon Rato', language: resource('language', 9, 'pt-br') }],
  color: resource('pokemon-color', 10, 'yellow'),
  shape: resource('pokemon-shape', 8, 'quadruped'),
  habitat: resource('pokemon-habitat', 2, 'forest'),
  generation: resource('generation', 1, 'generation-i'),
  growth_rate: resource('growth-rate', 2, 'medium'),
  egg_groups: [resource('egg-group', 5, 'field')],
  evolution_chain: null,
  gender_rate: 4,
  capture_rate: 190,
  base_happiness: 50,
  hatch_counter: 10,
  has_gender_differences: false,
  forms_switchable: false,
  is_baby: false,
  is_legendary: false,
  is_mythical: false,
  varieties: [],
} as Species

const electricType = {
  id: 13,
  name: 'electric',
  damage_relations: {
    double_damage_from: [resource('type', 5, 'ground')],
    half_damage_from: [resource('type', 3, 'flying')],
    no_damage_from: [],
  },
} as PokemonType

function renderPage(path = '/pokemon/pikachu') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <FavoritesProvider>
          <Routes>
            <Route path="pokemon/:name" element={<PokemonDetailPage />} />
          </Routes>
        </FavoritesProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
    callback({ didTimeout: false, timeRemaining: () => 50 })
    return 1
  })
  vi.stubGlobal('cancelIdleCallback', vi.fn())
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  useApiMock.mockReset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PokemonDetailPage', () => {
  it('switches descriptions by game while keeping language fallback within the selected version', () => {
    const versionedSpecies = {
      ...species,
      flavor_text_entries: [
        {
          flavor_text: 'Red English entry.',
          language: resource('language', 9, 'en'),
          version: resource('version', 1, 'red'),
        },
        ...species.flavor_text_entries,
        {
          flavor_text: 'Yellow English entry.\nSecond line.',
          language: resource('language', 9, 'en'),
          version: resource('version', 3, 'yellow'),
        },
      ],
    }
    useApiMock.mockImplementation((path: string | null) => ({
      data: path === 'pokemon/pikachu' ? pokemon : path === pokemon.species.url ? versionedSpecies : null,
      loading: false,
      error: null,
      retry: vi.fn(),
    }))
    renderPage()
    expect(screen.getByText(species.flavor_text_entries[0].flavor_text)).toBeVisible()
    const selector = screen.getByRole('combobox', { name: 'Versão do jogo' })
    fireEvent.click(selector)
    expect(screen.getAllByRole('option')).toHaveLength(2)
    fireEvent.click(screen.getByRole('option', { name: 'Yellow' }))
    expect(screen.getByText('Yellow English entry. Second line.')).toHaveAttribute('lang', 'en')
    expect(screen.getByText(/Conteúdo exibido em inglês/)).toBeVisible()
    expect(screen.queryByText(species.flavor_text_entries[0].flavor_text)).not.toBeInTheDocument()
    fireEvent.keyDown(selector, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: 'Red' }))
    expect(screen.getByText(species.flavor_text_entries[0].flavor_text)).toHaveAttribute('lang', 'pt-br')
    expect(screen.queryByText(/Conteúdo exibido em inglês/)).not.toBeInTheDocument()
  })

  it('preserves descriptions when version metadata is missing', () => {
    useApiMock.mockImplementation((path: string | null) => ({
      data:
        path === 'pokemon/pikachu'
          ? pokemon
          : path === pokemon.species.url
            ? {
                ...species,
                flavor_text_entries: [
                  { flavor_text: 'Unversioned description.', language: resource('language', 9, 'en') },
                ],
              }
            : null,
      loading: false,
      error: null,
      retry: vi.fn(),
    }))
    renderPage()
    expect(screen.getByText('Unversioned description.')).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'Versão do jogo' })).not.toBeInTheDocument()
  })

  it('keeps the empty description state when no game entries exist', () => {
    useApiMock.mockImplementation((path: string | null) => ({
      data:
        path === 'pokemon/pikachu'
          ? pokemon
          : path === pokemon.species.url
            ? { ...species, flavor_text_entries: [] }
            : null,
      loading: false,
      error: null,
      retry: vi.fn(),
    }))
    renderPage()
    expect(screen.queryByRole('combobox', { name: 'Versão do jogo' })).not.toBeInTheDocument()
    expect(screen.getByText('Não há descrição disponível para este Pokémon.')).toBeVisible()
  })

  it('hides 3D and excludes it from keyboard navigation when disabled', () => {
    vi.spyOn(FEATURE_FLAGS, 'pokemon3D', 'get').mockReturnValue(false)
    useApiMock.mockImplementation((path: string | null) => ({
      data: path === 'pokemon/pikachu' ? pokemon : null,
      loading: false,
      error: null,
      retry: vi.fn(),
    }))
    renderPage()
    expect(screen.queryByRole('tab', { name: '3D' })).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Visão geral' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Dados' })).toHaveFocus()
    expect(screen.queryByRole('tabpanel', { name: '3D' })).not.toBeInTheDocument()
  })

  it('connects the overview, favorites, shiny art and keyboard-accessible tabs', async () => {
    useApiMock.mockImplementation((pathOrUrl: string | null) => {
      if (pathOrUrl === 'pokemon/pikachu') return { data: pokemon, loading: false, error: null, retry: vi.fn() }
      if (pathOrUrl === pokemon.species.url) return { data: species, loading: false, error: null, retry: vi.fn() }
      if (pathOrUrl === 'type/electric') return { data: electricType, loading: false, error: null, retry: vi.fn() }
      if (pathOrUrl === pokemon.location_area_encounters)
        return { data: [], loading: false, error: null, retry: vi.fn() }
      return { data: null, loading: false, error: null, retry: vi.fn() }
    })

    const versions = vi.spyOn(moveLearning, 'moveVersionGroups')
    renderPage()
    expect(versions).not.toHaveBeenCalled()

    expect(screen.getByRole('heading', { level: 1, name: 'Pikachu' })).toBeVisible()
    expect(screen.getByText('Pokémon Rato')).toBeVisible()
    expect(screen.getByText(/Quando vários se juntam/)).toBeVisible()
    expect(screen.getByText('320')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Ver shiny' }))
    expect(screen.getByRole('img', { name: 'Pikachu — Shiny' })).toHaveAttribute('src', 'pikachu-shiny-artwork.png')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Pikachu aos favoritos' }))
    expect(screen.getByRole('button', { name: 'Remover Pikachu dos favoritos' })).toBeVisible()

    expect(screen.getByRole('tab', { name: '3D' })).toBeVisible()
    const overview = screen.getByRole('tab', { name: 'Visão geral' })
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    const evolutions = screen.getByRole('tab', { name: 'Evoluções' })
    expect(evolutions).toHaveAttribute('aria-selected', 'true')
    expect(evolutions).toHaveFocus()
    fireEvent.keyDown(evolutions, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Golpes 0' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: 'Nenhum Pokémon encontrado' })).toBeVisible()
    expect(versions).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar golpe...' }), { target: { value: 'thunder' } })

    fireEvent.click(screen.getByRole('tab', { name: 'Encontros' }))
    expect(await screen.findByRole('heading', { name: 'Nenhum encontro selvagem registrado' })).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Dados' }))
    expect(await screen.findByRole('heading', { name: 'Registro da PokéAPI' })).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Golpes 0' }))
    expect(screen.getByRole('textbox', { name: 'Buscar golpe...' })).toHaveValue('thunder')
  })

  it('offers retry when the requested Pokémon cannot be loaded', () => {
    const retry = vi.fn()
    useApiMock.mockReturnValue({ data: null, loading: false, error: new Error('offline'), retry })

    renderPage('/pokemon/missingno')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(retry).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Pokémon não encontrado' })).toBeVisible()
  })
})
