import { describe, expect, it } from 'vitest'
import { idFromUrl, localizedName, localizedText, prettyName } from './api'

describe('utilitários da PokéAPI', () => {
  it('extrai o id de uma URL', () => expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/25/')).toBe(25))
  it('formata nomes técnicos', () => expect(prettyName('special-attack')).toBe('Special Attack'))
  it('prioriza tradução em português', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
    { language: { name: 'pt-br' }, flavor_text: 'Português' },
  ])).toBe('Português'))
  it('seleciona o idioma solicitado', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
    { language: { name: 'es' }, flavor_text: 'Español' },
  ], undefined, 'es')).toBe('Español'))
  it('usa inglês quando a tradução solicitada não existe', () => expect(localizedText([
    { language: { name: 'en' }, flavor_text: 'English' },
  ], undefined, 'es')).toBe('English'))
  it('traduz nomes localizados', () => expect(localizedName([
    { language: { name: 'en' }, name: 'Thunder Punch' },
    { language: { name: 'es' }, name: 'Puño Trueno' },
  ], 'es')).toBe('Puño Trueno'))
})
