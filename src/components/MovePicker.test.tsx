import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { MovePicker } from './MovePicker'

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }))
vi.mock('../hooks/useApi', () => ({ useApi: useApiMock }))
vi.mock('../hooks/useMoveListDetails', () => ({ useMoveListDetails: () => ({ data: null }) }))
afterEach(cleanup)
function show(onSelect = vi.fn()) {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <MovePicker name="" label="Primeiro golpe" onSelect={onSelect} />
      </LanguageProvider>
    </MemoryRouter>,
  )
  return screen.getByRole('combobox', { name: 'Primeiro golpe' })
}
describe('MovePicker', () => {
  it('starts at the last suggestion with ArrowUp and reopens suggestions after selection', () => {
    useApiMock.mockReturnValue({
      data: {
        results: ['thunder', 'thunderbolt', 'thunder-punch'].map((name, index) => ({
          name,
          url: `https://pokeapi.co/api/v2/move/${index + 1}/`,
        })),
      },
      loading: false,
      error: null,
    })
    const select = vi.fn(),
      input = show(select)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'thunder' } })
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Thunder',
      'Thunder Punch',
      'Thunderbolt',
    ])
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(screen.getByRole('option', { name: 'Thunderbolt' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.submit(input.closest('form')!)
    expect(select).toHaveBeenCalledWith('thunderbolt')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    fireEvent.change(input, { target: { value: 'thunder' } })
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })
  it('keeps the retry action available when focus moves from the input', () => {
    const retry = vi.fn()
    useApiMock.mockReturnValue({ data: null, loading: false, error: new Error('offline'), retry })
    const input = show()
    fireEvent.focus(input)
    const button = screen.getByRole('button', { name: 'Tentar novamente' })
    fireEvent.blur(input, { relatedTarget: button })
    expect(button).toBeVisible()
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledOnce()
  })
})
