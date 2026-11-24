import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RotateCcw, Swords, UserRound } from 'lucide-react'
import type { BattleArena } from '../components/battle/BattleArena'
import { SelectMenu } from '../components/SelectMenu'
import { NotebookSection } from '../components/NotebookSection'
import { PageHeader } from '../components/PageHeader'
import { BATTLE_DIFFICULTIES, type BattleDifficulty } from '../config/app'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { pokemonHomeSprite, prettyName } from '../lib/api'
import type { BattleState } from '../lib/battle'
import { readTeams } from '../lib/team-storage'
import { isBattleReadyTeam, parseTeamPokemon, type TeamMember } from '../lib/teams'

type ScreenState =
  { kind: 'idle' | 'loading' | 'error' } | { kind: 'battle'; Arena: typeof BattleArena; initialState: BattleState }

function BattleTeamOption({ name, members }: { name: string; members: TeamMember[] }) {
  return (
    <span className="battle-team-option">
      <span className="battle-team-option-name">{name}</span>
      <span className="battle-team-option-roster">
        {members.map((member) => (
          <BattleTeamPreviewMember key={member.id} member={member} />
        ))}
      </span>
    </span>
  )
}

function BattleTeamPreviewMember({ member }: { member: TeamMember }) {
  const { data } = useApi(`pokemon/${member.pokemon}`, parseTeamPokemon)
  const sprite = data
    ? ((member.shiny ? data.homeShinySprite : data.homeSprite) ?? pokemonHomeSprite(data.id, member.shiny))
    : null
  return (
    <span className="battle-team-preview-member">
      {sprite ? (
        <img src={sprite} alt={prettyName(member.pokemon)} width={48} height={48} />
      ) : (
        <span role="img" aria-label={prettyName(member.pokemon)} />
      )}
    </span>
  )
}

export function BattlePage() {
  const { t } = useLanguage()
  const teams = readTeams().filter(isBattleReadyTeam)
  const [difficulty, setDifficulty] = useState<BattleDifficulty>('medium')
  const [searchParams] = useSearchParams()
  const [selectedTeam, setSelectedTeam] = useState(
    () => teams.find((team) => team.id === searchParams.get('team'))?.id ?? teams[0]?.id ?? '',
  )
  const selectedTeamMembers = teams.find((team) => team.id === selectedTeam)?.members ?? []
  const [screen, setScreen] = useState<ScreenState>({ kind: 'idle' })
  const requestRef = useRef<AbortController | null>(null)
  useEffect(() => () => requestRef.current?.abort(), [])

  const startBattle = async () => {
    const team = teams.find((entry) => entry.id === selectedTeam)
    if (!team || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setScreen({ kind: 'loading' })
    try {
      const [{ BattleArena }, initialState] = await Promise.all([
        import('../components/battle/BattleArena'),
        import('../lib/prepare-battle').then(({ prepareBattle }) =>
          prepareBattle(team, t('battle.opponentTeam'), controller.signal),
        ),
      ])
      if (!controller.signal.aborted) setScreen({ kind: 'battle', Arena: BattleArena, initialState })
    } catch {
      if (!controller.signal.aborted) {
        controller.abort()
        setScreen({ kind: 'error' })
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const returnToLobby = () => setScreen({ kind: 'idle' })

  return (
    <section className="page content-width battle-page">
      <PageHeader
        eyebrow={<Swords size={18} />}
        title={t('battle.title')}
        description={t('battle.description')}
        aside={
          screen.kind === 'battle' ? (
            <button className="button secondary" onClick={returnToLobby}>
              <RotateCcw size={18} aria-hidden="true" /> {t('battle.newBattle')}
            </button>
          ) : undefined
        }
      />

      {screen.kind === 'battle' ? (
        <screen.Arena initialState={screen.initialState} difficulty={difficulty} onExit={returnToLobby} />
      ) : (
        <NotebookSection
          index={1}
          className="battle-lobby"
          title={t('battle.chooseTeam')}
          actions={<span className="eyebrow">{t('battle.format')}</span>}
          description={t('battle.chooseTeamDescription')}
        >
          {teams.length ? (
            <div className="battle-lobby-actions">
              <SelectMenu
                className="battle-team-select"
                icon={<UserRound size={16} />}
                label={t('battle.yourTeam')}
                value={selectedTeam}
                onChange={setSelectedTeam}
                options={teams.map((team) => ({ value: team.id, label: team.name }))}
                renderSelected={(option) => (
                  <span className="battle-team-selected">
                    <small>{t('battle.yourTeam')}</small>
                    <BattleTeamOption name={option.label} members={selectedTeamMembers} />
                  </span>
                )}
                renderOption={(option) => (
                  <BattleTeamOption
                    name={option.label}
                    members={teams.find((team) => team.id === option.value)?.members ?? []}
                  />
                )}
              />
              <label>
                {t('battle.difficulty')}
                <select
                  value={difficulty}
                  disabled={screen.kind === 'loading'}
                  aria-describedby="battle-difficulty-help"
                  onChange={(event) => {
                    const value = BATTLE_DIFFICULTIES.find((entry) => entry === event.target.value)
                    if (value) setDifficulty(value)
                  }}
                >
                  {BATTLE_DIFFICULTIES.map((value) => (
                    <option key={value} value={value}>
                      {t(`battle.difficulty.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <p id="battle-difficulty-help">{t(`battle.difficulty.${difficulty}.description`)}</p>
              <button className="button primary" onClick={startBattle} disabled={screen.kind === 'loading'}>
                <Swords size={18} aria-hidden="true" />
                {screen.kind === 'loading' ? t('battle.loading') : t('battle.start')}
              </button>
            </div>
          ) : (
            <div className="battle-empty">
              <p>{t('battle.noTeams')}</p>
              <Link className="button primary" to="/teams">
                {t('battle.openTeams')}
              </Link>
            </div>
          )}
          {screen.kind === 'loading' && (
            <p role="status" aria-live="polite">
              {t('battle.loadingDescription')}
            </p>
          )}
          {screen.kind === 'error' && (
            <div role="alert" className="battle-error">
              <p>{t('battle.loadError')}</p>
              <button className="button secondary" onClick={startBattle}>
                {t('common.retry')}
              </button>
            </div>
          )}
        </NotebookSection>
      )}
    </section>
  )
}

export default BattlePage
