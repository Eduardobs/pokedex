import { STORAGE_KEYS } from '../config/app'
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
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['pikachu', 'eevee']))
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([25, 133]))

    expect(readStorage(STORAGE_KEYS.favorites, isStringArray, [])).toEqual(['pikachu', 'eevee'])
    expect(readStorage(STORAGE_KEYS.teams, isStringArray, [])).toEqual([])
  })

  it('uses the fallback for a missing key or corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEYS.favorites, '{not-json')

    expect(readStorage(STORAGE_KEYS.favorites, isStringArray, ['fallback'])).toEqual(['fallback'])
    expect(readStorage(STORAGE_KEYS.favorites, isStringArray, ['fallback'])).toEqual(['fallback'])
  })

  it('isolates browser failures during reads and writes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    expect(readStorage(STORAGE_KEYS.favorites, isStringArray, ['safe'])).toEqual(['safe'])
    expect(readStorageString(STORAGE_KEYS.favorites, ['light', 'dark'] as const, 'light')).toBe('light')

    vi.restoreAllMocks()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    expect(writeStorage(STORAGE_KEYS.favorites, ['pikachu'])).toBe(false)
    expect(writeStorageString(STORAGE_KEYS.theme, 'dark')).toBe(false)
  })

  it('serializes objects and keeps plain strings without JSON quotes', () => {
    expect(writeStorage(STORAGE_KEYS.favorites, ['pikachu'])).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.favorites)).toBe('["pikachu"]')

    expect(writeStorageString(STORAGE_KEYS.theme, 'dark')).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
    expect(readStorageString(STORAGE_KEYS.theme, ['light', 'dark'] as const, 'light')).toBe('dark')
  })

  it('rejects strings outside the allowlist', () => {
    localStorage.setItem(STORAGE_KEYS.language, 'de')
    expect(readStorageString(STORAGE_KEYS.language, ['pt-BR', 'en', 'es'] as const, 'pt-BR')).toBe('pt-BR')
  })
})

it('rejects unknown keys and oversized storage before JSON parsing or writes', () => {
  expect(writeStorage('unknown', [])).toBe(false)
  expect(writeStorageString('unknown', 'dark')).toBe(false)
  expect(writeStorageString(STORAGE_KEYS.theme, 'x'.repeat(100))).toBe(false)
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['x'.repeat(40000)]))
  expect(readStorage(STORAGE_KEYS.favorites, isStringArray, [])).toEqual([])
  expect(writeStorage(STORAGE_KEYS.favorites, ['x'.repeat(40000)])).toBe(false)
  expect(readStorage('unknown', isStringArray, [])).toEqual([])
})
