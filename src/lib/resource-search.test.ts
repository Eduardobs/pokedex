import { describe, expect, it } from 'vitest'
import { matchesResource, parseResourceDirectory } from './resource-search'

const entry = { name: 'thunder-punch', url: 'https://pokeapi.co/api/v2/move/9/' }
describe('resource search', () => {
  it('matches spaced names and padded numbers across a directory', () => {
    expect(matchesResource(entry.name, entry.url, 'THUNDER PUNCH')).toBe(true)
    expect(matchesResource(entry.name, entry.url, '#009')).toBe(true)
    expect(matchesResource(entry.name, entry.url, '90')).toBe(false)
  })
  it('accepts a complete directory and unnamed numeric resources', () => {
    expect(parseResourceDirectory({ count: 1, results: [entry] }).results).toEqual([entry])
    expect(parseResourceDirectory({ count: 1, results: [{ url: entry.url }] }).results[0].name).toBe('9')
  })
  it.each([
    { count: 2, results: [entry] },
    { count: 2, results: [entry, entry] },
    { count: 10001, results: [] },
    { count: 1, results: [{ ...entry, name: '../invalid' }] },
    { count: 1, results: [{ ...entry, url: 'https://example.com/move/9/' }] },
  ])('rejects incomplete or malformed directories', (value) => {
    expect(() => parseResourceDirectory(value)).toThrow()
  })
})
