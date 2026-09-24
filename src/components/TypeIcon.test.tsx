import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BATTLE_TYPES } from '../lib/type-chart'
import { TypeIcon } from './TypeIcon'

describe('TypeIcon', () => {
  it.each(BATTLE_TYPES)('renders a dedicated icon for %s', (type) => {
    const { container } = render(<TypeIcon type={type} data-type={type} />)
    const icon = container.querySelector(`svg[data-type="${type}"]`)

    expect(icon).toBeInTheDocument()
    expect(icon?.children.length).toBeGreaterThan(0)
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon?.querySelector('use')).toHaveAttribute('href', `${import.meta.env.BASE_URL}type-icons.svg#type-${type}`)
  })

  it('uses a safe fallback for API types outside the reference palette', () => {
    const { container } = render(<TypeIcon type="unknown-api-type" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('use')).not.toBeInTheDocument()
  })
})
