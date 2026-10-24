import { Shuffle } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { applyTeamMemberSet, randomizeTeamMember, teamMemberSets } from '../lib/random-team'
import { parseItemDirectory } from '../lib/team-items'
import type { TeamMember, TeamPokemon } from '../lib/teams'
import { SelectMenu } from './SelectMenu'
import { InlineRetryError } from './FeedbackState'

export function TeamMemberSetSelect({
  member,
  pokemon,
  onChange,
}: {
  member: TeamMember
  pokemon: TeamPokemon
  onChange: (member: TeamMember) => void
}) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState('random')
  const items = useApi('item?limit=2500', parseItemDirectory)
  const sets = teamMemberSets(pokemon)
  return (
    <>
      {items.loading && <p role="status">{t('common.loading')}</p>}
      {items.error && (
        <InlineRetryError message={t('error.message')} retryLabel={t('common.retry')} onRetry={items.retry} />
      )}
      <fieldset disabled={!items.data} className="team-set-fieldset">
        <SelectMenu
          icon={<Shuffle size={18} />}
          label={t('teams.set')}
          value={selected}
          options={[
            { value: 'random', label: t('teams.randomSet'), pinned: true },
            ...sets.map((set, index) => ({ value: String(index), label: set.role })),
          ]}
          onChange={(value) => {
            if (!items.data) return
            const set = sets[Number(value)]
            onChange(
              value === 'random'
                ? randomizeTeamMember(member, pokemon, items.data)
                : applyTeamMemberSet(member, pokemon, set),
            )
            setSelected(value)
          }}
        />
      </fieldset>
    </>
  )
}
