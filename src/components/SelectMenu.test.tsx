import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectMenu } from './SelectMenu'

const options = [
  { value: 'all', label: 'All types' },
  { value: 'fire', label: 'Fire' },
  { value: 'water', label: 'Water' },
] as const

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SelectMenu', () => {
  it('supports keyboard navigation and returns focus after selection', async () => {
    const onChange = vi.fn()
    render(<SelectMenu icon={<span>icon</span>} label="Type" options={[...options]} value="fire" onChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: 'Type' })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Fire' })).toHaveFocus())

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' })
    expect(screen.getByRole('option', { name: 'Water' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'All types' })).toHaveFocus()

    fireEvent.click(screen.getByRole('option', { name: 'Water' }))
    expect(onChange).toHaveBeenCalledWith('water')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape and outside interaction without changing the value', () => {
    const onChange = vi.fn()
    render(
      <div>
        <SelectMenu icon={<span>icon</span>} label="Type" options={[...options]} value="all" onChange={onChange} />
        <button type="button">Outside</button>
      </div>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Type' })

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
