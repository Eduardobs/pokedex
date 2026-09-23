import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { PALDEA_CATEGORIES, PALDEA_MARKERS } from '../data/maps/paldea-map'
import { PaldeaMapPage } from './PaldeaMapPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <PaldeaMapPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('PaldeaMapPage', () => {
  it('renders the complete Paldea catalog and filters it by category', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Mapa interativo de Paldea' })).toBeVisible()
    expect(screen.getByText('3.985 pins visíveis')).toBeVisible()
    expect(screen.getByLabelText('Resumo do catálogo do mapa')).toHaveTextContent('32 categorias')

    fireEvent.click(screen.getByRole('checkbox', { name: /Pokémon lendário/ }))
    expect(screen.getByText('3.955 pins visíveis')).toBeVisible()
  })

  it('searches and opens an accessible Paldea marker', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'Iono' },
    })

    const pin = screen.getByRole('button', { name: /Líder de Ginásio: Iono/ })
    fireEvent.click(pin)

    expect(screen.getByRole('heading', { name: 'Iono' })).toBeVisible()
    expect(screen.getByText('East Province (Area Two)')).toBeVisible()
    expect(pin).toHaveAttribute('aria-pressed', 'true')
  })

  it('matches every category count and keeps markers inside the map bounds', () => {
    const counts = new Map<string, number>()
    PALDEA_MARKERS.forEach((marker) => {
      counts.set(marker.category, (counts.get(marker.category) ?? 0) + 1)
      expect(marker.x).toBeGreaterThanOrEqual(0)
      expect(marker.x).toBeLessThanOrEqual(16_384)
      expect(marker.y).toBeGreaterThanOrEqual(0)
      expect(marker.y).toBeLessThanOrEqual(16_384)
    })

    PALDEA_CATEGORIES.forEach((category) => {
      expect(counts.get(category.id)).toBe(category.count)
    })
    expect(PALDEA_MARKERS).toHaveLength(3985)
  })
})
