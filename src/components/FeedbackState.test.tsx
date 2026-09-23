import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyState, InlineRetryError } from './FeedbackState'

afterEach(cleanup)

describe('feedback states', () => {
  it('preserves the requested heading hierarchy and optional content', () => {
    render(
      <EmptyState icon={<span aria-hidden="true">!</span>} title="No encounters" headingLevel={3}>
        <a href="#/pokemon">Explore</a>
      </EmptyState>,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'No encounters' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Explore' })).toBeVisible()
  })

  it('delegates retry without changing the shared presentation contract', () => {
    const retry = vi.fn()
    render(<InlineRetryError message="Unavailable" retryLabel="Retry" onRetry={retry} />)

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(retry).toHaveBeenCalledOnce()
    expect(screen.getByText('Unavailable').closest('.inline-error')).toBeInTheDocument()
  })
})
