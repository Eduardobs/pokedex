import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MegaEvolutionIcon } from './MegaEvolutionIcon'

describe('MegaEvolutionIcon', () => {
  it('renders the Mega symbol as a decorative, themeable icon', () => {
    const { container } = render(<MegaEvolutionIcon className="context-color" size={18} />)
    const icon = container.firstElementChild

    expect(icon).toHaveClass('mega-evolution-icon', 'context-color')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveStyle({ width: '18px', height: '18px' })
  })
})
