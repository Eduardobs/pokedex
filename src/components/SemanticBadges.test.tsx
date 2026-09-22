import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { GenderBadge } from './SemanticBadges'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('GenderBadge localization', () => {
  it('translates the genderless API value', () => {
    localStorage.setItem(STORAGE_KEYS.language, 'es')

    render(<LanguageProvider><GenderBadge value="genderless" /></LanguageProvider>)

    expect(screen.getByText('Sin género')).toBeVisible()
    expect(screen.queryByText('Genderless')).not.toBeInTheDocument()
  })
})
