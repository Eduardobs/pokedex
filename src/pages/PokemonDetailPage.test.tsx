import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FavoritesProvider } from '../contexts/FavoritesContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import type { Pokemon, PokemonType, Species } from '../types'
import { PokemonDetailPage } from './PokemonDetailPage'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))

const apiBase = 'https://pokeapi.co/api/v2'
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
})

describe('PokemonDetailPage', () => {
  it('connects the overview, favorites, shiny art and keyboard-accessible tabs', async () => {
    useApiMock.mockImplementation((pathOrUrl: string | null) => {
      if (pathOrUrl === 'pokemon/pikachu') return { data: pokemon, loading: false, error: null, retry: vi.fn() }
      if (pathOrUrl === pokemon.species.url) return { data: species, loading: false, error: null, retry: vi.fn() }
      if (pathOrUrl === 'type/electric') return { data: electricType, loading: false, error: null, retry: vi.fn() }
      if (pathOrUrl === pokemon.location_area_encounters)
        return { data: [], loading: false, error: null, retry: vi.fn() }
      return { data: null, loading: false, error: null, retry: vi.fn() }
    })

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Pikachu' })).toBeVisible()
    expect(screen.getByText('Pokémon Rato')).toBeVisible()
    expect(screen.getByText(/Quando vários se juntam/)).toBeVisible()
    expect(screen.getByText('320')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Ver shiny' }))
    expect(screen.getByRole('img', { name: 'Pikachu — Shiny' })).toHaveAttribute('src', 'pikachu-shiny-artwork.png')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Pikachu aos favoritos' }))
    expect(screen.getByRole('button', { name: 'Remover Pikachu dos favoritos' })).toBeVisible()

    const overview = screen.getByRole('tab', { name: 'Visão geral' })
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Golpes 0' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Nenhum Pokémon encontrado' })).toBeVisible()

    fireEvent.click(screen.getByRole('tab', { name: 'Encontros' }))
    expect(screen.getByRole('heading', { name: 'Nenhum encontro selvagem registrado' })).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Dados' }))
    expect(await screen.findByRole('heading', { name: 'Registro da PokéAPI' })).toBeVisible()
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
