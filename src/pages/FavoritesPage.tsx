import { ArrowUpDown, Heart, Search } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/FeedbackState'
import { FavoritePokemonCard } from '../components/FavoritePokemonCard'
import { PageHeader } from '../components/PageHeader'
import { SearchField } from '../components/SearchField'
import { SelectMenu } from '../components/SelectMenu'
import { useFavoritesContext } from '../contexts/FavoritesContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useSearchParamUpdater } from '../hooks/useSearchParamUpdater'
import { normalizeSearchText, prettyName } from '../lib/api'

export function FavoritesPage() {
  const { favorites } = useFavoritesContext()
  const { language, t } = useLanguage()
  const { searchParams, updateSearchParam } = useSearchParamUpdater()
  const query = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') === 'name' ? 'name' : 'recent'
  const sortOptions = [
    { value: 'recent', label: t('favorites.sortRecent') },
    { value: 'name', label: t('favorites.sortName') },
  ]
  const visibleFavorites = useMemo(() => {
    const filtered = favorites.filter((name) => normalizeSearchText(name).includes(normalizeSearchText(query)))
    if (sort === 'name') return [...filtered].sort((left, right) => new Intl.Collator(language).compare(left, right))
    return [...filtered].reverse()
  }, [favorites, language, query, sort])
  return (
    <section className="page content-width">
      <PageHeader
        eyebrow={t('favorites.eyebrow')}
        title={t('favorites.title')}
        description={t('favorites.description')}
        aside={
          favorites.length > 0 ? (
            <div className="result-count">
              <b>{favorites.length}</b>
              <span>
                {favorites.length === 1 ? t('favorites.countOne') : t('favorites.count', { count: favorites.length })}
              </span>
            </div>
          ) : undefined
        }
      />
      {favorites.length ? (
        <>
          <div className="favorites-toolbar">
            <SearchField
              value={query}
              onChange={(value) => updateSearchParam('q', value)}
              clearLabel={t('common.clear')}
              aria-label={t('favorites.search')}
              placeholder={t('favorites.search')}
            />
            <SelectMenu
              icon={<ArrowUpDown size={18} />}
              label={t('favorites.sort')}
              options={sortOptions}
              value={sort}
              onChange={(value) => updateSearchParam('sort', value, 'recent')}
            />
          </div>
          {visibleFavorites.length ? (
            <div className="pokemon-grid">
              {visibleFavorites.map((name) => (
                <FavoritePokemonCard key={name} name={name} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Search />} title={t('pokedex.empty')} description={prettyName(query)} />
          )}
        </>
      ) : (
        <EmptyState
          className="favorites-empty"
          icon={<Heart />}
          title={t('favorites.empty')}
          description={t('favorites.emptyDesc')}
        >
          <Link to="/pokemon" className="button primary">
            {t('favorites.explore')}
          </Link>
        </EmptyState>
      )}
    </section>
  )
}
