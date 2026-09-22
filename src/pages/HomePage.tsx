import { ArrowRight, BookOpen, Database, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { RESOURCE_COLLECTION_COUNT } from '../data/resource-summary'
import { formatNumber } from '../lib/api'

const featured = [
  { id: 1, name: 'bulbasaur', color: '#74c856' },
  { id: 4, name: 'charmander', color: '#f07a46' },
  { id: 7, name: 'squirtle', color: '#5bb7db' },
  { id: 25, name: 'pikachu', color: '#f2c94c' },
]

export function HomePage() {
  const { language, t } = useLanguage()
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={15} /> {t('home.eyebrow')}</span>
          <h1>{t('home.title')}<br /><em>{t('home.titleAccent')}</em></h1>
          <p>{t('home.description')}</p>
          <div className="hero-actions">
            <Link to="/pokemon" className="button primary">{t('home.openPokedex')} <ArrowRight size={18} /></Link>
            <Link to="/explorar" className="button secondary">{t('home.explore')}</Link>
          </div>
          <div className="hero-stats">
            <span><b>{t('home.pokemonCount', { count: formatNumber(1_000, language) })}</b></span><span><b>18</b> {t('home.types')}</span><span><b>9</b> {t('home.generations')}</span>
          </div>
        </div>
        <div className="hero-visual" aria-label={t('home.featured')}>
          <div className="hero-rings" />
          {featured.map((pokemon, index) => (
            <Link to={`/pokemon/${pokemon.name}`} key={pokemon.name} className={`hero-pokemon p${index + 1}`} style={{ '--accent': pokemon.color } as React.CSSProperties}>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
                alt={pokemon.name}
                width="190"
                height="190"
                decoding="async"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'low'}
              />
            </Link>
          ))}
          <div className="hero-ball"><span /></div>
        </div>
      </section>

      <section className="quick-section content-width">
        <div className="section-heading"><div><span className="eyebrow">{t('home.start')}</span><h2>{t('home.allInOne')}</h2></div><Link to="/explorar">{t('home.allCategories')} <ArrowRight size={17} /></Link></div>
        <div className="quick-grid">
          <Link to="/pokemon" className="quick-card red"><div className="quick-icon"><BookOpen /></div><div><h3>{t('home.nationalDex')}</h3><p>{t('home.nationalDexDesc')}</p></div><ArrowRight /></Link>
          <Link to="/explorar/move" className="quick-card purple"><div className="quick-icon"><Sparkles /></div><div><h3>{t('home.moves')}</h3><p>{t('home.movesDesc')}</p></div><ArrowRight /></Link>
          <Link to="/explorar/region" className="quick-card green"><div className="quick-icon"><MapPin /></div><div><h3>{t('home.regions')}</h3><p>{t('home.regionsDesc')}</p></div><ArrowRight /></Link>
          <Link to="/explorar" className="quick-card blue"><div className="quick-icon"><Database /></div><div><h3>{t('home.encyclopedia')}</h3><p>{t('home.collections', { count: RESOURCE_COLLECTION_COUNT })}</p></div><ArrowRight /></Link>
        </div>
      </section>
    </>
  )
}
