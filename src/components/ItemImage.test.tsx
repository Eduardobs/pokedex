import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ItemImage } from './ItemImage'

afterEach(cleanup)

describe('ItemImage', () => {
  it('uses the PokéSprite fallback for Ability Patch when PokéAPI has no icon', () => {
    const { container } = render(<ItemImage name="ability-patch" alt="" />)
    const primary = container.querySelector('img')!

    expect(primary).toHaveAttribute('src', expect.stringContaining('/sprites/items/ability-patch.png'))
    fireEvent.error(primary)

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/msikma/pokesprite/master/items/other-item/ability-patch.png',
    )
  })

  it('checks generation-specific directories for newer items', () => {
    const { container } = render(<ItemImage name="loaded-dice" alt="" />)

    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/items/gen9/loaded-dice.png'),
    )
  })

  it('shows a generic item glyph after every remote source is unavailable', () => {
    const { container } = render(<ItemImage name="axew-scales" alt="" />)

    fireEvent.error(container.querySelector('img')!)
    fireEvent.error(container.querySelector('img')!)
    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg.item-image-fallback')).toBeInTheDocument()
  })
})
