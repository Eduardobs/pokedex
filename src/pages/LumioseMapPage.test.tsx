import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { LUMIOSE_CATEGORIES, LUMIOSE_MARKERS } from '../data/maps/lumiose-map'
import { LumioseMapPage } from './LumioseMapPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <LumioseMapPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('LumioseMapPage', () => {
  it('renders the complete Lumiose City catalog and filters it by category', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Mapa interativo de Lumiose City' })).toBeVisible()
    expect(screen.getByText('1.979 pins visíveis')).toBeVisible()
    expect(screen.getByLabelText('Resumo do catálogo do mapa')).toHaveTextContent('24 categorias')

    fireEvent.click(screen.getByRole('checkbox', { name: /Parafuso colorido/ }))
    expect(screen.getByText('1.879 pins visíveis')).toBeVisible()
  })

  it('searches and opens an accessible Lumiose City marker', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'Prism Tower' },
    })

    const pin = screen.getByRole('button', {
      name: /^Ponto de interesse: Prism Tower, Lumiose City$/,
    })
    fireEvent.click(pin)

    expect(screen.getByRole('heading', { name: 'Prism Tower' })).toBeVisible()
    expect(screen.getAllByText('Lumiose City')).toHaveLength(2)
    expect(pin).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps Lumiose tiles aligned when the source zoom changes', () => {
    const { container } = renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }))

    const topRightTile = Array.from(container.querySelectorAll<HTMLImageElement>('.map-tile-layer img')).find(
      (tile) => tile.style.left === '8192px' && tile.style.top === '0px',
    )

    expect(topRightTile).toHaveAttribute(
      'src',
      'https://tiles.mapgenie.io/games/pokemon-legends-z-a/lumiose-city/day-v2/9/254/255.jpg',
    )
  })

  it('matches every category count and keeps markers inside the map bounds', () => {
    const counts = new Map<string, number>()
    LUMIOSE_MARKERS.forEach((marker) => {
      counts.set(marker.category, (counts.get(marker.category) ?? 0) + 1)
      expect(marker.x).toBeGreaterThanOrEqual(0)
      expect(marker.x).toBeLessThanOrEqual(16_384)
      expect(marker.y).toBeGreaterThanOrEqual(0)
      expect(marker.y).toBeLessThanOrEqual(16_384)
    })

    LUMIOSE_CATEGORIES.forEach((category) => {
      expect(counts.get(category.id)).toBe(category.count)
    })
    expect(LUMIOSE_MARKERS).toHaveLength(1_979)
  })
})
