import { describe, expect, it } from 'vitest'
import { sortByLocalizedLabel } from './alphabetical-sort'

describe('sortByLocalizedLabel', () => {
  it('sorts a copy by the displayed label using the selected locale', () => {
    const values = [
      { value: 'z', label: 'Zubat 10' },
      { value: 'a', label: 'Ácido' },
      { value: 'b', label: 'Zubat 2' },
    ]

    expect(sortByLocalizedLabel(values, (option) => option.label, 'pt-BR').map((option) => option.value)).toEqual([
      'a',
      'b',
      'z',
    ])
    expect(values.map((option) => option.value)).toEqual(['z', 'a', 'b'])
  })
})
