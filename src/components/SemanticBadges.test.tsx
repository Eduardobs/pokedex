import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { DamageClassBadge, GenderBadge } from './SemanticBadges'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('GenderBadge localization', () => {
  it('translates the genderless API value', () => {
    localStorage.setItem(STORAGE_KEYS.language, 'es')

    render(
      <LanguageProvider>
        <GenderBadge value="genderless" />
      </LanguageProvider>,
    )

    expect(screen.getByText('Sin género')).toBeVisible()
    expect(screen.queryByText('Genderless')).not.toBeInTheDocument()
  })
})

describe('DamageClassBadge', () => {
  it.each([
    ['physical', 'Físico'],
    ['special', 'Especial'],
    ['status', 'Status'],
  ])('renders the semantic icon and label for %s damage', (value, label) => {
    const { container } = render(
      <LanguageProvider>
        <DamageClassBadge value={value} />
      </LanguageProvider>,
    )

    expect(screen.getByText(label)).toBeVisible()
    expect(container.querySelector(`.damage-${value} img`)).toHaveAttribute(
      'src',
      `/icons/damage-${value}.png`,
    )
  })

  it('uses the status treatment for an unknown API value', () => {
    const { container } = render(
      <LanguageProvider>
        <DamageClassBadge value="unknown" />
      </LanguageProvider>,
    )

    expect(screen.getByText('Status')).toBeVisible()
    expect(container.querySelector('.damage-status')).toBeInTheDocument()
    expect(container.querySelector('.damage-unknown')).not.toBeInTheDocument()
  })
})
