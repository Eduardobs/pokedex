import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { LanguageProvider } from '../contexts/LanguageContext'
import { Pagination } from './Pagination'

afterEach(cleanup)

describe('Pagination', () => {
  it('navigates directly to numbered pages and both boundaries', () => {
    function Example() {
      const [page, setPage] = useState(1)
      return <Pagination page={page} pageSize={10} total={995} onPageChange={setPage} />
    }
    render(
      <LanguageProvider>
        <Example />
      </LanguageProvider>,
    )
    expect(screen.getByRole('button', { name: 'Primeira página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 4' }))
    expect(screen.getByRole('button', { name: 'Ir para a página 4' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('31–40 de 995')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Última página' }))
    expect(screen.getByText('991–995 de 995')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Última página' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Primeira página' }))
    expect(screen.getByText('Página 1')).toBeVisible()
  })

  it('keeps long collections compact and blocks navigation during loading', () => {
    const onPageChange = vi.fn()
    render(
      <LanguageProvider>
        <Pagination page={500} pageSize={10} total={10000} onPageChange={onPageChange} disabled />
      </LanguageProvider>,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeLessThanOrEqual(9)
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-disabled', 'true')
      fireEvent.click(button)
    })
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it.each([0, 6])('omits navigation for %s items fitting on one page', (total) => {
    render(
      <LanguageProvider>
        <Pagination page={1} pageSize={6} total={total} onPageChange={vi.fn()} />
      </LanguageProvider>,
    )
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
