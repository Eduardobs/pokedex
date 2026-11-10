import defaults from './api-defaults.json' with { type: 'json' }

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiConfig } from './api'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('API configuration', () => {
  it('uses the public endpoints by default', () => {
    expect(getApiConfig({})).toMatchObject({
      restUrl: defaults.restUrl,
      graphqlUrl: defaults.graphqlUrl,
    })
  })

  it('normalizes alternative endpoints and derives their origins', () => {
    expect(
      getApiConfig({
        VITE_POKEAPI_REST_URL: ' https://rest.example/custom/v2/// ',
        VITE_POKEAPI_GRAPHQL_URL: 'https://graphql.example/query/',
      }),
    ).toEqual({
      restUrl: 'https://rest.example/custom/v2',
      restOrigin: 'https://rest.example',
      graphqlUrl: 'https://graphql.example/query',
      graphqlOrigin: 'https://graphql.example',
    })
  })

  it.each([
    'http://api.example',
    'https://user:secret@api.example',
    'https://api.example?q=1',
    'https://api.example#fragment',
    '/api',
  ])('rejects invalid endpoints: %s', (url) => {
    expect(() => getApiConfig({ VITE_POKEAPI_REST_URL: url })).toThrow()
    expect(() => getApiConfig({ VITE_POKEAPI_GRAPHQL_URL: url })).toThrow()
  })

  it('resolves requests only within the configured REST base', async () => {
    vi.stubEnv('VITE_POKEAPI_REST_URL', 'https://rest.example/custom/v2/')
    const { resolveApiUrl } = await import('../lib/api-client')
    expect(resolveApiUrl('pokemon/25')).toBe('https://rest.example/custom/v2/pokemon/25')
    expect(() => resolveApiUrl(`${defaults.restUrl}/pokemon/25`)).toThrow()
    expect(() => resolveApiUrl('../pokemon/25')).toThrow()
  })

  it('supports an endpoint at the origin root', async () => {
    vi.stubEnv('VITE_POKEAPI_REST_URL', 'https://rest.example/')
    const { resolveApiUrl } = await import('../lib/api-client')
    expect(resolveApiUrl('pokemon/25')).toBe('https://rest.example/pokemon/25')
  })
})
