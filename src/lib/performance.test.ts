import { describe, expect, it } from 'vitest'
import { sortPokemonList } from './pokemon-sort'
import { sortByLocalizedLabel } from './alphabetical-sort'
import type { PokemonListItem } from '../types'

describe('catalog performance invariants', () => {
  it('resolves each localized label only once per sort', () => {
    let reads = 0
    const values = Array.from({ length: 1025 }, (_, index) => (index * 7919) % 1025)
    const original = [...values]
    const sorted = sortByLocalizedLabel(
      values,
      (value) => {
        reads += 1
        return `Move ${value}`
      },
      'en',
    )
    expect(reads).toBe(values.length)
    expect(values).toEqual(original)
    expect(sorted[0]).toBe(0)
    expect(sorted.at(-1)).toBe(1024)
  })

  it('reads each stat array at most once per numeric sort', () => {
    let reads = 0
    const catalog: PokemonListItem[] = Array.from({ length: 1025 }, (_, index) => ({
      id: index + 1,
      name: `pokemon-${index}`,
      url: '',
    }))
    const details = Object.fromEntries(
      catalog.map(({ name, id }) => [
        name,
        {
          get stats() {
            reads += 1
            return [{ base_stat: (id * 7919) % 251, effort: 0, stat: { name: 'hp', url: '' } }]
          },
        },
      ]),
    )
    const sorted = sortPokemonList(catalog, 'total', 'desc', details, 'en')
    expect(reads).toBe(1025)
    expect(sorted).toHaveLength(1025)
  })
})
