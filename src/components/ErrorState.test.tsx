import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ErrorState } from './ErrorState'

afterEach(cleanup)

describe('ErrorState', () => {
  it('offers retry and a route back to the Pokédex', () => {
    const retry = vi.fn()
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ErrorState title="Unavailable" message="Try again later" retry={retry} />
        </LanguageProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: /Voltar à Pokédex/ })).toHaveAttribute('href', '/pokemon')
  })

  it('uses translated keys and returns unknown routes home', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ErrorState titleKey="error.notFoundTitle" messageKey="error.notFoundDesc" home />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Ir para o início/ })).toHaveAttribute('href', '/')
  })
})
