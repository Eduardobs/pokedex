import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { TeraTypeBadge } from './TeraTypeBadge'

describe('TeraTypeBadge', () => {
  it('renders a labeled crystalline badge with the shared type icon', () => {
    const { container } = render(
      <LanguageProvider>
        <TeraTypeBadge type="dragon" />
      </LanguageProvider>,
    )

    expect(screen.getByText('Dragão')).toBeVisible()
    expect(container.querySelector('.tera-type-badge')).toHaveClass('type-dragon')
    expect(container.querySelector('use')).toHaveAttribute(
      'href',
      `${import.meta.env.BASE_URL}type-icons.svg#type-dragon`,
    )
  })

  it('keeps an accessible name in the icon-only crystalline badge', () => {
    render(
      <LanguageProvider>
        <TeraTypeBadge type="stellar" iconOnly />
      </LanguageProvider>,
    )

    expect(screen.getByLabelText('Estelar')).toHaveClass('icon-only', 'type-stellar')
  })
})
