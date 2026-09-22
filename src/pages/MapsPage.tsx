import { ArrowRight, Gamepad2, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber } from '../lib/api'
import { MAP_TOTAL } from '../data/kanto-map'

export function MapsPage() {
  const { language, t } = useLanguage()

  return (
    <section className="page content-width maps-page">
      <div className="page-title maps-title">
        <div>
          <span className="eyebrow">
            <MapPinned size={15} aria-hidden="true" /> {t('maps.eyebrow')}
          </span>
          <h1>{t('maps.title')}</h1>
          <p>{t('maps.description')}</p>
        </div>
      </div>

      <div className="game-map-grid">
        <Link className="game-map-card" to="/mapas/kanto">
          <div className="game-map-cover">
            <img
              src={`${import.meta.env.BASE_URL}maps/firered-leafgreen-cover.webp`}
              alt={t('maps.gameCoverAlt')}
              width="1024"
              height="1536"
            />
            <span className="game-map-generation">{t('maps.generation')}</span>
          </div>
          <div className="game-map-card-copy">
            <span className="game-map-platform">
              <Gamepad2 size={15} aria-hidden="true" /> Game Boy Advance
            </span>
            <h2>Pokémon FireRed &amp; LeafGreen</h2>
            <p>{t('maps.gameDescription')}</p>
            <div className="game-map-card-meta">
              <span>{t('maps.region')}</span>
              <span>{t('maps.pointCount', { count: formatNumber(MAP_TOTAL, language) })}</span>
            </div>
            <span className="game-map-open">
              {t('maps.openMap')} <ArrowRight size={18} aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  )
}
