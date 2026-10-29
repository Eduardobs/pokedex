import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { PrimaryShortcuts } from './PrimaryShortcuts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('provides localized shortcuts and identifies the current destination after navigation', () => {
  localStorage.setItem(STORAGE_KEYS.language, 'en')
  render(
    <MemoryRouter>
      <LanguageProvider>
        <PrimaryShortcuts />
      </LanguageProvider>
    </MemoryRouter>,
  )
  const navigation = within(screen.getByRole('navigation', { name: 'Quick navigation' }))
  expect(navigation.getAllByRole('link')).toHaveLength(5)
  const home = navigation.getByRole('link', { name: 'Open Home' })
  expect(home).toHaveAttribute('aria-current', 'page')
  const favorites = navigation.getByRole('link', { name: 'Open Favorites' })
  fireEvent.click(favorites)
  expect(favorites).toHaveAttribute('href', '/favorites')
  expect(favorites).toHaveAttribute('aria-current', 'page')
  expect(home).not.toHaveAttribute('aria-current')
})
