import { createContext, useContext, useMemo } from 'react'
import { useFavorites } from '../hooks/useFavorites'

type FavoritesValue = ReturnType<typeof useFavorites>
type FavoritesDataValue = Pick<FavoritesValue, 'favorites' | 'toggle' | 'isFavorite'>
type FavoritesNoticeValue = Pick<FavoritesValue, 'notice' | 'clearNotice'>

const FavoritesDataContext = createContext<FavoritesDataValue | null>(null)
const FavoritesNoticeContext = createContext<FavoritesNoticeValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { favorites, toggle, isFavorite, notice, clearNotice } = useFavorites()
  const dataValue = useMemo<FavoritesDataValue>(
    () => ({ favorites, toggle, isFavorite }),
    [favorites, toggle, isFavorite],
  )
  const noticeValue = useMemo<FavoritesNoticeValue>(() => ({ notice, clearNotice }), [notice, clearNotice])
  return (
    <FavoritesDataContext.Provider value={dataValue}>
      <FavoritesNoticeContext.Provider value={noticeValue}>{children}</FavoritesNoticeContext.Provider>
    </FavoritesDataContext.Provider>
  )
}

export function useFavoritesData() {
  const context = useContext(FavoritesDataContext)
  if (!context) throw new Error('FavoritesProvider is missing')
  return context
}

export function useFavoritesNotice() {
  const context = useContext(FavoritesNoticeContext)
  if (!context) throw new Error('FavoritesProvider is missing')
  return context
}

export function useFavoritesContext(): FavoritesValue {
  const data = useFavoritesData()
  const notice = useFavoritesNotice()
  return useMemo(() => ({ ...data, ...notice }), [data, notice])
}
