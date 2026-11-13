import { expect, it } from 'vitest'
import { safePokemonMediaUrl } from './media-url'
it('restricts remote media to the required asset repositories and formats', () => {
  const sprite = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
  const cry = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg'
  expect(safePokemonMediaUrl(sprite)).toBe(sprite)
  expect(safePokemonMediaUrl(cry)).toBe(cry)
  for (const value of [
    null,
    '',
    'invalid',
    sprite + '?tracker=1',
    sprite + '#test',
    sprite.replace('/PokeAPI/', '/attacker/'),
    sprite.replace('raw.', 'user:pass@raw.'),
    sprite.replace('.png', '.html'),
    sprite.replace('https:', 'http:'),
  ])
    expect(safePokemonMediaUrl(value)).toBeNull()
})
