import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ScrollToTop } from './ScrollToTop'

describe('ScrollToTop', () => {
  let scrollY = 0

  beforeEach(() => {
    scrollY = 0
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const renderButton = () =>
    render(
      <LanguageProvider>
        <a className="brand" href="/">
          Atlas Pokémon
        </a>
        <ScrollToTop />
      </LanguageProvider>,
    )

  it('only displays the control when the page is away from the top', () => {
    renderButton()
    expect(screen.queryByRole('button', { name: 'Voltar ao topo' })).not.toBeInTheDocument()

    scrollY = 120
    fireEvent.scroll(window)
    expect(screen.getByRole('button', { name: 'Voltar ao topo' })).toBeInTheDocument()

    scrollY = 0
    fireEvent.scroll(window)
    expect(screen.queryByRole('button', { name: 'Voltar ao topo' })).not.toBeInTheDocument()
  })

  it('scrolls smoothly to the top and moves focus to the page header', () => {
    scrollY = 120
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao topo' }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(screen.getByRole('link', { name: 'Atlas Pokémon' })).toHaveFocus()
  })

  it('avoids smooth scrolling when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    scrollY = 120
    renderButton()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao topo' }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
