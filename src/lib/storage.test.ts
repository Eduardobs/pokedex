import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStorage, readStorageString, writeStorage, writeStorageString } from './storage'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('storage', () => {
  it('reads JSON only when the content passes validation', () => {
    localStorage.setItem('valid', JSON.stringify(['pikachu', 'eevee']))
    localStorage.setItem('invalid', JSON.stringify([25, 133]))

    expect(readStorage('valid', isStringArray, [])).toEqual(['pikachu', 'eevee'])
    expect(readStorage('invalid', isStringArray, [])).toEqual([])
  })

  it('uses the fallback for a missing key or corrupted JSON', () => {
    localStorage.setItem('broken', '{not-json')

    expect(readStorage('missing', isStringArray, ['fallback'])).toEqual(['fallback'])
    expect(readStorage('broken', isStringArray, ['fallback'])).toEqual(['fallback'])
  })

  it('isolates browser failures during reads and writes', () => {
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

  it('serializes objects and keeps plain strings without JSON quotes', () => {
    expect(writeStorage('favorites', ['pikachu'])).toBe(true)
    expect(localStorage.getItem('favorites')).toBe('["pikachu"]')

    expect(writeStorageString('theme', 'dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(readStorageString('theme', ['light', 'dark'] as const, 'light')).toBe('dark')
  })

  it('rejects strings outside the allowlist', () => {
    localStorage.setItem('language', 'de')
    expect(readStorageString('language', ['pt-BR', 'en', 'es'] as const, 'pt-BR')).toBe('pt-BR')
  })
})
