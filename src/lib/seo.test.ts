import { describe, expect, it } from 'vitest'
import { canonicalUrl, normalizeSiteUrl } from './seo'

describe('canonical URLs', () => {
  it('normalizes the deployment base and preserves project subdirectories', () => {
    expect(normalizeSiteUrl('https://atlas.example/pokedex')).toBe('https://atlas.example/pokedex/')
    expect(canonicalUrl('https://atlas.example/pokedex', '/pokemon/pikachu', true)).toBe(
      'https://atlas.example/pokedex/pokemon/pikachu',
    )
    expect(canonicalUrl('https://atlas.example/pokedex', '/pokemon/pikachu', false)).toBe(
      'https://atlas.example/pokedex/',
    )
    expect(canonicalUrl(undefined, '/', true)).toBeUndefined()
  })

  it.each([
    'javascript:alert(1)',
    'https://user:pass@atlas.example',
    'https://atlas.example/?q=test',
    'https://atlas.example/#/pokemon',
    '/relative',
  ])('rejects an invalid deployment URL: %s', (url) => {
    expect(() => normalizeSiteUrl(url)).toThrow()
  })
})
