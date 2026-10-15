import { useRef, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useLanguage } from '../contexts/LanguageContext'
import { pokemonHomeSprite, prettyName } from '../lib/api'
import { parseTeamPokemon, type Team, type TeamMember } from '../lib/teams'
import { TeamMemberEditor } from './TeamMemberEditor'

function MemberThumbnail({ member }: { member: TeamMember }) {
  const { data } = useApi(`pokemon/${member.pokemon}`, parseTeamPokemon)
  const sprite = data
    ? ((member.shiny ? data.homeShinySprite : data.homeSprite) ?? pokemonHomeSprite(data.id, member.shiny))
    : null
  return <span className="team-tab-art">{sprite && <img src={sprite} alt="" width={56} height={56} />}</span>
}
export function TeamTabs({ team, onChange }: { team: Team; onChange: (team: Team) => void }) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(team.members[0]?.id)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const member = team.members.find((v) => v.id === selected) ?? team.members[0]
  const selectFromClick = (id: string) => {
    if (id === member?.id) return
    const scrollY = window.scrollY
    setSelected(id)
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }))
  }
  if (!member) return null
  return (
    <div className="team-roster">
      <div className="team-tabs" role="tablist" aria-label={t('teams.members')}>
        {team.members.map((entry, index) => (
          <button
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            key={entry.id}
            id={`member-tab-${entry.id}`}
            aria-controls={`member-panel-${entry.id}`}
            aria-selected={member.id === entry.id}
            tabIndex={member.id === entry.id ? 0 : -1}
            onClick={() => selectFromClick(entry.id)}
            onKeyDown={(e) => {
              const next =
                e.key === 'ArrowRight'
                  ? (index + 1) % team.members.length
                  : e.key === 'ArrowLeft'
                    ? (index - 1 + team.members.length) % team.members.length
                    : e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? team.members.length - 1
                        : null
              if (next !== null) {
                e.preventDefault()
                setSelected(team.members[next].id)
                refs.current[next]?.focus()
              }
            }}
          >
            <MemberThumbnail member={entry} />
            <span>{prettyName(entry.pokemon)}</span>
          </button>
        ))}
      </div>
      {team.members.map((entry) => (
        <div
          key={entry.id}
          id={`member-panel-${entry.id}`}
          role="tabpanel"
          aria-labelledby={`member-tab-${entry.id}`}
          hidden={entry.id !== member.id}
          tabIndex={0}
        >
          {entry.id === member.id && (
            <TeamMemberEditor
              member={entry}
              competitiveFormat={team.competitiveFormat}
              onFormatChange={(competitiveFormat) => onChange({ ...team, competitiveFormat })}
              onChange={(next) =>
                onChange({ ...team, members: team.members.map((v) => (v.id === next.id ? next : v)) })
              }
              onRemove={() => {
                const index = team.members.findIndex((v) => v.id === entry.id)
                const remaining = team.members.filter((v) => v.id !== entry.id)
                setSelected(remaining[Math.min(index, remaining.length - 1)]?.id)
                onChange({ ...team, members: remaining })
                requestAnimationFrame(() => refs.current[Math.min(index, remaining.length - 1)]?.focus())
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
