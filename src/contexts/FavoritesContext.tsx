import { createContext, useContext } from 'react'
import { useFavorites } from '../hooks/useFavorites'

type FavoritesValue = ReturnType<typeof useFavorites>
const FavoritesContext = createContext<FavoritesValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const value = useFavorites()
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('FavoritesProvider ausente')
  return context
}
