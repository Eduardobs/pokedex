import { ArrowRight, Gamepad2, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber } from '../lib/api'
import { MAP_TOTAL } from '../data/kanto-map'
import { HISUI_TOTAL } from '../data/hisui-map'

export function MapsPage() {
  const { language, t } = useLanguage()
  const scarletVioletMaps = [
    { label: t('maps.paldeaRegion'), to: '/mapas/paldea' },
    { label: t('maps.kitakamiRegion'), to: '/mapas/kitakami' },
    { label: t('maps.terarium'), to: '/mapas/terrarium' },
  ]

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

        <Link className="game-map-card game-map-card--arceus" to="/mapas/hisui-region">
          <div className="game-map-cover">
            <img
              src={`${import.meta.env.BASE_URL}maps/legends-arceus-map.jpg`}
              alt={t('maps.arceusMapAlt')}
              width="1024"
              height="1024"
            />
            <span className="game-map-generation">{t('maps.arceusGeneration')}</span>
          </div>
          <div className="game-map-card-copy">
            <span className="game-map-platform">
              <Gamepad2 size={15} aria-hidden="true" /> Nintendo Switch
            </span>
            <h2>Pokémon Legends: Arceus</h2>
            <p>{t('maps.arceusDescription')}</p>
            <div className="game-map-card-meta">
              <span>{t('maps.hisuiRegion')}</span>
              <span>{t('maps.pointCount', { count: formatNumber(HISUI_TOTAL, language) })}</span>
            </div>
            <span className="game-map-open">
              {t('maps.openMap')} <ArrowRight size={18} aria-hidden="true" />
            </span>
          </div>
        </Link>

        <article className="game-map-card game-map-card--scarlet-violet">
          <div className="game-map-cover">
            <img
              src={`${import.meta.env.BASE_URL}maps/scarlet-violet-cover.webp`}
              alt={t('maps.scarletVioletCoverAlt')}
              width="420"
              height="560"
            />
            <span className="game-map-generation">{t('maps.scarletVioletGeneration')}</span>
          </div>
          <div className="game-map-card-copy">
            <span className="game-map-platform">
              <Gamepad2 size={15} aria-hidden="true" /> Nintendo Switch
            </span>
            <h2>Pokémon Scarlet &amp; Violet</h2>
            <p>{t('maps.scarletVioletDescription')}</p>

            <div className="game-map-regions" aria-labelledby="scarlet-violet-regions">
              <p id="scarlet-violet-regions" className="game-map-region-label">
                {t('maps.chooseRegion')}
              </p>
              <div className="game-map-region-options">
                {scarletVioletMaps.map((region) => (
                  <Link key={region.label} to={region.to}>
                    <span>
                      <MapPinned size={17} aria-hidden="true" /> {region.label}
                    </span>
                    <small>
                      {t('maps.openRegionMap')} <ArrowRight size={14} aria-hidden="true" />
                    </small>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
