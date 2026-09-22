import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { localizedName, prettyName } from '../lib/api'
import type { NamedResource } from '../types'

type LocalizedNamedResource = {
  names?: { name: string; language: NamedResource }[]
}

export function LocalizedResourceName({ resource }: { resource: NamedResource }) {
  const { apiLanguage } = useLanguage()
  const { data } = useApi<LocalizedNamedResource>(resource.url)
  const fallback = prettyName(resource.name)
  const name = localizedName(data?.names, apiLanguage) || fallback

  return <span lang={name === fallback && apiLanguage !== 'en' ? 'en' : undefined}>{name}</span>
}
