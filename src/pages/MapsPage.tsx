import { ArrowRight, Gamepad2, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GameMapCard } from '../components/GameMapCard'
import { PageHeader } from '../components/PageHeader'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber } from '../lib/api'
import { MAP_TOTAL } from '../data/kanto-map'
import { HISUI_TOTAL } from '../data/hisui-map'
import { LUMIOSE_TOTAL } from '../data/lumiose-map'

export function MapsPage() {
  const { language, t } = useLanguage()
  const scarletVioletMaps = [
    { label: t('maps.paldeaRegion'), to: '/mapas/paldea' },
    { label: t('maps.kitakamiRegion'), to: '/mapas/kitakami' },
    { label: t('maps.terarium'), to: '/mapas/terrarium' },
  ]
  const mapCards = [
    {
      to: '/mapas/kanto',
      cover: {
        src: `${import.meta.env.BASE_URL}maps/firered-leafgreen-cover.webp`,
        alt: t('maps.gameCoverAlt'),
        width: 1024,
        height: 1536,
      },
      generation: t('maps.generation'),
      platform: 'Game Boy Advance',
      title: 'Pokémon FireRed & LeafGreen',
      description: t('maps.gameDescription'),
      region: t('maps.region'),
      pointCount: t('maps.pointCount', { count: formatNumber(MAP_TOTAL, language) }),
    },
    {
      to: '/mapas/hisui-region',
      className: 'game-map-card--arceus',
      cover: {
        src: `${import.meta.env.BASE_URL}maps/legends-arceus-map.jpg`,
        alt: t('maps.arceusMapAlt'),
        width: 1024,
        height: 1024,
      },
      generation: t('maps.arceusGeneration'),
      platform: 'Nintendo Switch',
      title: 'Pokémon Legends: Arceus',
      description: t('maps.arceusDescription'),
      region: t('maps.hisuiRegion'),
      pointCount: t('maps.pointCount', { count: formatNumber(HISUI_TOTAL, language) }),
    },
    {
      to: '/mapas/lumiose-city',
      className: 'game-map-card--legends-za',
      cover: {
        src: `${import.meta.env.BASE_URL}maps/pokemon-legends-za-cover.png`,
        alt: t('maps.legendsZaCoverAlt'),
        width: 600,
        height: 900,
      },
      generation: t('maps.legendsZaGeneration'),
      platform: 'Nintendo Switch · Nintendo Switch 2',
      title: 'Pokémon Legends: Z-A',
      description: t('maps.legendsZaDescription'),
      region: t('maps.lumioseCity'),
      pointCount: t('maps.pointCount', { count: formatNumber(LUMIOSE_TOTAL, language) }),
    },
  ]

  return (
    <section className="page content-width maps-page">
      <PageHeader
        className="maps-title"
        eyebrow={
          <>
            <MapPinned size={15} aria-hidden="true" /> {t('maps.eyebrow')}
          </>
        }
        title={t('maps.title')}
        description={t('maps.description')}
      />

      <div className="game-map-grid">
        {mapCards.map((card) => (
          <GameMapCard {...card} openLabel={t('maps.openMap')} key={card.to} />
        ))}

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
