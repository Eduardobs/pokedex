import { Braces, Dna, Gamepad2, Gem, MapPin, Tags, Zap, type LucideIcon } from 'lucide-react'
import { formatNumber } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { isRelatedPokemonList } from '../lib/related-pokemon'
import { isResourceReference, type ResourceEntry } from '../lib/resource-presentation'
import { ResourceValue, resourceFieldLabel } from './ResourceValue'

function fieldIcon(key: string): LucideIcon {
  if (/(type|category|class|attribute|pocket)/.test(key)) return Tags
  if (/(effect|damage|power|chance|trigger)/.test(key)) return Zap
  if (/(game|version|generation|pokedex)/.test(key)) return Gamepad2
  if (/(location|region|area|habitat)/.test(key)) return MapPin
  if (/(pokemon|species|form|egg)/.test(key)) return Dna
  if (/(item|berry|machine)/.test(key)) return Gem
  return Braces
}

export function ResourceFields({
  entries,
  pokemonGender,
}: {
  entries: ResourceEntry[]
  pokemonGender?: 'female' | 'male'
}) {
  const { language, t } = useLanguage()
  return (
    <div className="resource-detail-grid structured-field-grid">
      {entries.map(([key, value]) => {
        const FieldIcon = fieldIcon(key)
        const label = resourceFieldLabel(key, language)
        const kind = Array.isArray(value)
          ? 'collection'
          : isResourceReference(value)
            ? 'reference'
            : value !== null && typeof value === 'object'
              ? 'object'
              : typeof value === 'string'
                ? 'text'
                : 'metric'
        return (
          <article
            className={`detail-field structured-field${isRelatedPokemonList(value) ? ' related-pokemon-field' : ''}`}
            data-kind={kind}
            key={key}
          >
            <header className="structured-field-heading">
              <h3>
                <span className="detail-field-icon">
                  <FieldIcon size={16} aria-hidden="true" />
                </span>
                {label}
              </h3>
              {Array.isArray(value) && (
                <span className="structured-count">
                  {t('resource.entryCount', { count: formatNumber(value.length, language) })}
                </span>
              )}
            </header>
            <div className="structured-field-body">
              <ResourceValue value={value} pokemonGender={pokemonGender} label={label} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
