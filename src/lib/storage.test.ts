import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStorage, readStorageString, writeStorage, writeStorageString } from './storage'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('storage', () => {
  it('lê JSON apenas quando o conteúdo passa pela validação', () => {
    localStorage.setItem('valid', JSON.stringify(['pikachu', 'eevee']))
    localStorage.setItem('invalid', JSON.stringify([25, 133]))

    expect(readStorage('valid', isStringArray, [])).toEqual(['pikachu', 'eevee'])
    expect(readStorage('invalid', isStringArray, [])).toEqual([])
  })

  it('usa o fallback para chave ausente ou JSON corrompido', () => {
    localStorage.setItem('broken', '{not-json')

    expect(readStorage('missing', isStringArray, ['fallback'])).toEqual(['fallback'])
    expect(readStorage('broken', isStringArray, ['fallback'])).toEqual(['fallback'])
  })

  it('isola falhas lançadas pelo navegador durante leitura e escrita', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    expect(readStorage('key', isStringArray, ['safe'])).toEqual(['safe'])
    expect(readStorageString('key', ['light', 'dark'] as const, 'light')).toBe('light')

    vi.restoreAllMocks()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    expect(writeStorage('key', ['pikachu'])).toBe(false)
    expect(writeStorageString('theme', 'dark')).toBe(false)
  })

  it('serializa objetos e mantém strings simples sem aspas JSON', () => {
    expect(writeStorage('favorites', ['pikachu'])).toBe(true)
    expect(localStorage.getItem('favorites')).toBe('["pikachu"]')

    expect(writeStorageString('theme', 'dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(readStorageString('theme', ['light', 'dark'] as const, 'light')).toBe('dark')
  })

  it('rejeita strings fora da lista permitida', () => {
    localStorage.setItem('language', 'de')
    expect(readStorageString('language', ['pt-BR', 'en', 'es'] as const, 'pt-BR')).toBe('pt-BR')
  })
})
