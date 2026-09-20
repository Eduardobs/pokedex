import { useEffect, useState } from 'react'

const STORAGE_KEY = 'atlas-pokemon-favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[] } catch { return [] }
  })
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)) }, [favorites])
  const toggle = (name: string) => setFavorites((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])
  return { favorites, toggle, isFavorite: (name: string) => favorites.includes(name) }
}
