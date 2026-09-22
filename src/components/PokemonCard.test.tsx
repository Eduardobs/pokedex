import { fireEvent, render, screen } from '@testing-library/react'
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

function renderCard() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <FavoritesProvider>
          <PokemonCard id={pokemon.id} name={pokemon.name} pokemon={pokemon} />
        </FavoritesProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('PokemonCard', () => {
  it('alterna entre as artes normal e shiny', () => {
    renderCard()

    const image = screen.getByRole('img', { name: 'Bulbasaur — Normal' })
    const toggle = screen.getByRole('button', { name: 'Exibir versão shiny de Bulbasaur' })
    expect(image).toHaveAttribute('src', 'normal-artwork.png')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)

    expect(screen.getByRole('img', { name: 'Bulbasaur — Shiny' })).toHaveAttribute(
      'src',
      'shiny-artwork.png',
    )
    const normalToggle = screen.getByRole('button', { name: 'Exibir versão normal de Bulbasaur' })
    expect(normalToggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(normalToggle)
    expect(screen.getByRole('img', { name: 'Bulbasaur — Normal' })).toHaveAttribute(
      'src',
      'normal-artwork.png',
    )
  })
})
