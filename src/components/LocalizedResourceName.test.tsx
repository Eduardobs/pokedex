import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { LocalizedResourceName } from './LocalizedResourceName'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))

describe('LocalizedResourceName', () => {
  beforeEach(() => {
    localStorage.clear()
    useApiMock.mockReset()
  })

  it('uses the API name for the selected language', () => {
    localStorage.setItem(STORAGE_KEYS.language, 'es')
    useApiMock.mockReturnValue({
      data: {
        names: [
          {
            name: 'Lightning Rod',
            language: { name: 'en', url: 'https://pokeapi.co/api/v2/language/9/' },
          },
          {
            name: 'Pararrayos',
            language: { name: 'es', url: 'https://pokeapi.co/api/v2/language/7/' },
          },
        ],
      },
    })

    render(
      <LanguageProvider>
        <LocalizedResourceName
          resource={{ name: 'lightning-rod', url: 'https://pokeapi.co/api/v2/ability/31/' }}
        />
      </LanguageProvider>,
    )

    expect(screen.getByText('Pararrayos')).toBeInTheDocument()
  })
})
