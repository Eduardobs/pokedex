import { useRef, useState, type DragEvent } from 'react'
import { useApi } from '../hooks/useApi'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber, pokemonHomeSprite, prettyName } from '../lib/api'
import { parseTeamPokemon, type Team, type TeamMember } from '../lib/teams'
import { TeamMemberEditor } from './TeamMemberEditor'

type DropIndicator = { id: string; placement: 'before' | 'after' }

function MemberThumbnail({ member }: { member: TeamMember }) {
  const { data } = useApi(`pokemon/${member.pokemon}`, parseTeamPokemon)
  const sprite = data
    ? ((member.shiny ? data.homeShinySprite : data.homeSprite) ?? pokemonHomeSprite(data.id, member.shiny))
    : null
  return <span className="team-tab-art">{sprite && <img src={sprite} alt="" width={56} height={56} />}</span>
}
export function TeamTabs({ team, onChange }: { team: Team; onChange: (team: Team) => void }) {
  const { language, t } = useLanguage()
  const [selected, setSelected] = useState(team.members[0]?.id)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const [reorderMessage, setReorderMessage] = useState('')
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const member = team.members.find((v) => v.id === selected) ?? team.members[0]
  const reorder = (id: string, destination: number) => {
    const source = team.members.findIndex((entry) => entry.id === id)
    if (source < 0 || source === destination) return
    const members = [...team.members]
    const [moved] = members.splice(source, 1)
    members.splice(destination, 0, moved)
    onChange({ ...team, members })
    setReorderMessage(
      t('teams.memberReordered', {
        name: prettyName(moved.pokemon),
        position: formatNumber(destination + 1, language),
      }),
    )
  }
  const selectFromClick = (id: string) => {
    if (id === member?.id) return
    const scrollY = window.scrollY
    setSelected(id)
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }))
  }
  const dropPlacement = (event: DragEvent<HTMLButtonElement>) => {
    const target = event.currentTarget.getBoundingClientRect()
    return event.clientX > target.left + target.width / 2 ? 'after' : 'before'
  }
  if (!member) return null
  return (
    <div className="team-roster">
      <span id="team-tab-reorder-hint" className="sr-only">
        {t('teams.reorderMemberHint')}
      </span>
      <p className="sr-only" role="status" aria-live="polite">
        {reorderMessage}
      </p>
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
            aria-describedby="team-tab-reorder-hint"
            aria-selected={member.id === entry.id}
            aria-keyshortcuts="Alt+Shift+ArrowLeft Alt+Shift+ArrowRight"
            tabIndex={member.id === entry.id ? 0 : -1}
            data-dragging={draggedId === entry.id || undefined}
            data-drop-position={dropIndicator?.id === entry.id ? dropIndicator.placement : undefined}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', entry.id)
              setDraggedId(entry.id)
              setDropIndicator(null)
            }}
            onDragOver={(event) => {
              if (!draggedId || draggedId === entry.id) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropIndicator({ id: entry.id, placement: dropPlacement(event) })
            }}
            onDrop={(event) => {
              event.preventDefault()
              const id = event.dataTransfer.getData('text/plain') || draggedId
              const source = team.members.findIndex((member) => member.id === id)
              const insertion = index + (dropPlacement(event) === 'after' ? 1 : 0)
              const destination = source < insertion ? insertion - 1 : insertion
              if (id && source >= 0) reorder(id, destination)
              setDraggedId(null)
              setDropIndicator(null)
            }}
            onDragEnd={() => {
              setDraggedId(null)
              setDropIndicator(null)
            }}
            onClick={() => selectFromClick(entry.id)}
            onKeyDown={(e) => {
              if (e.altKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                const destination = e.key === 'ArrowLeft' ? index - 1 : index + 1
                if (destination >= 0 && destination < team.members.length) {
                  e.preventDefault()
                  reorder(entry.id, destination)
                  requestAnimationFrame(() => refs.current[destination]?.focus())
                }
                return
              }
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
