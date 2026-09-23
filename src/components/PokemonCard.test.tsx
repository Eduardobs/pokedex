import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FavoritesProvider } from '../contexts/FavoritesContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import type { Pokemon } from '../types'
import { PokemonCard } from './PokemonCard'

const pokemon = {
  id: 1,
  name: 'bulbasaur',
  sprites: {
    front_default: 'normal-sprite.png',
    front_shiny: 'shiny-sprite.png',
    other: {
      'official-artwork': {
        front_default: 'normal-artwork.png',
        front_shiny: 'shiny-artwork.png',
      },
    },
  },
  types: [{ slot: 1, type: { name: 'grass', url: '/type/12' } }],
} as Pokemon

function renderCard(shiny = false) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <FavoritesProvider>
          <PokemonCard id={pokemon.id} name={pokemon.name} pokemon={pokemon} shiny={shiny} />
        </FavoritesProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('PokemonCard', () => {
  it('exibe a arte definida pela listagem sem renderizar um toggle individual', () => {
    const view = renderCard()

    expect(screen.getByRole('img', { name: 'Bulbasaur — Normal' })).toHaveAttribute(
      'src',
      'normal-artwork.png',
    )
    expect(screen.queryByRole('button', { name: /shiny/i })).not.toBeInTheDocument()

    view.rerender(
      <MemoryRouter>
        <LanguageProvider>
          <FavoritesProvider>
            <PokemonCard id={pokemon.id} name={pokemon.name} pokemon={pokemon} shiny />
          </FavoritesProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: 'Bulbasaur — Shiny' })).toHaveAttribute(
      'src',
      'shiny-artwork.png',
    )
  })
})
