import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { PokemonFormDirectoryCard } from './PokemonFormDirectoryCard'

const { retryMock, useApiMock } = vi.hoisted(() => ({ retryMock: vi.fn(), useApiMock: vi.fn() }))

vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../hooks/useIntersectionVisibility', () => ({
  useIntersectionVisibility: () => ({ targetRef: { current: null }, visible: true }),
}))

describe('PokemonFormDirectoryCard', () => {
  beforeEach(() => {
    retryMock.mockReset()
    useApiMock.mockReset()
  })

  it('shows a recoverable error instead of an endless skeleton', () => {
    useApiMock.mockReturnValue({ data: null, loading: false, error: new Error('offline'), retry: retryMock })
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PokemonFormDirectoryCard
            resource={{ name: 'charizard-mega-x', url: 'https://pokeapi.co/api/v2/pokemon-form/10034/' }}
            category="mega"
          />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar esta forma.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retryMock).toHaveBeenCalledOnce()
  })
})
