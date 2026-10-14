import { describe, expect, it } from 'vitest'
import { parseItemDirectory, parseTeamItem } from './team-items'

describe('team item data', () => {
  it('maps bounded item details used by the selector', () => {
    expect(
      parseTeamItem({
        name: 'choice-scarf',
        sprites: { default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/choice-scarf.png' },
        names: [{ name: 'Choice Scarf' }],
        effect_entries: [{ short_effect: 'Raises Speed.' }],
        flavor_text_entries: [],
      }),
    ).toMatchObject({ name: 'choice-scarf', sprite: expect.stringContaining('choice-scarf.png') })
  })

  it('rejects malformed or duplicate directory entries and unsafe item sprites', () => {
    expect(() =>
      parseItemDirectory({
        results: [
          { name: 'item', url: 'x' },
          { name: 'item', url: 'y' },
        ],
      }),
    ).toThrow()
    expect(() => parseItemDirectory({ results: [{ name: '<script>', url: 'x' }] })).toThrow()
    expect(() => parseTeamItem({ name: 'item', sprites: { default: 'javascript:alert(1)' } })).toThrow()
  })
})
