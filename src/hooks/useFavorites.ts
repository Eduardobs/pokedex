import { useCallback, useEffect, useMemo, useState } from 'react'
import { FAVORITES_LIMIT, STORAGE_KEYS } from '../config/app'
import { readStorage, writeStorage } from '../lib/storage'

const POKEMON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const isFavorites = (value: unknown): value is string[] => Array.isArray(value)
  && value.length <= FAVORITES_LIMIT
  && new Set(value).size === value.length
  && value.every((item) => typeof item === 'string' && item.length <= 64 && POKEMON_NAME.test(item))

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readStorage(STORAGE_KEYS.favorites, isFavorites, []))
  useEffect(() => { writeStorage(STORAGE_KEYS.favorites, favorites) }, [favorites])

  const toggle = useCallback((name: string) => {
    if (name.length > 64 || !POKEMON_NAME.test(name)) return
    setFavorites((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : current.length < FAVORITES_LIMIT ? [...current, name] : current)
  }, [])
  const isFavorite = useCallback((name: string) => favorites.includes(name), [favorites])

  return useMemo(() => ({ favorites, toggle, isFavorite }), [favorites, isFavorite, toggle])
}
