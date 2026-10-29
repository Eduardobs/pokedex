import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchField } from './SearchField'

afterEach(cleanup)

describe('SearchField', () => {
  it('returns focus to the input after removing the clear button', () => {
    function Search() {
      const [value, setValue] = useState('Pikachu')
      return <SearchField value={value} onChange={setValue} clearLabel="Clear" aria-label="Search" />
    }
    render(<Search />)
    const clear = screen.getByRole('button', { name: 'Clear' })
    clear.focus()
    fireEvent.click(clear)
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('preserves custom clearing and prevents changes to disabled inputs', () => {
    const onClear = vi.fn()
    const onChange = vi.fn()
    const { rerender } = render(
      <SearchField value="Pikachu" onChange={onChange} onClear={onClear} clearLabel="Clear" />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClear).toHaveBeenCalledOnce()
    expect(onChange).not.toHaveBeenCalled()
    rerender(<SearchField value="Pikachu" onChange={onChange} onClear={onClear} clearLabel="Clear" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
    fireEvent.click(screen.getByRole('button'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
