import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Species } from '../../types'
import { PokemonBiologyCard } from './PokemonBiologyCard'

afterEach(cleanup)

const species = {
  color: { name: 'green', url: '' },
  generation: { name: 'generation-i', url: '' },
  habitat: { name: 'grassland', url: '' },
  growth_rate: { name: 'medium-slow', url: '' },
  shape: { name: 'quadruped', url: '' },
  capture_rate: 45,
  base_happiness: 50,
  is_baby: false,
  is_legendary: false,
  is_mythical: false,
} as Species

describe('PokemonBiologyCard', () => {
  it('shows a color swatch beside the localized color name', () => {
    const { container } = render(<LanguageProvider><PokemonBiologyCard species={species} /></LanguageProvider>)

    expect(screen.getByText('Verde')).toBeVisible()
    expect(container.querySelector('.pokemon-color-swatch')).toHaveStyle({ backgroundColor: '#55a868' })
  })

  it('keeps the raw capture rate and adds its localized percentage', () => {
    render(<LanguageProvider><PokemonBiologyCard species={species} /></LanguageProvider>)

    expect(screen.getByText('45 / 255 (17,65%)')).toBeVisible()
  })
})
