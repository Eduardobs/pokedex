import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { HomePage } from './HomePage'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('HomePage localization', () => {
  it('formats the Pokémon total for the selected language', () => {
    localStorage.setItem(STORAGE_KEYS.language, 'en')

    render(<MemoryRouter><LanguageProvider><HomePage /></LanguageProvider></MemoryRouter>)

    expect(screen.getByText('1,000+ Pokémon')).toBeVisible()
  })
})
