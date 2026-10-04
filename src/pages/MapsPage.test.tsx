import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { MapsPage } from './MapsPage'

afterEach(cleanup)

describe('MapsPage', () => {
  it('makes every game and its available maps accessible', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <MapsPage />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /Pokémon FireRed & LeafGreen/i })).toHaveAttribute('href', '/maps/kanto')
    expect(screen.getByRole('heading', { name: 'Pokémon Scarlet & Violet' })).toBeVisible()
    expect(screen.getByAltText(/Koraidon e Miraidon/i)).toHaveAttribute('src', '/maps/scarlet-violet-cover.webp')

    expect(screen.getByRole('link', { name: /Região de Paldea/i })).toHaveAttribute('href', '/maps/paldea')
    expect(screen.getByRole('link', { name: /Região de Kitakami/i })).toHaveAttribute('href', '/maps/kitakami')
    expect(screen.getByRole('link', { name: /Terarium/i })).toHaveAttribute('href', '/maps/terrarium')
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pokémon Legends: Arceus/i })).toHaveAttribute('href', '/maps/hisui-region')
    expect(screen.getByAltText(/arte de capa de Pokémon Legends: Arceus/i)).toHaveAttribute(
      'src',
      '/maps/legends-arceus-map.jpg',
    )
    expect(screen.getByText('2.525 pontos catalogados')).toBeVisible()
    expect(screen.getByRole('link', { name: /Pokémon Legends: Z-A/i })).toHaveAttribute('href', '/maps/lumiose-city')
    expect(screen.getByAltText(/arte de capa de Pokémon Legends: Z-A/i)).toHaveAttribute(
      'src',
      '/maps/pokemon-legends-za-cover.png',
    )
    expect(screen.getByText('1.979 pontos catalogados')).toBeVisible()

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Pokémon FireRed & LeafGreen',
      'Pokémon Legends: Arceus',
      'Pokémon Legends: Z-A',
      'Pokémon Scarlet & Violet',
    ])
  })
})
