import { useApi } from '../hooks/useApi'
import type { Pokemon } from '../types'
import { Loading } from './Loading'
import { PokemonCard } from './PokemonCard'

export function FavoritePokemonCard({ name }: { name: string }) {
  const { data, loading } = useApi<Pokemon>(`pokemon/${name}`)
  if (loading || !data) return <div className="pokemon-card favorite-loading"><Loading label="" /></div>
  return <PokemonCard id={data.id} name={data.name} pokemon={data} />
}
