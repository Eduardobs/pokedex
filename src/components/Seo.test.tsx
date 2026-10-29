import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter } from 'react-router-dom'
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext'
import { Seo } from './Seo'

function Page() {
  const { setLanguage } = useLanguage()
  return (
    <>
      <Seo title="Pokédex" description="Browse Pokémon" />
      <Link to="/explore/ability/static">Ability</Link>
      <Link to="/">Home</Link>
      <button onClick={() => setLanguage('es')}>Español</button>
    </>
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllEnvs()
  document.head.querySelectorAll('meta, link[rel="canonical"]').forEach((element) => element.remove())
})

describe('SEO metadata', () => {
  it('marks unknown routes as noindex and restores indexing after navigation', () => {
    const view = render(
      <MemoryRouter initialEntries={['/missing']}>
        <LanguageProvider>
          <Seo title="Página não encontrada" description="Missing page" />
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    view.rerender(
      <MemoryRouter initialEntries={['/missing']}>
        <LanguageProvider>
          <Seo title="Pokédex" description="Browse Pokémon" />
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  })

  it('updates detail metadata on navigation and language changes without duplicate tags', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://atlas.example/pokedex/')
    render(
      <MemoryRouter initialEntries={['/pokemon/pikachu?from=forms']}>
        <LanguageProvider>
          <Page />
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(document.title).toBe('pikachu — Pokédex · Atlas Pokémon')
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('pikachu'),
    )
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://atlas.example/pokedex/',
    )
    fireEvent.click(screen.getByText('Ability'))
    expect(document.title).toContain('static')
    fireEvent.click(screen.getByText('Español'))
    expect(document.head.querySelector('meta[property="og:locale"]')).toHaveAttribute('content', 'es_ES')
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('Consulta'),
    )
    fireEvent.click(screen.getByText('Home'))
    expect(document.title).toBe('Pokédex, tipos y equipos · Atlas Pokémon')
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(document.head.querySelector('meta[name="twitter:title"]')).toHaveAttribute('content', document.title)
  })

  it('uses clean canonical URLs in history mode and removes stale URLs when unconfigured', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://atlas.example/pokedex/')
    vi.stubEnv('VITE_ROUTER_MODE', 'history')
    const view = render(
      <MemoryRouter initialEntries={['/pokemon/pikachu?from=forms']}>
        <LanguageProvider>
          <Page />
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://atlas.example/pokedex/pokemon/pikachu',
    )
    view.unmount()
    vi.stubEnv('VITE_SITE_URL', '')
    render(
      <MemoryRouter>
        <LanguageProvider>
          <Page />
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  })
})
