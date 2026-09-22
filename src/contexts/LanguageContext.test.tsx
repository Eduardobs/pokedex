import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider, useLanguage } from './LanguageContext'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = ''
})
afterEach(cleanup)

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
)

describe('LanguageProvider', () => {
  it('usa português quando o idioma persistido não é permitido', () => {
    localStorage.setItem(STORAGE_KEYS.language, 'de')

    const { result } = renderHook(() => useLanguage(), { wrapper })

    expect(result.current.language).toBe('pt-BR')
    expect(result.current.apiLanguage).toBe('pt-br')
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  it('troca idioma, interpola variáveis e persiste a escolha', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper })

    act(() => result.current.setLanguage('es'))

    expect(result.current.language).toBe('es')
    expect(result.current.apiLanguage).toBe('es')
    expect(result.current.t('detail.notFoundDesc', { name: 'MissingNo' })).toBe(
      'No encontramos “MissingNo” en la Pokédex.',
    )
    expect(localStorage.getItem(STORAGE_KEYS.language)).toBe('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('falha de forma explícita quando usado fora do provider', () => {
    expect(() => renderHook(() => useLanguage())).toThrow('LanguageProvider is missing')
  })
})
