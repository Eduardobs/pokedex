import { useApi } from '../hooks/useApi'
import type { Pokemon } from '../types'
import { Loading } from './Loading'
import { PokemonCard } from './PokemonCard'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { prettyName } from '../lib/api'

export function FavoritePokemonCard({ name }: { name: string }) {
  const { data, loading, error, retry } = useApi<Pokemon>(`pokemon/${name}`)
  const { toggle } = useFavoritesContext()
  const { t } = useLanguage()
  if (loading) return <div className="pokemon-card favorite-loading"><Loading label="" /></div>
  if (error || !data) return <article className="pokemon-card favorite-card-error"><h2>{prettyName(name)}</h2><p>{t('favorites.unavailable')}</p><div><button type="button" onClick={retry}>{t('common.retry')}</button><button type="button" onClick={() => toggle(name)}>{t('favorites.removeUnavailable')}</button></div></article>
  return <PokemonCard id={data.id} name={data.name} pokemon={data} />
}
