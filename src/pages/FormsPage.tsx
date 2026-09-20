import { Gem, Globe2, Layers3, Maximize2, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '../components/ErrorState'
import { Loading } from '../components/Loading'
import { FormCategory, formCategory, formLabels, PokemonFormDirectoryCard } from '../components/PokemonFormDirectoryCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { formatNumber, idFromUrl } from '../lib/api'
import type { ApiList, NamedResource } from '../types'

const PAGE_SIZE = 32
type SelectedCategory = 'all' | FormCategory
export function FormsPage() {
  const { language, t } = useLanguage()
  const categories: { value: SelectedCategory; label: string; description: string; icon: typeof Sparkles }[] = [
    { value: 'all', label: t('forms.all'), description: t('forms.allDesc'), icon: Layers3 },
    { value: 'regional', label: t('forms.regional'), description: t('forms.regionalDesc'), icon: Globe2 },
    { value: 'mega', label: t('forms.mega'), description: t('forms.megaDesc'), icon: Gem },
    { value: 'gmax', label: t('forms.gmax'), description: t('forms.gmaxDesc'), icon: Maximize2 },
  ]
  const [category, setCategory] = useState<SelectedCategory>('all')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { data, loading, error } = useApi<ApiList>('pokemon-form?limit=2000&offset=0')
  const { data: speciesData, loading: speciesLoading, error: speciesError } = useApi<ApiList>('pokemon-species?limit=2000&offset=0')

  const grouped = useMemo(() => {
    const groups: Record<FormCategory, NamedResource[]> = { regional: [], mega: [], gmax: [] }
    const nationalDex = new Map(speciesData?.results.map((species) => [species.name, idFromUrl(species.url)]) ?? [])
    data?.results.forEach((resource) => {
      const resourceCategory = formCategory(resource.name)
      if (resourceCategory) groups[resourceCategory].push(resource)
    })
    const byNationalDex = (left: NamedResource, right: NamedResource) => {
      const leftCategory = formCategory(left.name)
      const rightCategory = formCategory(right.name)
      const leftId = leftCategory ? nationalDex.get(formLabels(left.name, leftCategory).baseName) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
      const rightId = rightCategory ? nationalDex.get(formLabels(right.name, rightCategory).baseName) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
      return leftId - rightId || left.name.localeCompare(right.name)
    }
    Object.values(groups).forEach((resources) => resources.sort(byNationalDex))
    return groups
  }, [data, speciesData])

  const specialForms = useMemo(() => {
    const nationalDex = new Map(speciesData?.results.map((species) => [species.name, idFromUrl(species.url)]) ?? [])
    return [...grouped.regional, ...grouped.mega, ...grouped.gmax].sort((left, right) => {
      const leftCategory = formCategory(left.name)!
      const rightCategory = formCategory(right.name)!
      const leftId = nationalDex.get(formLabels(left.name, leftCategory).baseName) ?? Number.MAX_SAFE_INTEGER
      const rightId = nationalDex.get(formLabels(right.name, rightCategory).baseName) ?? Number.MAX_SAFE_INTEGER
      return leftId - rightId || left.name.localeCompare(right.name)
    })
  }, [grouped, speciesData])
  const selectedForms = category === 'all' ? specialForms : grouped[category]
  const filtered = selectedForms.filter((resource) => resource.name.toLowerCase().includes(query.toLowerCase()))
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const filteredLength = filtered.length
  const loadMore = () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredLength))

  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !hasMore || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredLength))
      }
    }, { rootMargin: '300px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [filteredLength, hasMore, loading, speciesLoading, visibleCount])

  const selectCategory = (value: SelectedCategory) => { setCategory(value); setVisibleCount(PAGE_SIZE) }
  const updateQuery = (value: string) => { setQuery(value); setVisibleCount(PAGE_SIZE) }

  if (loading || speciesLoading) return <Loading label={t('forms.loading')} />
  if (error || speciesError || !data || !speciesData) return <ErrorState title={t('forms.unavailable')} message={t('forms.unavailableDesc')} />

  return (
    <section className="page content-width forms-directory-page">
      <div className="page-title"><div><span className="eyebrow"><Sparkles size={14} /> {t('forms.eyebrow')}</span><h1>{t('forms.title')}</h1><p>{t('forms.description')}</p></div><div className="result-count"><b>{formatNumber(specialForms.length, language)}</b><span>{t('forms.specialCount')}</span></div></div>
      <div className="forms-directory-toolbar">
        <div className="forms-category-tabs">{categories.map((item) => { const Icon = item.icon; const count = item.value === 'all' ? specialForms.length : grouped[item.value].length; return <button className={category === item.value ? `active tab-${item.value}` : ''} onClick={() => selectCategory(item.value)} key={item.value}><Icon /><span><b>{item.label}</b><small>{item.description}</small></span><i>{count}</i></button> })}</div>
        <label className="search-field"><Search size={19} /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t('forms.search')} /></label>
      </div>
      <div className="directory-summary"><span>{categories.find((item) => item.value === category)?.label}</span><p>{t('forms.results', { count: filtered.length })}</p></div>
      {visible.length ? <div className="forms-directory-grid">{visible.map((resource) => { const resourceCategory = formCategory(resource.name); return resourceCategory ? <PokemonFormDirectoryCard resource={resource} category={resourceCategory} key={resource.name} /> : null })}</div> : <div className="empty"><Search /><h2>{t('forms.empty')}</h2><p>{t('forms.tryAnother')}</p></div>}
      {hasMore && <div className="infinite-loader" ref={sentinelRef}><span className="pokeball-spinner" /><button onClick={loadMore}>{t('forms.loadMore')}</button></div>}
      {!hasMore && visible.length > PAGE_SIZE && <p className="end-of-list">{t('forms.end')}</p>}
    </section>
  )
}
