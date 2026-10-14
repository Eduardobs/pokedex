import { CircleSlash2, Dices, Mars, RotateCcw, Trophy, Venus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useLanguage } from '../contexts/LanguageContext'
import { localizedApiTerm, localizedName, localizedText, pokemonArtwork, prettyName } from '../lib/api'
import {
  calculatedStats,
  competitiveFormats,
  editEv,
  natureNames,
  natureModifiers,
  parseTeamPokemon,
  parseTeamSpecies,
  statNames,
  teraTypes,
  type CompetitiveFormat,
  type Stats,
  type TeamMember,
} from '../lib/teams'
import { record } from '../lib/resource-data'
import { MoveSelect } from './MoveSelect'
import { EvSlider } from './EvSlider'
import { ItemSelect } from './ItemSelect'
import { RadioSelection } from './RadioSelection'
import { SelectMenu } from './SelectMenu'
import { TypeBadge, typeLabel } from './TypeBadge'
import { TypeIcon } from './TypeIcon'
import { InlineRetryError } from './FeedbackState'
import { EstimatedSpreadSuggestion } from './EstimatedSpreadSuggestion'

export function ApiFeedback({ state }: { state: { loading: boolean; error: Error | null; retry: () => void } }) {
  const { t } = useLanguage()
  return (
    <>
      {state.loading && <p role="status">{t('common.loading')}</p>}
      {state.error && (
        <InlineRetryError message={t('error.message')} retryLabel={t('common.retry')} onRetry={state.retry} />
      )}
    </>
  )
}
function ResourceDescription({ resource, name }: { resource: string; name: string }) {
  const { apiLanguage } = useLanguage()
  const state = useApi(name ? `${resource}/${name}` : null, record)
  return (
    <>
      <ApiFeedback state={state} />
      {state.data && (
        <p className="team-hint">
          <strong>{localizedName(state.data.names, apiLanguage) || prettyName(name)}</strong> —{' '}
          {localizedText(state.data.effect_entries, ['short_effect', 'effect'], apiLanguage) ||
            localizedText(state.data.flavor_text_entries, ['flavor_text'], apiLanguage)}
        </p>
      )}
    </>
  )
}
export function TeamMemberEditor({
  member: m,
  competitiveFormat = 'unrestricted',
  onChange,
  onFormatChange,
  onRemove,
}: {
  member: TeamMember
  competitiveFormat?: CompetitiveFormat
  onChange: (member: TeamMember) => void
  onFormatChange: (format: CompetitiveFormat) => void
  onRemove: () => void
}) {
  const { t, language } = useLanguage()
  const state = useApi(`pokemon/${m.pokemon}`, parseTeamPokemon)
  const species = useApi(state.data ? `pokemon-species/${state.data.species}` : null, parseTeamSpecies)
  const p = state.data
  const statLabel = (stat: string) => {
    const keys = {
      hp: 'pokedex.sort.hp',
      attack: 'stats.attack',
      defense: 'stats.defense',
      'special-attack': 'stats.specialAttack',
      'special-defense': 'stats.specialDefense',
      speed: 'stats.speed',
    } as const
    return statNames.includes(stat as (typeof statNames)[number])
      ? t(keys[stat as (typeof statNames)[number]])
      : localizedApiTerm(stat, language)
  }
  const patch = (value: Partial<TeamMember>) => onChange({ ...m, ...value })
  if (!p)
    return (
      <article className="team-member">
        <h3>{prettyName(m.pokemon)}</h3>
        <ApiFeedback state={state} />
        <button className="button secondary" onClick={onRemove}>
          {t('teams.remove')}
        </button>
      </article>
    )
  const stats = calculatedStats(p, m)
  const genderRate = species.data?.genderRate
  const genders =
    genderRate === -1
      ? ['none']
      : genderRate === 0
        ? ['male']
        : genderRate === 8
          ? ['female']
          : ['random', 'male', 'female']
  const gender = genders.includes(m.gender) ? m.gender : genders[0]
  const genderOptions = genders.map((value) => ({
    value,
    label:
      value === 'random'
        ? t('teams.random')
        : t(value === 'male' ? 'gender.maleLabel' : value === 'female' ? 'gender.femaleLabel' : 'gender.none'),
    icon:
      value === 'random' ? (
        <Dices size={16} />
      ) : value === 'male' ? (
        <Mars size={16} />
      ) : value === 'female' ? (
        <Venus size={16} />
      ) : (
        <CircleSlash2 size={16} />
      ),
  }))
  const formatMessages = {
    unrestricted: ['teams.formatUnrestricted', 'teams.formatUnrestrictedDescription'],
    'singles-6v6': ['teams.formatSingles6', 'teams.formatSingles6Description'],
    'doubles-6v6': ['teams.formatDoubles6', 'teams.formatDoubles6Description'],
    'doubles-4v4': ['teams.formatDoubles4', 'teams.formatDoubles4Description'],
    'singles-3v3': ['teams.formatSingles3', 'teams.formatSingles3Description'],
  } as const
  const formatOptions = competitiveFormats.map((value) => ({
    value,
    label: t(formatMessages[value][0]),
    description: t(formatMessages[value][1]),
  }))
  const select = (
    label: string,
    value: string,
    values: string[],
    onSelect: (v: string) => void,
    display = (v: string) => localizedApiTerm(v, language),
  ) => (
    <label>
      {label}
      <select aria-label={label} value={value} onChange={(e) => onSelect(e.target.value)}>
        {values.map((v) => (
          <option key={v} value={v}>
            {v ? display(v) : t('teams.none')}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <article className="team-member">
      <header className="team-member-header">
        <img src={pokemonArtwork(p.id, m.shiny)} alt={prettyName(p.name)} width={120} height={120} />
        <div>
          <span className="eyebrow">{species.data ? `#${String(species.data.id).padStart(4, '0')}` : '—'}</span>
          <h3>{prettyName(p.name)}</h3>
          <div className="team-types">
            {p.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </div>
        <button className="button secondary" onClick={onRemove}>
          {t('teams.remove')}
        </button>
      </header>
      <ApiFeedback state={species} />
      <div className="team-editor-grid">
        <div className="team-build">
          <div className="team-fields">
            <label>
              {t('teams.level')}
              <input
                type="number"
                min={1}
                max={100}
                value={m.level}
                onChange={(e) => patch({ level: Math.max(1, Math.min(100, Math.trunc(Number(e.target.value)) || 1)) })}
              />
            </label>
            <label className="team-checkbox">
              <input type="checkbox" checked={m.shiny} onChange={(e) => patch({ shiny: e.target.checked })} />
              {t('teams.shiny')}
            </label>
            {species.data && (
              <RadioSelection
                legend={t('resource.field.gender')}
                value={gender}
                options={genderOptions}
                onChange={(value) => patch({ gender: value })}
              />
            )}
            <SelectMenu
              className={`tera-type-select type-${m.tera}`}
              icon={<TypeIcon type={m.tera} />}
              label={t('teams.tera')}
              value={m.tera}
              options={teraTypes.map((type) => ({
                value: type,
                label: typeLabel(type, language),
                icon: <TypeIcon type={type} />,
                className: `type-${type}`,
              }))}
              onChange={(tera) => patch({ tera })}
            />
            {select(
              t('teams.ability'),
              p.abilities.includes(m.ability) ? m.ability : p.abilities[0],
              p.abilities,
              (v) => patch({ ability: v, abilityActive: false }),
            )}
            {select(
              t('resource.field.nature'),
              m.nature,
              [...natureNames].sort((first, second) =>
                localizedApiTerm(first, language).localeCompare(localizedApiTerm(second, language), language),
              ),
              (v) => patch({ nature: v }),
              (name) => {
                const modifiers = natureModifiers(name)
                return modifiers
                  ? t('teams.natureModifier', {
                      name: localizedApiTerm(name, language),
                      increased: statLabel(modifiers.increased),
                      decreased: statLabel(modifiers.decreased),
                    })
                  : localizedApiTerm(name, language)
              },
            )}
          </div>
          <ResourceDescription resource="ability" name={p.abilities.includes(m.ability) ? m.ability : p.abilities[0]} />
          <label className="team-checkbox">
            <input
              type="checkbox"
              checked={m.abilityActive}
              onChange={(e) => patch({ abilityActive: e.target.checked })}
            />
            {t('teams.abilityActive')}
          </label>
          <ItemSelect value={m.item} label={t('teams.item')} onChange={(item) => patch({ item, itemActive: false })} />
          {m.item && (
            <>
              {m.item === 'eviolite' && (
                <label className="team-checkbox">
                  <input
                    type="checkbox"
                    checked={m.itemActive}
                    onChange={(e) => patch({ itemActive: e.target.checked })}
                  />
                  {t('teams.eviolite')}
                </label>
              )}
            </>
          )}
        </div>
        <div className="team-training">
          <div className="team-training-header">
            <h4>{t('teams.stats')}</h4>
            <button
              type="button"
              className="button secondary compact-button"
              title={t('teams.clearTrainingDescription')}
              onClick={() =>
                patch({
                  evs: [0, 0, 0, 0, 0, 0],
                  ivs: [31, 31, 31, 31, 31, 31],
                })
              }
            >
              <RotateCcw size={14} aria-hidden="true" />
              {t('teams.clearTraining')}
            </button>
          </div>
          <details className="team-notes">
            <summary>{t('teams.calculationHelp')}</summary>
            <p className="team-hint">{t('teams.statsNote')}</p>
          </details>
          <EstimatedSpreadSuggestion
            pokemon={p}
            member={m}
            competitiveFormat={competitiveFormat}
            statLabel={statLabel}
            onApply={patch}
          />
          <div className="team-table" tabIndex={0} role="region" aria-label={t('teams.stats')}>
            <table>
              <caption className="sr-only">{t('teams.stats')}</caption>
              <thead>
                <tr>
                  <th>{t('ui.attribute')}</th>
                  <th>{t('teams.base')}</th>
                  <th>{t('teams.ivMaximum')}</th>
                  <th>{t('teams.ev')}</th>
                  <th>{t('teams.calculated')}</th>
                </tr>
              </thead>
              <tbody>
                {statNames.map((stat, i) => (
                  <tr key={stat}>
                    <th scope="row">{statLabel(stat)}</th>
                    <td>{p.stats[i]}</td>
                    <td>
                      <input
                        aria-label={`${t('teams.iv')} ${statLabel(stat)}`}
                        type="number"
                        min={0}
                        max={31}
                        value={m.ivs[i]}
                        onChange={(e) =>
                          patch({
                            ivs: m.ivs.map((v, j) =>
                              i === j ? Math.max(0, Math.min(31, Math.trunc(Number(e.target.value)) || 0)) : v,
                            ) as Stats,
                          })
                        }
                      />
                    </td>
                    <td>
                      <EvSlider
                        label={statLabel(stat)}
                        value={m.evs[i]}
                        max={Math.min(252, 510 - m.evs.reduce((a, b, j) => a + (j === i ? 0 : b), 0))}
                        onChange={(value) => patch({ evs: editEv(m.evs, i, value) })}
                      />
                    </td>
                    <td>
                      <strong>{stats[i]}</strong>
                    </td>
                  </tr>
                ))}
                <tr>
                  <th>{t('teams.total')}</th>
                  <td>{p.stats.reduce((a, b) => a + b, 0)}</td>
                  <td>—</td>
                  <td>{m.evs.reduce((a, b) => a + b, 0)} / 510</td>
                  <td>{stats.reduce((a, b) => a + b, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="team-moves-header">
        <h4>{t('teams.moves')}</h4>
        <SelectMenu
          className="competitive-format-select"
          icon={<Trophy size={18} />}
          label={t('teams.competitiveFormat')}
          value={competitiveFormat}
          options={formatOptions}
          onChange={onFormatChange}
        />
      </div>
      <p className="team-format-description">{t(formatMessages[competitiveFormat][1])}</p>
      <details className="team-notes">
        <summary>{t('teams.compatibility')}</summary>
        <p className="team-hint">{t('teams.movesNote')}</p>
      </details>
      <div className="team-moves">
        {m.moves.map((move, i) => (
          <MoveSelect
            key={i}
            label={t('teams.moveSlot', { number: i + 1 })}
            value={p.moves.includes(move) ? move : ''}
            options={p.moves.filter((v) => v === move || !m.moves.includes(v))}
            onChange={(value) => patch({ moves: m.moves.map((old, j) => (i === j ? value : old)) })}
          />
        ))}
      </div>
    </article>
  )
}
