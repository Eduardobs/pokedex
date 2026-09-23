import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FAVORITES_LIMIT, STORAGE_KEYS } from '../config/app'
import { useFavorites } from './useFavorites'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('useFavorites', () => {
  it('restaura uma coleção válida e persiste alterações', async () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['eevee']))
    const { result } = renderHook(() => useFavorites())

    expect(result.current.favorites).toEqual(['eevee'])

    act(() => result.current.toggle('pikachu'))

    expect(result.current.favorites).toEqual(['eevee', 'pikachu'])
    expect(result.current.notice).toEqual({ name: 'pikachu', action: 'added' })
    expect(result.current.isFavorite('pikachu')).toBe(true)
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) ?? '')).toEqual(['eevee', 'pikachu']),
    )
  })

  it('descarta toda a coleção persistida se ela contiver dados inválidos', () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['pikachu', 'Invalid Name']))

    const { result } = renderHook(() => useFavorites())

    expect(result.current.favorites).toEqual([])
  })

  it('remove favoritos e permite limpar a notificação', () => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(['pikachu']))
    const { result } = renderHook(() => useFavorites())

    act(() => result.current.toggle('pikachu'))
    expect(result.current.favorites).toEqual([])
    expect(result.current.notice).toEqual({ name: 'pikachu', action: 'removed' })

    act(() => result.current.clearNotice())
    expect(result.current.notice).toBeNull()
  })

  it('ignora nomes que não podem pertencer à PokéAPI', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggle('Mr. Mime')
      result.current.toggle('a'.repeat(65))
    })

    expect(result.current.favorites).toEqual([])
    expect(result.current.notice).toBeNull()
  })

  it('não ultrapassa o limite configurado', () => {
    const favorites = Array.from({ length: FAVORITES_LIMIT }, (_, index) => `pokemon-${index}`)
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites))
    const { result } = renderHook(() => useFavorites())

    act(() => result.current.toggle('overflow'))

    expect(result.current.favorites).toEqual(favorites)
    expect(result.current.notice).toEqual({ name: 'overflow', action: 'limit' })
  })

  it('processa atualizações consecutivas sem duplicar um favorito', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggle('pikachu')
      result.current.toggle('pikachu')
    })

    expect(result.current.favorites).toEqual([])
    expect(result.current.notice).toEqual({ name: 'pikachu', action: 'removed' })
  })
})
