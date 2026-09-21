import { Gem, Globe2, Layers3, Maximize2, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { FormCategory, formCategory, formLabels, PokemonFormDirectoryCard } from '../components/PokemonFormDirectoryCard'
import { SearchField } from '../components/SearchField'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { formatNumber, idFromUrl, normalizeSearchText } from '../lib/api'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedCategory = searchParams.get('category') as SelectedCategory | null
  const category: SelectedCategory = requestedCategory && ['regional', 'mega', 'gmax'].includes(requestedCategory) ? requestedCategory : 'all'
  const query = searchParams.get('q') ?? ''
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { data, loading, error, retry } = useApi<ApiList>('pokemon-form?limit=2000&offset=0')
  const { data: speciesData, loading: speciesLoading, error: speciesError, retry: retrySpecies } = useApi<ApiList>('pokemon-species?limit=2000&offset=0')

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
  const normalizedQuery = normalizeSearchText(query)
  const filtered = selectedForms.filter((resource) => {
    const resourceCategory = formCategory(resource.name)
    const labels = resourceCategory ? formLabels(resource.name, resourceCategory, t) : null
    return !normalizedQuery || [resource.name, labels?.pokemon ?? '', labels?.variation ?? '']
      .some((value) => normalizeSearchText(value).includes(normalizedQuery))
  })
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const filteredLength = filtered.length
  const loadMore = () => {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredLength))
  }
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && !speciesLoading,
    onLoadMore: loadMore,
    observationKey: visibleCount,
    rootMargin: '300px',
  })

  const selectCategory = (value: SelectedCategory) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value === 'all') next.delete('category'); else next.set('category', value)
      return next
    }, { replace: true })
    setVisibleCount(PAGE_SIZE)
  }
  const updateQuery = (value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set('q', value); else next.delete('q')
      return next
    }, { replace: true })
    setVisibleCount(PAGE_SIZE)
  }

  if (loading || speciesLoading) return <section className="page content-width forms-directory-page"><div className="page-title"><div><span className="eyebrow"><Sparkles size={14} /> {t('forms.eyebrow')}</span><h1>{t('forms.title')}</h1><p>{t('forms.loading')}</p></div></div><div className="forms-directory-grid">{Array.from({ length: 8 }, (_, index) => <div className="directory-form-card skeleton" key={index} />)}</div></section>
  if (error || speciesError || !data || !speciesData) return <ErrorState title={t('forms.unavailable')} message={t('forms.unavailableDesc')} retry={() => { retry(); retrySpecies() }} />

  return (
    <section className="page content-width forms-directory-page">
      <div className="page-title"><div><span className="eyebrow"><Sparkles size={14} /> {t('forms.eyebrow')}</span><h1>{t('forms.title')}</h1><p>{t('forms.description')}</p></div><div className="result-count"><b>{formatNumber(specialForms.length, language)}</b><span>{t('forms.specialCount')}</span></div></div>
      <div className="forms-directory-toolbar">
        <div className="forms-category-tabs" role="tablist">{categories.map((item) => { const Icon = item.icon; const count = item.value === 'all' ? specialForms.length : grouped[item.value].length; return <button type="button" role="tab" aria-selected={category === item.value} className={category === item.value ? `active tab-${item.value}` : ''} onClick={() => selectCategory(item.value)} key={item.value}><Icon /><span><b>{item.label}</b><small>{item.description}</small></span><i aria-label={String(count)}>{count}</i></button> })}</div>
        <SearchField value={query} onChange={updateQuery} clearLabel={t('common.clear')} aria-label={t('forms.search')} placeholder={t('forms.search')} />
      </div>
      <div className="directory-summary"><span>{categories.find((item) => item.value === category)?.label}</span><p>{filtered.length === 1 ? t('forms.resultOne') : t('forms.results', { count: filtered.length })}</p></div>
      {visible.length ? <div className="forms-directory-grid">{visible.map((resource) => { const resourceCategory = formCategory(resource.name); return resourceCategory ? <PokemonFormDirectoryCard resource={resource} category={resourceCategory} key={resource.name} /> : null })}</div> : <div className="empty"><Search /><h2>{t('forms.empty')}</h2><p>{t('forms.tryAnother')}</p></div>}
      {hasMore && <div className="infinite-loader" ref={sentinelRef} role="status" aria-live="polite"><span className="pokeball-spinner" /><button onClick={loadMore}>{t('forms.loadMore')}</button></div>}
      {!hasMore && visible.length > PAGE_SIZE && <p className="end-of-list">{t('forms.end')}</p>}
    </section>
  )
}
