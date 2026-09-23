import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { MapsPage } from './MapsPage'

afterEach(cleanup)

describe('MapsPage', () => {
  it('makes Kanto, Scarlet and Violet, and the single Legends Arceus map available', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <MapsPage />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /Pokémon FireRed & LeafGreen/i })).toHaveAttribute(
      'href',
      '/mapas/kanto',
    )
    expect(screen.getByRole('heading', { name: 'Pokémon Scarlet & Violet' })).toBeVisible()
    expect(screen.getByAltText(/Koraidon e Miraidon/i)).toHaveAttribute(
      'src',
      '/maps/scarlet-violet-cover.webp',
    )

    expect(screen.getByRole('link', { name: /Região de Paldea/i })).toHaveAttribute(
      'href',
      '/mapas/paldea',
    )
    expect(screen.getByRole('link', { name: /Região de Kitakami/i })).toHaveAttribute(
      'href',
      '/mapas/kitakami',
    )
    expect(screen.getByRole('link', { name: /Terarium/i })).toHaveAttribute(
      'href',
      '/mapas/terrarium',
    )
    expect(screen.queryByText('Em breve')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pokémon Legends: Arceus/i })).toHaveAttribute(
      'href',
      '/mapas/hisui-region',
    )
    expect(screen.getByAltText(/arte de capa de Pokémon Legends: Arceus/i)).toHaveAttribute(
      'src',
      '/maps/legends-arceus-map.jpg',
    )
    expect(screen.getByText('2.525 pontos catalogados')).toBeVisible()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Pokémon FireRed & LeafGreen',
      'Pokémon Legends: Arceus',
      'Pokémon Scarlet & Violet',
    ])
  })
})
