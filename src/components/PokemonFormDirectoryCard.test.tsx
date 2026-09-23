import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { PokemonFormDirectoryCard } from './PokemonFormDirectoryCard'

const { retryMock, useApiMock } = vi.hoisted(() => ({ retryMock: vi.fn(), useApiMock: vi.fn() }))

vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../hooks/useIntersectionVisibility', () => ({
  useIntersectionVisibility: () => ({ targetRef: { current: null }, visible: true }),
}))

describe('PokemonFormDirectoryCard', () => {
  beforeEach(() => {
    retryMock.mockReset()
    useApiMock.mockReset()
  })

  afterEach(cleanup)

  it('shows a recoverable error instead of an endless skeleton', () => {
    useApiMock.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('offline'),
      retry: retryMock,
    })
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonFormDirectoryCard
            resource={{
              name: 'charizard-mega-x',
              url: 'https://pokeapi.co/api/v2/pokemon-form/10034/',
            }}
            category="mega"
          />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar esta forma.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retryMock).toHaveBeenCalledOnce()
  })

  it('shows the matching official shiny artwork when requested', () => {
    useApiMock.mockReturnValue({
      data: {
        pokemon: { name: 'charizard-mega-x', url: 'https://pokeapi.co/api/v2/pokemon/10034/' },
        sprites: {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10034.png',
          front_shiny:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10034.png',
        },
        types: [{ type: { name: 'fire', url: 'type/fire' } }],
        is_battle_only: true,
      },
      loading: false,
      error: null,
    })
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonFormDirectoryCard
            resource={{
              name: 'charizard-mega-x',
              url: 'https://pokeapi.co/api/v2/pokemon-form/10034/',
            }}
            category="mega"
            shiny
          />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: /Shiny$/ })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/10034.png',
    )
  })

  it('shows shiny artwork for Zygarde Mega even when form sprites are null', () => {
    useApiMock.mockReturnValue({
      data: {
        pokemon: { name: 'zygarde-mega', url: 'https://pokeapi.co/api/v2/pokemon/10301/' },
        sprites: {
          front_default: null,
          front_shiny: null,
          back_default: null,
          back_shiny: null,
        },
        types: [{ type: { name: 'dragon', url: 'type/dragon' } }],
        is_battle_only: true,
      },
      loading: false,
      error: null,
    })
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonFormDirectoryCard
            resource={{
              name: 'zygarde-mega',
              url: 'https://pokeapi.co/api/v2/pokemon-form/10526/',
            }}
            category="mega"
            shiny
          />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: /Shiny$/ })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/10301.png',
    )
  })

  it('resets the source chain when Zygarde Mega switches between normal and shiny', () => {
    useApiMock.mockReturnValue({
      data: {
        pokemon: { name: 'zygarde-mega', url: 'https://pokeapi.co/api/v2/pokemon/10301/' },
        sprites: {
          front_default: null,
          front_shiny: null,
          back_default: null,
          back_shiny: null,
        },
        types: [{ type: { name: 'dragon', url: 'type/dragon' } }],
        is_battle_only: true,
      },
      loading: false,
      error: null,
    })
    const card = (shiny: boolean) => (
      <MemoryRouter>
        <LanguageProvider>
          <PokemonFormDirectoryCard
            resource={{
              name: 'zygarde-mega',
              url: 'https://pokeapi.co/api/v2/pokemon-form/10526/',
            }}
            category="mega"
            shiny={shiny}
          />
        </LanguageProvider>
      </MemoryRouter>
    )
    const view = render(card(false))

    expect(screen.getByRole('img', { name: /Normal$/ })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10301.png',
    )

    view.rerender(card(true))

    expect(screen.getByRole('img', { name: /Shiny$/ })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/10301.png',
    )
  })

  it.each([
    ['garchomp-mega-z', 10309, true, 'shiny/10309.png', /Shiny$/],
    ['tatsugiri-droopy-mega', 10323, false, 'pokemon/10323.png', /Normal$/],
  ])(
    'falls back to the available sprite when inferred artwork fails for %s',
    (name, pokemonId, shiny, expectedPath, accessibleName) => {
      useApiMock.mockReturnValue({
        data: {
          pokemon: { name, url: `https://pokeapi.co/api/v2/pokemon/${pokemonId}/` },
          sprites: {
            front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
            front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
            back_default: null,
            back_shiny: null,
          },
          types: [{ type: { name: 'dragon', url: 'type/dragon' } }],
          is_battle_only: true,
        },
        loading: false,
        error: null,
      })
      render(
        <MemoryRouter>
          <LanguageProvider>
            <PokemonFormDirectoryCard
              resource={{ name, url: `https://pokeapi.co/api/v2/pokemon-form/${pokemonId}/` }}
              category="mega"
              shiny={shiny}
            />
          </LanguageProvider>
        </MemoryRouter>,
      )

      const image = screen.getByRole('img')
      fireEvent.error(image)

      expect(screen.getByRole('img', { name: accessibleName })).toHaveAttribute(
        'src',
        expect.stringContaining(expectedPath),
      )
      expect(image).toHaveClass('sprite-art')
    },
  )
})
