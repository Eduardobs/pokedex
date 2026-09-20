import { describe, expect, it } from 'vitest'
import { idFromUrl, localizedText, prettyName } from './api'

describe('utilitários da PokéAPI', () => {
  it('extrai o id de uma URL', () => expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25))
  it('formata nomes técnicos', () => expect(prettyName('special-attack')).toBe('Special Attack'))
  it('prioriza tradução em português', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
    { language: { name: 'pt-br' }, flavor_text: 'Português' },
  ])).toBe('Português'))
})
