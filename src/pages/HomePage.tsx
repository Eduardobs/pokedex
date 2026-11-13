import {
  ArrowRight,
  BookOpen,
  Database,
  MapPin,
  MapPinned,
  Grid3X3,
  UsersRound,
  Sparkles,
  Swords,
  Search,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { RESOURCE_COLLECTION_COUNT } from '../data/resource-summary'
import { formatNumber } from '../lib/api'
import { FeaturedPokemon } from '../components/FeaturedPokemon'
import { NotebookSection } from '../components/NotebookSection'

export function HomePage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  return (
    <div className="home-notebook content-width">
      <section className="hero discovery-register">
        <header className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} aria-hidden="true" /> {t('home.eyebrow')}
          </span>
          <h1>
            {t('home.title')} <em>{t('home.titleAccent')}</em>
          </h1>
          <p>{t('home.description')}</p>
        </header>
        <div className="discovery-command">
          <form
            className="home-search search-field"
            role="search"
            aria-label={t('home.openPokedex')}
            onSubmit={(event) => {
              event.preventDefault()
              const query = String(new FormData(event.currentTarget).get('query') ?? '').trim()
              navigate(query ? `/pokemon?q=${encodeURIComponent(query)}` : '/pokemon')
            }}
          >
            <Search size={20} aria-hidden="true" />
            <input
              name="query"
              aria-label={t('nav.searchLabel')}
              placeholder={t('notebook.searchPlaceholder')}
              maxLength={64}
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" aria-label={t('home.openPokedex')}>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </form>
          <div className="hero-actions">
            <Link to="/pokemon" className="button primary">
              {t('home.openPokedex')} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/explore" className="button secondary">
              {t('home.explore')}
            </Link>
          </div>
          <dl className="discovery-totals">
            <div>
              <dt>{t('nav.pokedex')}</dt>
              <dd>{t('home.pokemonCount', { count: formatNumber(1_000, language) })}</dd>
            </div>
            <div>
              <dt>{t('home.types')}</dt>
              <dd>18</dd>
            </div>
            <div>
              <dt>{t('home.generations')}</dt>
              <dd>9</dd>
            </div>
          </dl>
        </div>
        <div className="hero-visual" aria-label={t('home.featured')}>
          <FeaturedPokemon />
          <div className="hero-starters">
            {[
              { id: 1, name: 'Bulbasaur' },
              { id: 4, name: 'Charmander' },
              { id: 7, name: 'Squirtle' },
            ].map((pokemon) => (
              <Link to={`/pokemon/${pokemon.name.toLowerCase()}`} key={pokemon.id}>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
                  alt=""
                  width="64"
                  height="64"
                  loading="lazy"
                />
                <span>{pokemon.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <NotebookSection
        index={1}
        title={t('home.allInOne')}
        description={t('home.start')}
        className="discovery-index"
        actions={
          <Link to="/explore">
            {t('home.allCategories')} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        }
      >
        <nav className="discovery-links" aria-label={t('home.allInOne')}>
          {(
            [
              { to: '/pokemon', icon: BookOpen, title: 'home.nationalDex', description: 'home.nationalDexDesc' },
              { to: '/explore/move', icon: Swords, title: 'home.moves', description: 'home.movesDesc' },
              { to: '/explore/region', icon: MapPin, title: 'home.regions', description: 'home.regionsDesc' },
              { to: '/explore', icon: Database, title: 'home.encyclopedia', description: null },
            ] as const
          ).map(({ to, icon: Icon, title, description }) => (
            <Link key={title} to={to}>
              <Icon size={24} aria-hidden="true" />
              <span>
                <strong>{t(title)}</strong>
                <small>
                  {description ? t(description) : t('home.collections', { count: RESOURCE_COLLECTION_COUNT })}
                </small>
              </span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </NotebookSection>
      <NotebookSection index={2} title={t('home.workflows')} description={t('ui.quickTools')}>
        <nav className="discovery-links" aria-label={t('home.workflows')}>
          {(
            [
              { to: '/teams', icon: UsersRound, title: 'teams.title', description: 'home.planTeam' },
              { to: '/types-table', icon: Grid3X3, title: 'typesTable.title', description: 'home.checkTypes' },
              { to: '/maps', icon: MapPinned, title: 'maps.title', description: 'home.findPlaces' },
            ] as const
          ).map(({ to, icon: Icon, title, description }) => (
            <Link key={to} to={to}>
              <Icon size={24} aria-hidden="true" />
              <span>
                <strong>{t(title)}</strong>
                <small>{t(description)}</small>
              </span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </NotebookSection>
    </div>
  )
}
