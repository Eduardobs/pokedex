import { useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { TEAM_IMPORT_MAX_BYTES, TEAM_LIMITS, STORAGE_KEYS } from '../config/app'
import { readStorage, writeStorage } from '../lib/storage'
import { newMember, parseTeamPokemon, validTeams, type Team } from '../lib/teams'
import { createTeamExport, importTeam, parseTeamExport } from '../lib/team-transfer'
import { prettyName } from '../lib/api'
import { moveIdentifier } from '../lib/move-comparison'
import { array, record, reference } from '../lib/resource-data'
import { PageHeader } from '../components/PageHeader'
import { SearchField } from '../components/SearchField'
import { SelectMenu } from '../components/SelectMenu'
import { TeamTabs } from '../components/TeamTabs'
import { ApiFeedback } from '../components/TeamMemberEditor'

export function TeamsPage() {
  const { t } = useLanguage()
  const [teams, setTeams] = useState(() => readStorage<Team[]>(STORAGE_KEYS.teams, validTeams, []))
  const [selected, setSelected] = useState(teams[0]?.id ?? '')
  const [saved, setSaved] = useState<boolean | null>(null)
  const [transferMessage, setTransferMessage] = useState<
    'exported' | 'imported' | 'importError' | 'importTooLarge' | 'importLimit' | null
  >(null)
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const team = teams.find((v) => v.id === selected)
  useEffect(() => {
    if (deleteConfirmationOpen) cancelDeleteButtonRef.current?.focus()
  }, [deleteConfirmationOpen])
  const update = (next: Team[]) => {
    setTeams(next)
    setSaved(writeStorage(STORAGE_KEYS.teams, next))
  }
  const change = (next: Team) => update(teams.map((v) => (v.id === next.id ? next : v)))
  const create = () => {
    const next: Team = {
      id: crypto.randomUUID(),
      name: t('teams.defaultName', { number: teams.length + 1 }),
      members: [],
      competitiveFormat: 'unrestricted',
    }
    update([...teams, next])
    setSelected(next.id)
  }
  const deleteTeam = () => {
    if (!team) return
    const next = teams.filter((value) => value.id !== team.id)
    update(next)
    setSelected(next[0]?.id ?? '')
    setDeleteConfirmationOpen(false)
  }
  const closeDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false)
    deleteButtonRef.current?.focus()
  }
  const exportTeam = () => {
    if (!team) return
    const file = new Blob([JSON.stringify(createTeamExport(team), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    const filename = team.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    link.href = url
    link.download = `atlas-team-${filename || 'team'}.json`
    link.click()
    URL.revokeObjectURL(url)
    setTransferMessage('exported')
  }
  const importFile = (file: File) => {
    if (file.size > TEAM_IMPORT_MAX_BYTES) {
      setTransferMessage('importTooLarge')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setTransferMessage('importError')
    reader.onload = () => {
      try {
        const parsed = parseTeamExport(JSON.parse(String(reader.result)))
        if (!parsed) throw new Error('Invalid team export')
        const next = importTeam(parsed)
        update([...teams, next])
        setSelected(next.id)
        setTransferMessage('imported')
      } catch {
        setTransferMessage('importError')
      }
    }
    reader.readAsText(file)
  }
  const selectImportFile = () => {
    if (teams.length >= TEAM_LIMITS.teams) {
      setTransferMessage('importLimit')
      return
    }
    importInputRef.current?.click()
  }
  return (
    <section className="page content-width teams-page">
      <PageHeader
        eyebrow={<Users size={18} />}
        title={t('teams.title')}
        description={t('teams.description')}
        aside={
          <div className="team-page-actions">
            <button className="button secondary" onClick={exportTeam} disabled={!team}>
              {t('teams.export')}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              aria-label={t('teams.importFile')}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) importFile(file)
              }}
            />
            <button className="button secondary" onClick={selectImportFile}>
              {t('teams.import')}
            </button>
            <button className="button primary" onClick={create} disabled={teams.length >= TEAM_LIMITS.teams}>
              {t('teams.create')}
            </button>
          </div>
        }
      />
      {transferMessage && (
        <p role={transferMessage === 'exported' || transferMessage === 'imported' ? 'status' : 'alert'}>
          {t(
            (
              {
                exported: 'teams.exported',
                imported: 'teams.imported',
                importError: 'teams.importError',
                importTooLarge: 'teams.importTooLarge',
                importLimit: 'teams.importLimit',
              } as const
            )[transferMessage],
          )}
        </p>
      )}
      <p role={saved === false ? 'alert' : 'status'}>
        {saved === false ? t('teams.saveError') : saved ? t('teams.saved') : t('teams.local')}
      </p>
      {saved === false && (
        <button className="button secondary" onClick={() => setSaved(writeStorage(STORAGE_KEYS.teams, teams))}>
          {t('common.retry')}
        </button>
      )}
      {!teams.length && (
        <div className="empty">
          <Users size={36} />
          <h2>{t('teams.empty')}</h2>
          <p>{t('teams.description')}</p>
        </div>
      )}
      {team && (
        <div key={team.id}>
          <div className="team-toolbar">
            <SelectMenu
              icon={<Users size={18} />}
              label={t('teams.select')}
              value={selected}
              options={teams.map((v) => ({ value: v.id, label: v.name }))}
              onChange={setSelected}
            />
            <label>
              {t('teams.name')}
              <input maxLength={80} value={team.name} onChange={(e) => change({ ...team, name: e.target.value })} />
            </label>
            <button ref={deleteButtonRef} className="button secondary" onClick={() => setDeleteConfirmationOpen(true)}>
              {t('teams.delete')}
            </button>
            <strong>{team.members.length} / 6</strong>
          </div>
          {team.members.length < TEAM_LIMITS.members ? (
            <PokemonAdder
              onAdd={(pokemon) => {
                if (team.members.length < TEAM_LIMITS.members)
                  change({ ...team, members: [...team.members, newMember(pokemon)] })
              }}
            />
          ) : (
            <p role="status">{t('teams.full')}</p>
          )}
          {!team.members.length && <p>{t('teams.addHint')}</p>}
          <TeamTabs team={team} onChange={change} />
        </div>
      )}
      {deleteConfirmationOpen && team && (
        <div
          className="team-delete-confirmation"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-team-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeDeleteConfirmation()
          }}
        >
          <div className="team-delete-confirmation-content">
            <h2 id="delete-team-title">{t('teams.deleteConfirmationTitle')}</h2>
            <p>{t('teams.deleteConfirmationDescription', { name: team.name })}</p>
            <div className="team-delete-confirmation-actions">
              <button ref={cancelDeleteButtonRef} className="button secondary" onClick={closeDeleteConfirmation}>
                {t('teams.cancelDelete')}
              </button>
              <button className="button primary" onClick={deleteTeam}>
                {t('teams.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
function PokemonAdder({ onAdd }: { onAdd: (pokemon: ReturnType<typeof parseTeamPokemon>) => void }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const directory = useApi('pokemon?limit=2000', (value) =>
    array(record(value).results)
      .map(reference)
      .filter((v) => v !== null),
  )
  const pokemon = useApi(selected ? `pokemon/${selected}` : null, parseTeamPokemon)
  const candidates = query.trim()
    ? directory.data
        ?.filter(
          (v) =>
            v.name.includes(query.trim().toLowerCase()) || v.url.split('/').filter(Boolean).at(-1) === query.trim(),
        )
        .slice(0, 12)
    : []
  return (
    <div className="team-adder">
      <h2>{t('teams.add')}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const value = moveIdentifier(query)
          if (value) setSelected(value)
        }}
      >
        <SearchField
          value={query}
          onChange={setQuery}
          clearLabel={t('common.clear')}
          aria-label={t('teams.search')}
          placeholder={t('teams.search')}
          maxLength={100}
        />
        <button className="button secondary" type="submit" disabled={!moveIdentifier(query)}>
          {t('teams.find')}
        </button>
      </form>
      <ApiFeedback state={directory} />
      {query && directory.data && !candidates?.length && <p>{t('teams.noResults')}</p>}
      <div className="team-suggestions">
        {candidates?.map((v) => (
          <button className="button secondary" key={v.name} onClick={() => setSelected(v.name)}>
            {prettyName(v.name)}
          </button>
        ))}
      </div>
      <ApiFeedback state={pokemon} />
      {pokemon.data && (
        <button
          className="button primary"
          onClick={() => {
            onAdd(pokemon.data!)
            setSelected('')
            setQuery('')
          }}
        >
          {t('teams.addPokemon', { name: prettyName(pokemon.data.name) })}
        </button>
      )}
    </div>
  )
}
