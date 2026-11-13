import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { FavoritesProvider } from '../contexts/FavoritesContext'
import { LanguageProvider } from '../contexts/LanguageContext'
import { Layout } from './Layout'
import { STORAGE_KEYS } from '../config/app'

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  return (
    <input
      aria-label="Filtrar Pokémon"
      value={query}
      onChange={(event) => setSearchParams(event.target.value ? { q: event.target.value } : {}, { replace: true })}
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

  it('switches both themes and restores the saved preference after remounting', () => {
    const previousTheme = localStorage.getItem(STORAGE_KEYS.theme)
    const previousDocumentTheme = document.documentElement.dataset.theme
    const previousColorScheme = document.documentElement.style.colorScheme
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    localStorage.setItem(STORAGE_KEYS.theme, 'light')
    document.documentElement.dataset.theme = 'light'

    try {
      const first = renderLayout()
      fireEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' }))
      expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toHaveAttribute('aria-pressed', 'true')
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(meta.content).toBe('#0d1419')
      expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')

      first.unmount()
      renderLayout()
      fireEvent.click(screen.getByRole('button', { name: 'Ativar tema claro' }))
      expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toHaveAttribute('aria-pressed', 'false')
      expect(document.documentElement.dataset.theme).toBe('light')
      expect(meta.content).toBe('#f5f7f8')
      expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')
    } finally {
      meta.remove()
      if (previousTheme === null) localStorage.removeItem(STORAGE_KEYS.theme)
      else localStorage.setItem(STORAGE_KEYS.theme, previousTheme)
      if (previousDocumentTheme === undefined) delete document.documentElement.dataset.theme
      else document.documentElement.dataset.theme = previousDocumentTheme
      document.documentElement.style.colorScheme = previousColorScheme
    }
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

  it('groups navigation links and marks the selected route', () => {
    renderLayout()

    const pokedexGroup = screen.getByRole('button', { name: 'Pokédex' })
    expect(pokedexGroup).toHaveClass('nav-group-trigger')
    expect(pokedexGroup.closest('.nav-group')).toHaveClass('has-active-item')

    fireEvent.click(pokedexGroup)
    expect(screen.getByRole('link', { name: 'Pokédex' })).toHaveClass('active')
    expect(
      within(screen.getByRole('navigation', { name: 'Navegação principal' })).getByRole('link', { name: /Favoritos/ }),
    ).toBeInTheDocument()
  })

  it('closes an open navigation group when clicking outside it', () => {
    renderLayout()

    const pokedexGroup = screen.getByRole('button', { name: 'Pokédex' })
    fireEvent.click(pokedexGroup)
    expect(pokedexGroup).toHaveAttribute('aria-expanded', 'true')

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Idioma' }))
    expect(pokedexGroup).toHaveAttribute('aria-expanded', 'false')
  })
})
