import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { KANTO_MARKERS, MAP_CATEGORIES } from '../data/maps/kanto-map'
import { KantoMapPage } from './KantoMapPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <KantoMapPage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('KantoMapPage', () => {
  it('filters pins by category and restores all filters', () => {
    renderPage()
    const caveFilter = screen.getByRole('checkbox', { name: /Caverna/ })

    expect(screen.getByText('1.963 pins visíveis')).toBeInTheDocument()

    fireEvent.click(caveFilter)

    expect(screen.getByText('1.919 pins visíveis')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Marcar todos' }))

    expect(screen.getByText('1.963 pins visíveis')).toBeInTheDocument()
  })

  it('shows no pins or empty-state message when all categories are cleared', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))

    expect(screen.getByText('0 pins visíveis')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nenhum pin encontrado' })).not.toBeInTheDocument()
  })

  it('keeps the empty-state message for an unmatched search with active categories', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'local inexistente' },
    })

    expect(screen.getByRole('heading', { name: 'Nenhum pin encontrado' })).toBeVisible()
  })

  it('searches and opens accessible pin details', () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar um ponto no mapa' }), {
      target: { value: 'Misty' },
    })

    const pin = screen.getByRole('button', { name: /Líder de Ginásio: Misty/ })
    fireEvent.click(pin)

    expect(screen.getByRole('heading', { name: 'Misty' })).toBeInTheDocument()
    expect(screen.getByText('Cerulean Gym')).toBeInTheDocument()
    expect(pin).toHaveAttribute('aria-pressed', 'true')
  })

  it('supports zoom controls and keyboard reset', () => {
    renderPage()
    const viewport = screen.getByLabelText(/Mapa de Kanto\. Use as setas/)
    const zoom = screen.getByRole('status', { name: 'Nível de zoom' })

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }))
    expect(zoom).toHaveTextContent('150%')

    fireEvent.keyDown(viewport, { key: '0' })
    expect(zoom).toHaveTextContent('100%')
  })

  it('zooms beyond 800 percent up to 3200 percent', () => {
    renderPage()
    const zoomIn = screen.getByRole('button', { name: 'Ampliar mapa' })
    const zoom = screen.getByRole('status', { name: 'Nível de zoom' })

    for (let index = 0; index < 11; index += 1) fireEvent.click(zoomIn)

    expect(zoom).toHaveTextContent('3200%')
    expect(zoomIn).toBeDisabled()
  })

  it('uses the mouse wheel only for map zoom while the pointer is over the map', () => {
    renderPage()
    const viewport = screen.getByLabelText(/Mapa de Kanto\. Use as setas/)
    const zoom = screen.getByRole('status', { name: 'Nível de zoom' })
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 512,
      clientY: 360,
      deltaY: -100,
    })

    expect(fireEvent(viewport, wheel)).toBe(false)
    expect(wheel.defaultPrevented).toBe(true)
    expect(viewport).toHaveFocus()
    expect(zoom).toHaveTextContent('150%')
  })

  it('contains the exact catalog count for every requested category', () => {
    const counts = new Map<string, number>()
    KANTO_MARKERS.forEach((marker) => {
      counts.set(marker.category, (counts.get(marker.category) ?? 0) + 1)
    })

    MAP_CATEGORIES.forEach((category) => {
      expect(counts.get(category.id)).toBe(category.count)
    })
    expect(KANTO_MARKERS).toHaveLength(1963)
  })
})
