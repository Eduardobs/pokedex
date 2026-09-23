import { describe, expect, it } from 'vitest'
import {
  officialArtworkForFormSprite,
  pokemonFormDirectoryImageSources,
  pokemonFormImageSources,
} from './pokemon-form-artwork'

const officialArtwork =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/412.png'
const pokemonSprite =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/412.png'
const sandySprite =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/412-sandy.png'
const sandyArtwork =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/412-sandy.png'

const pokemon = {
  forms: [
    { name: 'burmy-plant', url: 'https://pokeapi.co/api/v2/pokemon-form/412/' },
    { name: 'burmy-sandy', url: 'https://pokeapi.co/api/v2/pokemon-form/10034/' },
  ],
  sprites: {
    front_default: pokemonSprite,
    front_shiny: null,
    other: {
      'official-artwork': { front_default: officialArtwork, front_shiny: null },
    },
  },
}

const sandyForm = {
  is_default: false,
  sprites: {
    front_default: sandySprite,
    front_shiny: null,
    back_default: null,
    back_shiny: null,
  },
}

describe('officialArtworkForFormSprite', () => {
  it.each([
    [sandySprite, sandyArtwork],
    [
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/666-archipelago.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/666-archipelago.png',
    ],
    [
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/201-b.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/201-b.png',
    ],
    [
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10034.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/10034.png',
    ],
  ])('derives the matching official artwork from a trusted form sprite', (sprite, artwork) => {
    expect(officialArtworkForFormSprite(sprite)).toBe(artwork)
  })

  it.each([
    'https://example.com/PokeAPI/sprites/master/sprites/pokemon/412-sandy.png',
    'https://raw.githubusercontent.com.evil.example/PokeAPI/sprites/master/sprites/pokemon/412-sandy.png',
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/412-sandy.png',
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/412-sandy.png?raw=1',
    'not-a-url',
  ])('rejects an untrusted or unsupported sprite URL: %s', (url) => {
    expect(officialArtworkForFormSprite(url)).toBeNull()
  })
})

describe('pokemonFormImageSources', () => {
  it('prioritizes the matching form artwork and sprite for a shared alternate form', () => {
    expect(pokemonFormImageSources(pokemon, sandyForm)).toEqual([
      sandyArtwork,
      sandySprite,
      officialArtwork,
      pokemonSprite,
    ])
  })

  it('preserves the official artwork for the default form', () => {
    expect(pokemonFormImageSources(pokemon, { ...sandyForm, is_default: true })).toEqual([
      officialArtwork,
      sandySprite,
      pokemonSprite,
    ])
  })

  it('preserves the existing order for a single non-default form', () => {
    expect(pokemonFormImageSources({ ...pokemon, forms: [pokemon.forms[1]] }, sandyForm)).toEqual([
      officialArtwork,
      sandySprite,
      pokemonSprite,
    ])
  })

  it('falls back to the shared artwork when the alternate form has no sprite', () => {
    const formWithoutSprite = {
      ...sandyForm,
      sprites: { ...sandyForm.sprites, front_default: null },
    }

    expect(pokemonFormImageSources(pokemon, formWithoutSprite)).toEqual([
      officialArtwork,
      pokemonSprite,
    ])
  })
})

describe('pokemonFormDirectoryImageSources', () => {
  const sprites = (front_default: string | null, front_shiny: string | null) => ({
    front_default,
    front_shiny,
    back_default: null,
    back_shiny: null,
  })

  it('uses the related Pokémon ID when a recent form has no sprites', () => {
    expect(pokemonFormDirectoryImageSources(10301, sprites(null, null), true)[0]).toEqual({
      url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/10301.png',
      shiny: true,
      sprite: false,
    })
  })

  it('falls back from inferred official artwork to the supplied form sprite', () => {
    const shinySprite =
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10309.png'
    const sources = pokemonFormDirectoryImageSources(
      10309,
      sprites(
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10309.png',
        shinySprite,
      ),
      true,
    )

    expect(sources.slice(0, 2)).toEqual([
      {
        url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/10309.png',
        shiny: true,
        sprite: false,
      },
      { url: shinySprite, shiny: true, sprite: true },
    ])
  })

  it('does not create direct artwork URLs from an invalid Pokémon ID', () => {
    expect(pokemonFormDirectoryImageSources(Number.NaN, sprites(null, null), true)).toEqual([])
  })
})
