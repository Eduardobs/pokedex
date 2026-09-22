import { useLanguage } from '../../contexts/LanguageContext'
import { formatDecimal, localizedApiTerm } from '../../lib/api'
import { captureRatePercentage, pokemonColorHex } from '../../lib/pokemon-species'
import type { Species } from '../../types'

type Props = {
  species: Species
}

export function PokemonBiologyCard({ species }: Props) {
  const { language, t } = useLanguage()
  const colorName = localizedApiTerm(species.color.name, language)
  const capturePercentage = formatDecimal(captureRatePercentage(species.capture_rate), language, 2)

  return (
    <article className="info-card biology-card">
      <h2>{t('detail.biology')}</h2>
      <dl>
        <div>
          <dt>{t('detail.generation')}</dt>
          <dd>{localizedApiTerm(species.generation.name, language)}</dd>
        </div>
        <div>
          <dt>{t('detail.habitat')}</dt>
          <dd>
            {species.habitat?.name
              ? localizedApiTerm(species.habitat.name, language)
              : t('detail.unknown')}
          </dd>
        </div>
        <div>
          <dt>{t('detail.growth')}</dt>
          <dd>{localizedApiTerm(species.growth_rate.name, language)}</dd>
        </div>
        <div>
          <dt>{t('detail.color')}</dt>
          <dd className="pokemon-color-value">
            <span
              className="pokemon-color-swatch"
              style={{ backgroundColor: pokemonColorHex(species.color.name) }}
              aria-hidden="true"
            />
            {colorName}
          </dd>
        </div>
        <div>
          <dt>{t('detail.shape')}</dt>
          <dd>
            {species.shape ? localizedApiTerm(species.shape.name, language) : t('detail.unknown')}
          </dd>
        </div>
        <div>
          <dt>{t('detail.captureRate')}</dt>
          <dd>
            {species.capture_rate} / 255 ({capturePercentage}%)
          </dd>
        </div>
        <div>
          <dt>{t('detail.baseHappiness')}</dt>
          <dd>{species.base_happiness}</dd>
        </div>
      </dl>
      <div className="rarity-tags">
        {species.is_baby && <span>{t('detail.baby')}</span>}
        {species.is_legendary && <span>{t('detail.legendary')}</span>}
        {species.is_mythical && <span>{t('detail.mythical')}</span>}
      </div>
    </article>
  )
}
