import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('production content security policy', () => {
  it('does not permit connections to services on localhost', () => {
    const html = readFileSync('index.html', 'utf8')

    expect(html).toContain(
      "connect-src 'self' https://pokeapi.co https://graphql.pokeapi.co https://pokemon-3d-api.onrender.com https://raw.githubusercontent.com blob:;",
    )
    expect(html).not.toContain('ws://localhost:')
    expect(html).not.toContain('ws://127.0.0.1:')
  })
})
