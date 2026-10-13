import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatNumber, localizedApiTerm, localizedTextResult } from '../../lib/api'
import type { Species } from '../../types'
import { VersionDescriptions } from '../VersionDescriptions'

export function PokemonSpeciesDetails({ species }: { species: Species }) {
  const { language, apiLanguage, t } = useLanguage()
  const description = localizedTextResult(species.form_descriptions, undefined, apiLanguage)
  return (
    <>
      <article className="info-card resource-tool">
        <h2>{t('tools.regionalNumbers')}</h2>
        {species.pokedex_numbers?.length ? (
          <dl className="tool-grid">
            {species.pokedex_numbers.map(({ entry_number, pokedex }) => (
              <div key={pokedex.name}>
                <dt>
                  <Link to={`/explore/pokedex/${encodeURIComponent(pokedex.name)}`}>
                    {localizedApiTerm(pokedex.name, language)}
                  </Link>
                </dt>
                <dd>#{formatNumber(entry_number, language)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>{t('tools.noData')}</p>
        )}
      </article>
      <VersionDescriptions entries={species.flavor_text_entries} />
      {description.text && (
        <article className="info-card">
          <h2>{t('tools.formDescriptions')}</h2>
          <p lang={description.language}>{description.text}</p>
          {description.fallback && <small className="language-fallback">{t('detail.fallbackLanguage')}</small>}
        </article>
      )}
      {species.growth_rate && (
        <article className="info-card">
          <h2>{t('tools.experience')}</h2>
          <Link
            className="button secondary"
            to={`/explore/growth-rate/${encodeURIComponent(species.growth_rate.name)}`}
          >
            {t('tools.experience')} · {localizedApiTerm(species.growth_rate.name, language)}
          </Link>
        </article>
      )}
    </>
  )
}
