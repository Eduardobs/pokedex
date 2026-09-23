import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FAVORITES_LIMIT, STORAGE_KEYS } from '../config/app'
import { readStorage, writeStorage } from '../lib/storage'

const POKEMON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const isFavorites = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= FAVORITES_LIMIT &&
  new Set(value).size === value.length &&
  value.every((item) => typeof item === 'string' && item.length <= 64 && POKEMON_NAME.test(item))

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readStorage(STORAGE_KEYS.favorites, isFavorites, []))
  const favoritesRef = useRef(favorites)
  const [notice, setNotice] = useState<{
    name: string
    action: 'added' | 'removed' | 'limit'
  } | null>(null)
  useEffect(() => {
    writeStorage(STORAGE_KEYS.favorites, favorites)
  }, [favorites])

  const toggle = useCallback((name: string) => {
    if (name.length > 64 || !POKEMON_NAME.test(name)) return
    const current = favoritesRef.current
    if (current.includes(name)) {
      const next = current.filter((item) => item !== name)
      favoritesRef.current = next
      setFavorites(next)
      setNotice({ name, action: 'removed' })
      return
    }
    if (current.length >= FAVORITES_LIMIT) {
      setNotice({ name, action: 'limit' })
      return
    }
    const next = [...current, name]
    favoritesRef.current = next
    setFavorites(next)
    setNotice({ name, action: 'added' })
  }, [])
  const isFavorite = useCallback((name: string) => favorites.includes(name), [favorites])
  const clearNotice = useCallback(() => setNotice(null), [])

  return useMemo(
    () => ({ favorites, toggle, isFavorite, notice, clearNotice }),
    [favorites, isFavorite, toggle, notice, clearNotice],
  )
}
