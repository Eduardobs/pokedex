import { describe, expect, it } from 'vitest'
import { parsePokemon3D, selectPokemon3D } from './pokemon-3d'

const regular = 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/6.glb'
const shiny = regular.replace('/regular/', '/shiny/')
const catalog = [
  {
    id: 6,
    forms: [
      { name: 'Charizard', formName: 'regular', model: regular },
      { name: 'Shiny Charizard', formName: 'shiny', model: shiny },
      { name: 'Mega Charizard X', formName: 'xy', model: regular.replace('/regular/', '/x/') },
    ],
  },
]
describe('Pokemon3D catalog', () => {
  it('accepts the live array and documented envelope', () => {
    expect(parsePokemon3D(catalog)).toEqual(catalog)
    expect(parsePokemon3D({ pokemon: catalog })).toEqual(catalog)
  })
  it('keeps valid models when the catalog contains an incomplete asset link', () => {
    const partial = [
      {
        id: 6,
        forms: [...catalog[0].forms, { name: 'Incomplete', formName: 'shiny', model: regular.replace('.glb', '') }],
      },
    ]
    expect(parsePokemon3D(partial)).toEqual(catalog)
    expect(
      parsePokemon3D([
        { id: 800, forms: [{ name: 'Necrozma', formName: 'regular', model: regular.replace('/opt/', '/glb/') }] },
      ])[0].forms,
    ).toHaveLength(1)
  })
  it('rejects malformed entries and unsafe asset URLs', () => {
    for (const value of [
      null,
      {},
      [{ id: -1, forms: [] }],
      [...catalog, ...catalog],
      [{ id: 1, forms: [{ name: 'test', formName: 'regular', model: 'https://example.com/model.glb' }] }],
    ])
      expect(() => parsePokemon3D(value)).toThrow()
  })
  it('selects regular, shiny and exact alternate forms without falling back to the base model', () => {
    const pokemon = { id: 6, name: 'charizard', is_default: true }
    expect(selectPokemon3D(catalog, pokemon, 6, false)).toBe(regular)
    expect(selectPokemon3D(catalog, pokemon, 6, true)).toBe(shiny)
    const mega = { id: 10034, name: 'charizard-mega-x', is_default: false }
    expect(selectPokemon3D(catalog, mega, 6, false)).toContain('/x/')
    expect(selectPokemon3D(catalog, mega, 6, true)).toBeNull()
    expect(selectPokemon3D([], pokemon, 6, false)).toBeNull()
  })
})
