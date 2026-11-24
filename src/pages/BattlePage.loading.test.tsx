import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { BattlePage } from './BattlePage'

vi.mock('../lib/battle', () => {
  throw new Error('Battle engine loaded in lobby')
})
vi.mock('../lib/random-team', () => {
  throw new Error('Random sets loaded in lobby')
})

afterEach(cleanup)

it('opens the lobby without loading battle mechanics or random team sets', () => {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <BattlePage />
      </LanguageProvider>
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Criar uma equipe' })).toHaveAttribute('href', '/teams')
})
