import { describe, expect, it } from 'vitest'
import { filterAndSortResourceRows } from './resource-list-controls'

describe('filterAndSortResourceRows', () => {
  const rows = [
    { name: 'Água 10', power: 10 },
    { name: 'Água 2', power: 2 },
    { name: 'Fogo', power: null },
  ]
  it('combines accent-insensitive filters and preserves source order by default', () => {
    expect(filterAndSortResourceRows(rows, { name: ' agua ', power: '2' }, null, 'pt-BR')).toEqual([rows[1]])
    expect(filterAndSortResourceRows(rows, {}, null, 'pt-BR')).toEqual(rows)
  })
  it('sorts numbers and names naturally, keeps missing data last, and does not mutate its input', () => {
    expect(filterAndSortResourceRows(rows, {}, { key: 'power', direction: 'ascending' }, 'pt-BR')).toEqual([
      rows[1],
      rows[0],
      rows[2],
    ])
    expect(filterAndSortResourceRows(rows, {}, { key: 'power', direction: 'descending' }, 'pt-BR')).toEqual(rows)
    expect(filterAndSortResourceRows(rows, {}, { key: 'name', direction: 'ascending' }, 'pt-BR')).toEqual([
      rows[1],
      rows[0],
      rows[2],
    ])
    expect(rows[0].power).toBe(10)
  })
})
