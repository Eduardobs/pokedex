import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FallbackImage } from './FallbackImage'

afterEach(cleanup)

describe('FallbackImage', () => {
  it('advances through source-specific presentation and hides after exhaustion', () => {
    render(
      <FallbackImage
        sources={[
          { src: '/primary.png', alt: 'Primary', className: 'artwork' },
          { src: '/fallback.png', alt: 'Fallback', className: 'sprite' },
        ]}
        alt="Pokémon"
      />,
    )

    const primary = screen.getByRole('img', { name: 'Primary' })
    fireEvent.error(primary)
    const fallback = screen.getByRole('img', { name: 'Fallback' })
    expect(fallback).toHaveAttribute('src', '/fallback.png')
    expect(fallback).toHaveClass('sprite')

    fireEvent.error(fallback)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('can preserve the final source for layouts that reserve the image space', () => {
    render(<FallbackImage sources={[{ src: '/only.png' }]} alt="Pokémon" preserveLastOnError />)

    fireEvent.error(screen.getByRole('img', { name: 'Pokémon' }))
    expect(screen.getByRole('img', { name: 'Pokémon' })).toHaveAttribute('src', '/only.png')
  })
})
