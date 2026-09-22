import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ResourceListPage } from './ResourceListPage'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))

describe('ResourceListPage pagination', () => {
  it('redirects an offset beyond the collection to the last valid page', async () => {
    useApiMock.mockReturnValue({
      data: { count: 100, previous: 'previous', next: null, results: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/explorar/ability?offset=100000']}>
        <LanguageProvider>
          <Routes><Route path="explorar/:resource" element={<ResourceListPage />} /></Routes>
        </LanguageProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getAllByText('Página 3').length).toBeGreaterThan(0))
    expect(screen.getAllByText('81–100 de 100').length).toBeGreaterThan(0)
    expect(useApiMock).toHaveBeenLastCalledWith('ability?limit=40&offset=80')
  })
})
