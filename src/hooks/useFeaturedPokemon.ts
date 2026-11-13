import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../config/app'
import { parseFeaturedPokemon, randomFeaturedPokemonId } from '../lib/featured-pokemon'
import { useApi } from './useApi'

export function useFeaturedPokemon() {
  const [id] = useState(() => {
    let previous: number | null = null
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.featuredPokemon)
      previous = stored === null ? null : Number(stored)
    } catch {
      /* The highlight also works when storage is unavailable. */
    }
    return randomFeaturedPokemonId(previous, Math.random())
  })
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.featuredPokemon, String(id))
    } catch {
      /* Storage is optional. */
    }
  }, [id])
  const state = useApi(`pokemon/${id}`, (value) => {
    const pokemon = parseFeaturedPokemon(value)
    if (pokemon.id !== id) throw new Error('Unexpected featured Pokémon')
    return pokemon
  })
  return { ...state, id }
}
