import { ChevronDown, Gamepad2, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatNumber, localizedApiTerm, prettyName } from '../../lib/api'
import { encountersForVersion, encounterVersions } from '../../lib/pokemon-encounters'
import type { Encounter } from '../../types'
import { SelectMenu } from '../SelectMenu'

type Props = {
  encounters: Encounter[]
}

export function PokemonEncounters({ encounters }: Props) {
  const { language, t } = useLanguage()
  const versions = useMemo(() => encounterVersions(encounters), [encounters])
  const newestVersion = versions.at(-1)?.name ?? ''
  const [selectedVersion, setSelectedVersion] = useState(newestVersion)
  const activeVersion = versions.some(({ name }) => name === selectedVersion) ? selectedVersion : newestVersion
  const areas = useMemo(() => encountersForVersion(encounters, activeVersion), [activeVersion, encounters])
  const versionLabel = prettyName(activeVersion)

  if (!versions.length) return <div className="empty"><MapPin /><h3>{t('detail.noEncounters')}</h3></div>

  return (
    <>
      <div className="encounter-heading">
        <div>
          <h2>{t('detail.encounterAreas')}</h2>
          <p>{t('detail.encounterDesc')}</p>
        </div>
        <SelectMenu
          className="encounter-version-select"
          icon={<Gamepad2 size={18} />}
          label={t('detail.gameVersion')}
          options={versions.map(({ name }) => ({ value: name, label: prettyName(name) }))}
          value={activeVersion}
          onChange={setSelectedVersion}
        />
      </div>
      <p className="encounter-status" role="status">
        {areas.length === 1
          ? t('detail.encounterSummaryOne', { version: versionLabel })
          : t('detail.encounterSummary', { count: formatNumber(areas.length, language), version: versionLabel })}
      </p>
      {areas.length ? <div className="encounter-list">
        {areas.map((area) => (
          <details className="encounter-card" key={area.location_area.name}>
            <summary>
              <span className="encounter-location-icon"><MapPin aria-hidden="true" /></span>
              <span className="encounter-location-copy"><b>{prettyName(area.location_area.name)}</b><small>{t('detail.encounterDetails')}</small></span>
              <span className="encounter-max-chance">{t('detail.bestEncounterChance', { chance: Math.max(...area.encounter_details.map(({ chance }) => chance), 0) })}</span>
              <ChevronDown className="encounter-chevron" aria-hidden="true" />
            </summary>
            <div className="encounter-card-body">
              <ul className="encounter-detail-list">
                {area.encounter_details.map((detail, index) => {
                  const level = detail.min_level === 0 && detail.max_level === 0
                    ? t('detail.levelUnavailable')
                    : detail.min_level === detail.max_level
                      ? t('move.level', { level: detail.min_level })
                      : t('detail.levelRange', { minimum: detail.min_level, maximum: detail.max_level })
                  return (
                    <li key={`${detail.method.name}-${detail.min_level}-${detail.max_level}-${detail.chance}-${index}`}>
                      <dl>
                        <div><dt>{t('detail.encounterMethod')}</dt><dd>{localizedApiTerm(detail.method.name, language)}</dd></div>
                        <div><dt>{t('detail.encounterLevel')}</dt><dd>{level}</dd></div>
                        <div><dt>{t('detail.encounterChance')}</dt><dd>{formatNumber(detail.chance, language)}%</dd></div>
                      </dl>
                      <div className="encounter-conditions">
                        <small>{t('detail.encounterConditions')}</small>
                        {detail.condition_values.length
                          ? <div>{detail.condition_values.map(({ name }) => <span key={name}>{localizedApiTerm(name, language)}</span>)}</div>
                          : <span className="muted">{t('detail.noEncounterConditions')}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Link className="encounter-location-link" to={`/explorar/location-area/${encodeURIComponent(area.location_area.name)}`}>{t('detail.openLocation')}</Link>
            </div>
          </details>
        ))}
      </div> : <div className="empty compact-empty"><MapPin /><h3>{t('detail.noEncountersInVersion')}</h3></div>}
    </>
  )
}
