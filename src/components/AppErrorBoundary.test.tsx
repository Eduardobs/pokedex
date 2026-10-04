import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function Broken(): ReactNode {
  throw new Error('render failed')
}

afterEach(() => {
  cleanup()
  document.documentElement.lang = 'pt-BR'
  vi.restoreAllMocks()
})

describe('AppErrorBoundary', () => {
  it('renders children while the application is healthy', () => {
    render(
      <AppErrorBoundary>
        <p>Healthy application</p>
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Healthy application')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('contains an unexpected render failure and localizes the recovery UI', () => {
    document.documentElement.lang = 'es'
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No se pudo mostrar esta página')
    expect(alert).toHaveTextContent('Tus favoritos siguen guardados')
    expect(screen.getByRole('button', { name: 'Recargar aplicación' })).toBeVisible()
  })

  it('uses Portuguese when the document language is unsupported', () => {
    document.documentElement.lang = 'de'
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: 'Não foi possível exibir esta página' })).toBeVisible()
  })
})
