import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { PokemonDetailBackLink } from './PokemonDetailBackLink'

function renderBackLink(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/pokemon/bulbasaur', state }]}>
      <LanguageProvider>
        <PokemonDetailBackLink />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('PokemonDetailBackLink', () => {
  it('returns to the forms catalog when it is the recognized origin', () => {
    renderBackLink({ fromCatalog: 'forms' })

    expect(screen.getByRole('link', { name: 'Formas' })).toHaveAttribute('href', '/formas')
  })

  it('returns to the Pokédex without a recognized origin', () => {
    renderBackLink({ fromCatalog: '/external-page' })

    expect(screen.getByRole('link', { name: 'Pokédex' })).toHaveAttribute('href', '/pokemon')
  })
})
