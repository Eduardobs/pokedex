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

export function HomePage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> {t('home.eyebrow')}
          </span>
          <h1>
            {t('home.title')}
            <br />
            <em>{t('home.titleAccent')}</em>
          </h1>
          <p>{t('home.description')}</p>
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
              placeholder={t('nav.searchPlaceholder')}
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
              {t('home.openPokedex')} <ArrowRight size={18} />
            </Link>
            <Link to="/explore" className="button secondary">
              {t('home.explore')}
            </Link>
          </div>
          <div className="hero-stats">
            <span>
              <b>{t('home.pokemonCount', { count: formatNumber(1_000, language) })}</b>
            </span>
            <span>
              <b>18</b> {t('home.types')}
            </span>
            <span>
              <b>9</b> {t('home.generations')}
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label={t('home.featured')}>
          <span className="hero-specimen-number" aria-hidden="true">
            006
          </span>
          <div className="hero-orbit" aria-hidden="true" />
          <Link to="/pokemon/charizard" className="hero-featured-pokemon">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png"
              alt="Charizard"
              width="475"
              height="475"
              fetchPriority="high"
              decoding="async"
            />
            <span className="hero-specimen-caption">
              <span>#0006</span> Charizard <ArrowRight size={20} aria-hidden="true" />
            </span>
          </Link>
          <div className="hero-starters">
            {[
              { id: 1, name: 'Bulbasaur' },
              { id: 4, name: 'Charmander' },
              { id: 7, name: 'Squirtle' },
            ].map((pokemon) => (
              <Link to={`/pokemon/${pokemon.name.toLowerCase()}`} key={pokemon.id}>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
                  alt={pokemon.name}
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

      <section className="quick-section content-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('home.start')}</span>
            <h2>{t('home.allInOne')}</h2>
          </div>
          <Link to="/explore">
            {t('home.allCategories')} <ArrowRight size={17} />
          </Link>
        </div>
        <div className="quick-grid">
          <Link to="/pokemon" className="quick-card red">
            <span className="quick-card-index" aria-hidden="true">
              01
            </span>
            <div className="quick-icon">
              <BookOpen />
            </div>
            <div>
              <h3>{t('home.nationalDex')}</h3>
              <p>{t('home.nationalDexDesc')}</p>
            </div>
            <ArrowRight />
          </Link>
          <Link to="/explore/move" className="quick-card purple">
            <span className="quick-card-index" aria-hidden="true">
              02
            </span>
            <div className="quick-icon">
              <Swords />
            </div>
            <div>
              <h3>{t('home.moves')}</h3>
              <p>{t('home.movesDesc')}</p>
            </div>
            <ArrowRight />
          </Link>
          <Link to="/explore/region" className="quick-card green">
            <span className="quick-card-index" aria-hidden="true">
              03
            </span>
            <div className="quick-icon">
              <MapPin />
            </div>
            <div>
              <h3>{t('home.regions')}</h3>
              <p>{t('home.regionsDesc')}</p>
            </div>
            <ArrowRight />
          </Link>
          <Link to="/explore" className="quick-card blue">
            <span className="quick-card-index" aria-hidden="true">
              04
            </span>
            <div className="quick-icon">
              <Database />
            </div>
            <div>
              <h3>{t('home.encyclopedia')}</h3>
              <p>{t('home.collections', { count: RESOURCE_COLLECTION_COUNT })}</p>
            </div>
            <ArrowRight />
          </Link>
        </div>
      </section>
      <section className="home-workflows content-width" aria-labelledby="home-workflows-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('ui.quickTools')}</span>
            <h2 id="home-workflows-title">{t('home.workflows')}</h2>
          </div>
        </div>
        <div className="home-workflow-grid">
          {(
            [
              { to: '/teams', icon: UsersRound, title: 'teams.title', description: 'home.planTeam' },
              { to: '/types-table', icon: Grid3X3, title: 'typesTable.title', description: 'home.checkTypes' },
              { to: '/maps', icon: MapPinned, title: 'maps.title', description: 'home.findPlaces' },
            ] as const
          ).map(({ to, icon: Icon, title, description }) => (
            <Link key={to} to={to} className="home-workflow-card">
              <Icon size={24} aria-hidden="true" />
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
