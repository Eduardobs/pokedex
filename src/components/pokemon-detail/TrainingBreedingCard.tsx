import { useLanguage } from '../../contexts/LanguageContext'
import { formatNumber, localizedApiTerm } from '../../lib/api'
import type { Pokemon, Species } from '../../types'
import { GenderRatio } from '../SemanticBadges'

type Props = {
  pokemon: Pokemon
  species: Species
}

export function TrainingBreedingCard({ pokemon, species }: Props) {
  const { language, t } = useLanguage()
  const statNames: Record<string, string> = {
    hp: t('pokedex.sort.hp'),
    attack: t('stats.attack'),
    defense: t('stats.defense'),
    'special-attack': t('stats.specialAttack'),
    'special-defense': t('stats.specialDefense'),
    speed: t('stats.speed'),
  }
  const effortYield = pokemon.stats
    .filter(({ effort }) => effort > 0)
    .map(({ effort, stat }) => t('detail.effortYieldValue', {
      count: formatNumber(effort, language),
      stat: statNames[stat.name] ?? localizedApiTerm(stat.name, language),
    }))

  return (
    <article className="info-card training-card">
      <h2>{t('detail.trainingBreeding')}</h2>
      <dl>
        <div><dt>{t('detail.effortYield')}</dt><dd>{effortYield.join(', ') || '—'}</dd></div>
        <div><dt>{t('detail.hatchCycles')}</dt><dd>{t('detail.hatchCyclesValue', { count: formatNumber(species.hatch_counter + 1, language) })}</dd></div>
        <div><dt>{t('detail.eggGroups')}</dt><dd>{species.egg_groups.map((group) => localizedApiTerm(group.name, language)).join(', ')}</dd></div>
        <div><dt>{t('detail.genderDifferences')}</dt><dd>{t(species.has_gender_differences ? 'common.yes' : 'common.no')}</dd></div>
        <div><dt>{t('detail.switchableForms')}</dt><dd>{t(species.forms_switchable ? 'common.yes' : 'common.no')}</dd></div>
      </dl>
      <p className="hatch-note">{t('detail.hatchCyclesHint')}</p>
      <GenderRatio rate={species.gender_rate} />
    </article>
  )
}
