import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { FavoritesProvider } from '../contexts/FavoritesContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import { Layout } from './Layout'

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  return (
    <input
      aria-label="Filtrar Pokémon"
      value={query}
      onChange={(event) =>
        setSearchParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
      }
    />
  )
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/pokemon']}>
      <LanguageProvider>
        <FavoritesProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="pokemon" element={<SearchPage />} />
            </Route>
          </Routes>
        </FavoritesProvider>
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('Layout focus management', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 0
    })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('keeps the search field focused when only the query string changes', async () => {
    renderLayout()
    const search = screen.getByRole('textbox', { name: 'Filtrar Pokémon' })
    search.focus()

    fireEvent.change(search, { target: { value: 'p' } })

    await waitFor(() => expect(search).toHaveFocus())
    expect(search).toHaveValue('p')
  })

  it('moves focus through language options and restores it on Escape', () => {
    renderLayout()
    const trigger = screen.getByRole('button', { name: 'Idioma' })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const portuguese = screen.getByRole('option', { name: /Português/ })
    expect(portuguese).toHaveFocus()

    fireEvent.keyDown(portuguese, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: /English/ })).toHaveFocus()

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('listbox', { name: 'Idioma' })).not.toBeInTheDocument()
  })
})
