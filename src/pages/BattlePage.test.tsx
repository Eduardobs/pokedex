import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { BATTLE_TIMING, STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { clearApiCache } from '../lib/api-client'
import { createBattlePokemon, createBattleState, type BattleMove } from '../lib/battle'
import * as battleData from '../lib/battle-data'
import * as randomTeam from '../lib/random-team'
import type { Team } from '../lib/teams'
import { BattleFieldEffects, BattlePage, BattleSideHazards, MajorStatusBadge } from './BattlePage'

const completeTeam = (id: string, name: string): Team => ({
  id,
  name,
  competitiveFormat: 'singles-6v6',
  members: Array.from({ length: 6 }, (_, index) => ({
    id: `${id}-member-${index}`,
    pokemon: `pokemon-${index}`,
    level: 100,
    friendship: 255,
    shiny: false,
    gender: 'male',
    tera: 'normal',
    ability: 'run-away',
    nature: 'hardy',
    item: 'leftovers',
    moves: ['tackle', 'quick-attack', 'recover', 'growl'],
    evs: [0, 0, 0, 0, 0, 0],
    ivs: [31, 31, 31, 31, 31, 31],
    abilityActive: false,
    itemActive: false,
  })),
})

function show() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <BattlePage />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

const testMove = (name: string, type: BattleMove['type'] = 'normal'): BattleMove => ({
  name,
  type,
  damageClass: name === 'recover' || name === 'growl' ? 'status' : 'physical',
  power: name === 'recover' || name === 'growl' ? null : 80,
  accuracy: 100,
  priority: 0,
  pp: 20,
  target: name === 'recover' ? 'user' : 'selected-pokemon',
  healing: name === 'recover' ? 50 : 0,
  drain: 0,
  ailment: null,
  ailmentChance: 0,
  effectChance: null,
  statChanges: name === 'growl' ? [{ stat: 'attack', change: -1 }] : [],
  descriptions: [{ language: 'pt-br', text: `${name} em detalhes.` }],
})

const battleRoster = (
  team: Team,
  {
    pokemonTypes = ['normal'],
    moveTypes = ['normal', 'normal', 'normal', 'normal'],
    pokemonStats = [100, 100, 100, 100, 100, 100],
  }: {
    pokemonTypes?: BattleMove['type'][]
    moveTypes?: BattleMove['type'][]
    pokemonStats?: [number, number, number, number, number, number]
  } = {},
) =>
  team.members.map((member, index) =>
    createBattlePokemon(
      member,
      {
        id: index + 1,
        name: member.pokemon,
        species: member.pokemon,
        stats: pokemonStats,
        types: pokemonTypes,
        abilities: [member.ability],
        moves: member.moves,
        homeSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index + 1}.png`,
        showdownFrontSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${index + 1}.gif`,
        showdownBackSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${index + 1}.gif`,
      },
      [
        testMove('tackle', moveTypes[0]),
        testMove('quick-attack', moveTypes[1]),
        testMove('recover', moveTypes[2]),
        testMove('growl', moveTypes[3]),
      ],
      {
        ability: {
          name: member.ability,
          names: [
            {
              name: member.ability === 'huge-power' ? 'Potência Enorme' : 'Fuga',
              language: { name: 'pt-br' },
            },
          ],
          descriptions: [
            {
              effect: member.ability === 'huge-power' ? 'Duplica o Ataque.' : 'Permite fugir.',
              language: { name: 'pt-br' },
            },
          ],
          sprite: null,
        },
        item: {
          name: 'leftovers',
          names: [{ name: 'Restos', language: { name: 'pt-br' } }],
          descriptions: [{ effect: 'Recupera HP a cada turno.', language: { name: 'pt-br' } }],
          sprite: null,
        },
      },
    ),
  )

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  clearApiCache()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('BattlePage lobby', () => {
  it('uses the supplied icon and color treatment for each major status', () => {
    render(
      <LanguageProvider>
        <>
          <MajorStatusBadge status="paralysis" />
          <MajorStatusBadge status="sleep" />
          <MajorStatusBadge status="freeze" />
          <MajorStatusBadge status="burn" />
          <MajorStatusBadge status="poison" />
          <MajorStatusBadge status="badly-poisoned" />
        </>
      </LanguageProvider>,
    )

    expect(screen.getByLabelText('Paralisia')).toHaveClass('battle-major-status--paralysis')
    expect(screen.getByLabelText('Sono')).toHaveClass('battle-major-status--sleep')
    expect(screen.getByLabelText('Congelamento')).toHaveClass('battle-major-status--freeze')
    expect(screen.getByLabelText('Queimadura')).toHaveClass('battle-major-status--burn')
    const poisoned = screen.getAllByLabelText('Envenenamento')
    expect(poisoned[0]).toHaveClass('battle-major-status--poison')
    expect(poisoned[1]).toHaveClass('battle-major-status--badly-poisoned')
    expect(screen.getByLabelText('Sono').querySelector('.battle-major-status-sleep-icon')).toBeInTheDocument()
  })

  it('shows hazards only on the side where they remain active', () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    const state = createBattleState(player, battleRoster(player), opponent, battleRoster(opponent))
    state.player.hazards = { stealthRock: true, spikes: 2, toxicSpikes: 1, stickyWeb: true }

    const { rerender } = render(
      <LanguageProvider>
        <BattleSideHazards hazards={state.player.hazards} side="player" />
      </LanguageProvider>,
    )

    const hazards = screen.getByRole('group', { name: 'Armadilhas no seu lado' })
    expect(within(hazards).getByLabelText('Pedras Pontiagudas')).toBeVisible()
    expect(within(hazards).getByLabelText('Espinhos ×2')).toBeVisible()
    expect(within(hazards).getByLabelText('Espinhos Tóxicos')).toBeVisible()
    expect(within(hazards).getByLabelText('Teia Pegajosa')).toBeVisible()

    rerender(
      <LanguageProvider>
        <BattleSideHazards
          hazards={{ stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false }}
          side="player"
        />
      </LanguageProvider>,
    )

    expect(screen.queryByRole('group', { name: 'Armadilhas no seu lado' })).not.toBeInTheDocument()
  })

  it('shows weather turns while keeping other active-condition durations hidden', () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    const state = createBattleState(player, battleRoster(player), opponent, battleRoster(opponent))
    state.field.weather = 'rain'
    state.field.weatherTurns = 3
    state.field.terrain = 'grassy'
    state.field.terrainTurns = 2
    state.field.trickRoomTurns = 1
    state.opponent.futureSight = {
      turns: 2,
      attacker: state.player.roster[0],
      move: state.player.roster[0].moves[0].data,
    }
    state.player.conditions.reflect = 4
    state.opponent.conditions.tailwind = 2

    render(
      <LanguageProvider>
        <BattleFieldEffects field={state.field} player={state.player} opponent={state.opponent} />
      </LanguageProvider>,
    )

    const effects = screen.getByRole('group', { name: 'Efeitos ativos no campo de batalha' })
    expect(within(effects).getByText('Future Sight · 2 turnos restantes · lado adversário')).toBeVisible()
    expect(within(effects).getByText('Chuva · 3 turnos restantes')).toBeVisible()
    expect(within(effects).getByText('Campo de Grama')).toBeVisible()
    expect(within(effects).getByText('Trick Room')).toBeVisible()
    expect(within(effects).getByText('Reflect · seu lado')).toBeVisible()
    expect(within(effects).getByText('Tailwind · lado adversário')).toBeVisible()
    expect(within(effects).queryByText('Campo de Grama · 2 turnos restantes')).not.toBeInTheDocument()
    expect(within(effects).queryByText('Trick Room · 1 turnos restantes')).not.toBeInTheDocument()
    expect(within(effects).queryByText('Reflect · seu lado · 4 turnos restantes')).not.toBeInTheDocument()
  })

  it('guides the user to the team builder when no complete team is available', () => {
    show()
    expect(screen.getByRole('heading', { name: 'Batalha' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Criar uma equipe' })).toHaveAttribute('href', '/teams')
    expect(screen.queryByRole('button', { name: 'Iniciar batalha' })).not.toBeInTheDocument()
  })

  it('lists only complete teams and exposes a retryable loading error', async () => {
    const complete = completeTeam('complete', 'Equipe completa')
    const incomplete = { ...completeTeam('incomplete', 'Equipe incompleta'), members: complete.members.slice(0, 5) }
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([complete, incomplete]))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    show()
    expect(screen.getByRole('option', { name: 'Equipe completa' })).toBeVisible()
    expect(screen.queryByRole('option', { name: 'Equipe incompleta' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    expect(screen.getByRole('status')).toHaveTextContent('Gerando a equipe adversária')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível preparar a batalha'))
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled()
  })

  it('starts a battle and supports Terastallization, moves, switching, and returning to the lobby', async () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    player.members[0].gender = 'male'
    player.members[1].ability = 'huge-power'
    opponent.members[0].gender = 'female'
    opponent.members[0].level = 50
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => {
      const loaded = battleRoster(
        team,
        team.id === opponent.id ? { pokemonStats: [200, 100, 200, 100, 100, 100] } : undefined,
      )
      if (team.id === opponent.id) {
        loaded.forEach((pokemon) => {
          pokemon.moves.forEach((move) => {
            move.data = testMove('growl')
          })
        })
      } else {
        loaded[0].moves[1].data.priority = 1
        loaded[0].moves[2].data.priority = -1
      }
      return loaded
    })

    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    expect(await screen.findByRole('heading', { name: 'O que Pokemon 0 fará?' })).toBeVisible()
    const actionPanel = screen.getByRole('heading', { name: 'O que Pokemon 0 fará?' }).closest('.battle-actions')
    const battleLog = screen.getByLabelText('Registro da batalha')
    expect(actionPanel).not.toBeNull()
    expect(actionPanel!.compareDocumentPosition(battleLog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(battleLog).toHaveAttribute('tabindex', '0')
    Object.defineProperty(battleLog, 'scrollHeight', { configurable: true, value: 560 })
    expect(screen.getAllByRole('meter', { name: 'Pontos de vida de Pokemon 0' })[0]).toHaveAttribute('aria-valuenow')
    expect(screen.getAllByText('Nº 1')).toHaveLength(2)
    expect(screen.queryByText('Saudável')).not.toBeInTheDocument()
    expect(screen.queryByText('Ataque 0')).not.toBeInTheDocument()
    const battleField = screen.getByLabelText('Campo de batalha')
    expect(within(battleField).queryByLabelText('Equipe de Minha equipe')).not.toBeInTheDocument()
    expect(within(battleField).queryByLabelText('Equipe de Equipe adversária')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Equipe de Minha equipe')).toBeVisible()
    expect(screen.getByLabelText('Equipe de Equipe adversária')).toBeVisible()
    const activePokemonTriggers = screen.getAllByLabelText('Detalhes de Pokemon 0')
    const playerInformationCard = activePokemonTriggers[1]
      .closest('article')
      ?.querySelector<HTMLElement>('.battle-health')
    expect(playerInformationCard).not.toBeNull()
    expect(within(playerInformationCard!).getByText('100% HP')).toBeVisible()
    expect(within(playerInformationCard!).queryByText('Tipos')).not.toBeInTheDocument()
    expect(screen.getByRole('log', { name: /./ })).toHaveAttribute('tabindex', '0')
    expect(within(playerInformationCard!).getByLabelText('Normal')).toBeVisible()
    expect(activePokemonTriggers[1].closest('.battle-pokemon-visual')?.querySelector('.battle-active-types')).toBeNull()
    const activeTooltips = activePokemonTriggers.map((active) => within(active).getByRole('tooltip'))
    expect(activeTooltips[0]).toHaveTextContent('Velocidade possível')
    expect(activeTooltips[0]).toHaveTextContent('Spe')
    expect(activeTooltips[0]).toHaveTextContent('94–167')
    expect(activeTooltips[0]).not.toHaveTextContent('HP')
    expect(activeTooltips[0]).not.toHaveTextContent('Atk')
    expect(activeTooltips[0]).toHaveTextContent('Habilidades possíveis')
    expect(activeTooltips[0]).not.toHaveTextContent('Golpes utilizados')
    expect(within(activeTooltips[0]).getByRole('img', { name: 'Gênero: Feminino' })).toBeVisible()
    expect(activeTooltips[1]).toHaveTextContent('Atributos atuais')
    expect(activeTooltips[1]).toHaveTextContent('HP')
    expect(activeTooltips[1]).toHaveTextContent('341')
    expect(activeTooltips[1]).toHaveTextContent('Atk')
    expect(activeTooltips[1]).toHaveTextContent('Def')
    expect(activeTooltips[1]).toHaveTextContent('SpA')
    expect(activeTooltips[1]).toHaveTextContent('SpD')
    expect(activeTooltips[1]).toHaveTextContent('Spe')
    expect(activeTooltips[1]).not.toHaveTextContent('Ataque')
    expect(activeTooltips[1]).toHaveTextContent('Fuga')
    expect(activeTooltips[1]).toHaveTextContent('Permite fugir.')
    expect(activeTooltips[1]).toHaveTextContent('Restos')
    expect(activeTooltips[1]).toHaveTextContent('Recupera HP a cada turno.')
    expect(within(activeTooltips[1]).getByRole('img', { name: 'Gênero: Masculino' })).toBeVisible()
    expect(screen.getAllByRole('img', { name: 'Gênero: Feminino' })).toHaveLength(2)
    expect(screen.getAllByRole('img', { name: 'Gênero: Masculino' })).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getAllByLabelText(/ainda não entrou em batalha/)).toHaveLength(10)
    expect(screen.getAllByLabelText(/já entrou em batalha/)).toHaveLength(2)
    const playerSprite = screen
      .getAllByRole('img', { name: 'Pokemon 0' })
      .find((image) => image.getAttribute('src')?.includes('/back/1.gif'))
    expect(playerSprite).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/1.gif',
    )
    const allyTrigger = activePokemonTriggers[1]
    const allyTooltip = activeTooltips[1]
    fireEvent.focus(allyTrigger)
    expect(allyTooltip).toHaveClass('is-pointer-positioned')
    fireEvent.blur(allyTrigger)
    expect(allyTooltip).not.toHaveClass('is-pointer-positioned')
    fireEvent.pointerMove(allyTrigger.closest('article')!, { clientX: 200, clientY: 220 })
    expect(allyTooltip).not.toHaveClass('is-pointer-positioned')
    fireEvent.pointerMove(allyTrigger, { clientX: 200, clientY: 220 })
    expect(allyTooltip).toHaveClass('is-pointer-positioned')
    expect(allyTooltip).toHaveStyle({ left: '210px', top: '230px', right: 'auto', bottom: 'auto' })
    fireEvent.pointerMove(allyTrigger, { clientX: 200, clientY: 120 })
    expect(allyTooltip).toHaveStyle({ left: '210px', top: '130px', right: 'auto', bottom: 'auto' })
    fireEvent.pointerLeave(allyTrigger)
    expect(allyTooltip).not.toHaveClass('is-pointer-positioned')

    const tackle = screen.getByRole('button', { name: /Tackle/ })
    expect(tackle.querySelector('.battle-move-meta')).toHaveTextContent('PP 20/20Prioridade: 0')
    expect(screen.getByRole('button', { name: /Quick Attack/ }).querySelector('.battle-move-meta')).toHaveTextContent(
      'Prioridade: 1',
    )
    expect(screen.getByRole('button', { name: /Recover/ }).querySelector('.battle-move-meta')).toHaveTextContent(
      'Prioridade: -1',
    )
    fireEvent.mouseOver(tackle)
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('Poder: 80')
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('Prioridade: 0')
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('Efetividade: Dano normal')
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('tackle em detalhes.')
    const moveTooltip = within(tackle).getByRole('tooltip')
    fireEvent.pointerMove(tackle, { clientX: 120, clientY: 140 })
    expect(moveTooltip).toHaveClass('is-pointer-positioned')
    expect(moveTooltip).toHaveStyle({ left: '130px', top: '150px' })
    fireEvent.pointerLeave(tackle)
    expect(moveTooltip).not.toHaveClass('is-pointer-positioned')
    expect(moveTooltip).not.toHaveStyle({ left: '130px', top: '150px' })

    fireEvent.click(screen.getByRole('button', { name: 'Terastalizar Normal' }))
    const teraButton = screen.getByRole('button', { name: 'Terastalizar Normal' })
    expect(teraButton).toHaveAttribute('aria-pressed', 'true')
    expect(teraButton).toHaveClass('is-selected')
    expect(teraButton.querySelector('.lucide-check')).toBeInTheDocument()
    fireEvent.click(teraButton)
    expect(teraButton).toHaveAttribute('aria-pressed', 'false')
    expect(teraButton).not.toHaveClass('is-selected')
    expect(teraButton.querySelector('.lucide-check')).not.toBeInTheDocument()
    fireEvent.click(teraButton)
    const opponentHealth = screen.getAllByRole('meter', { name: 'Pontos de vida de Pokemon 0' })[0]
    const opponentHealthBefore = Number(opponentHealth.getAttribute('aria-valuenow'))
    battleLog.scrollTop = 0
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: /Tackle/ }))
    expect(screen.getByText('Tackle', { selector: '.battle-move-announcement' })).toBeVisible()
    expect(allyTrigger.querySelector('.battle-sprite-motion')).toHaveClass('is-attacking')
    expect(screen.getByLabelText('Campo de batalha')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: /Tackle/ })).toBeDisabled()
    expect(screen.queryByText(/usou/)).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.actionDelayMs))
    expect(Number(opponentHealth.getAttribute('aria-valuenow'))).toBeLessThan(opponentHealthBefore)
    expect(battleLog.scrollTop).toBe(560)
    expect(screen.queryByText('Growl', { selector: '.battle-move-announcement' })).not.toBeInTheDocument()
    const damageLog = screen.getByText(/perdeu \d+ HP/).closest('.battle-log-event')
    expect(damageLog).toHaveClass('is-damage')
    expect(activePokemonTriggers[0].querySelector('.battle-sprite-motion')).toHaveClass('is-hit')
    expect(allyTrigger.querySelector('.battle-sprite-motion')).not.toHaveClass('is-attacking')
    expect(damageLog).toHaveTextContent(/Pokemon 0 perdeu \d+ HP/)
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.resultDisplayMs))
    expect(screen.getByText('Growl', { selector: '.battle-move-announcement' })).toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.actionDelayMs + BATTLE_TIMING.resultDisplayMs))
    expect(screen.getAllByText(/Terastalizou para o tipo Normal/).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Campo de batalha')).toHaveAttribute('aria-busy', 'false')
    expect(activeTooltips[0]).toHaveTextContent('Golpes utilizados')
    expect(activeTooltips[0]).toHaveTextContent('Growl')
    expect(activeTooltips[0].textContent?.match(/Growl/g)).toHaveLength(1)
    const activeTeraType = playerInformationCard!.querySelector<HTMLElement>('.battle-active-types.is-tera')
    expect(activeTeraType).not.toBeNull()
    expect(within(activeTeraType!).getByText('Tipo Tera')).toBeVisible()
    expect(within(activeTeraType!).getByLabelText('Normal')).toBeVisible()
    expect(activeTeraType!.querySelector('.lucide-sparkles')).toBeInTheDocument()
    expect(screen.getAllByText(/usou/).length).toBeGreaterThan(0)
    const moveLog = screen.getAllByText(/usou/)[0].closest('.battle-log-event')
    expect(moveLog).toHaveClass('is-move')
    expect(moveLog?.querySelector('strong')).toHaveTextContent('Pokemon 0')
    const logMove = moveLog?.querySelector<HTMLElement>('.battle-log-move-trigger')
    expect(logMove).toHaveTextContent('Tackle')
    expect(logMove).toHaveAttribute('tabindex', '0')
    expect(logMove).toHaveAttribute('aria-describedby')
    const logMoveTooltip = within(logMove!).getByRole('tooltip')
    expect(within(logMoveTooltip).getByLabelText('Normal')).toBeVisible()
    expect(within(logMoveTooltip).getByLabelText('Classe: Físico')).toBeVisible()
    expect(logMoveTooltip).toHaveTextContent('Prioridade: 0')
    expect(logMoveTooltip).toHaveTextContent('tackle em detalhes.')
    fireEvent.focus(logMove!)
    expect(logMoveTooltip).toHaveClass('is-pointer-positioned')
    fireEvent.blur(logMove!)
    expect(logMoveTooltip).not.toHaveClass('is-pointer-positioned')
    const modifiedAttack = within(activeTooltips[1]).getByText('Atk').parentElement
    expect(modifiedAttack).toHaveTextContent('157')
    expect(modifiedAttack).toHaveClass('is-decreased')
    expect(modifiedAttack).toHaveAccessibleName('Atk: 157, reduzido do valor original 236')
    expect(screen.queryByRole('button', { name: 'Terastalizar Normal' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Trocar Pokémon'))
    expect(screen.queryByRole('button', { name: /Tackle/ })).not.toBeInTheDocument()
    const replacement = screen.getByRole('button', { name: /Pokemon 1/ })
    expect(replacement.querySelector('.battle-switch-sprite img')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png',
    )
    expect(within(replacement).getByText(/HP · 100%/)).toBeVisible()
    fireEvent.mouseOver(replacement)
    const replacementTooltip = within(replacement).getByRole('tooltip')
    expect(replacementTooltip).toHaveTextContent('Pokemon 1')
    expect(replacementTooltip).toHaveTextContent('Nv. 100')
    expect(within(replacementTooltip).getByRole('img', { name: 'Gênero: Masculino' })).toBeVisible()
    expect(replacementTooltip).toHaveTextContent('Tipo Tera')
    expect(within(replacementTooltip).getAllByText('Normal')).toHaveLength(2)
    expect(replacementTooltip).toHaveTextContent('HP restante')
    expect(replacementTooltip).toHaveTextContent('Atk')
    expect(replacementTooltip).toHaveTextContent('Def')
    expect(replacementTooltip).toHaveTextContent('SpA')
    expect(replacementTooltip).toHaveTextContent('SpD')
    expect(replacementTooltip).toHaveTextContent('Spe')
    expect(replacementTooltip.querySelector('.battle-switch-stats')).not.toHaveTextContent('Ataque')
    expect(replacementTooltip).toHaveTextContent('Habilidade')
    expect(replacementTooltip).toHaveTextContent('Potência Enorme')
    expect(replacementTooltip).toHaveTextContent('Duplica o Ataque.')
    expect(replacementTooltip).toHaveTextContent('Item')
    expect(replacementTooltip).toHaveTextContent('Restos')
    expect(replacementTooltip).toHaveTextContent('Recupera HP a cada turno.')
    const increasedAttack = within(replacementTooltip).getByText('Atk').parentElement
    expect(increasedAttack).toHaveTextContent('472')
    expect(increasedAttack).toHaveClass('is-increased')
    expect(increasedAttack).toHaveAccessibleName('Atk: 472, aumentado do valor original 236')
    expect(replacementTooltip).toHaveTextContent('Tackle')
    const tackleDetails = within(replacementTooltip).getByText('Tackle').closest('.battle-switch-move')
    expect(tackleDetails).not.toBeNull()
    expect(within(tackleDetails as HTMLElement).getByLabelText('Classe: Físico')).toBeVisible()
    expect(within(tackleDetails as HTMLElement).getByLabelText('Normal')).toBeVisible()
    fireEvent.click(replacement)
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.actionDelayMs))
    expect(screen.getByRole('heading', { name: 'O que Pokemon 1 fará?' })).toBeVisible()
    expect(screen.getByRole('log')).toHaveTextContent('Pokemon 1 entrou em campo')
    expect(screen.getByRole('button', { name: 'Terastalizar Normal' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Nova batalha' }))
    expect(screen.getByRole('heading', { name: 'Prepare-se para batalhar' })).toBeVisible()
  })

  it('describes move effectiveness for immune, neutral, and super-effective attacks', async () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) =>
      team.id === opponent.id
        ? battleRoster(team, { pokemonTypes: ['grass', 'steel'] })
        : battleRoster(team, { moveTypes: ['poison', 'flying', 'fighting', 'fire'] }),
    )

    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    await screen.findByRole('heading', { name: 'O que Pokemon 0 fará?' })

    expect(within(screen.getByRole('button', { name: 'Tackle' })).getByRole('tooltip')).toHaveTextContent(
      'Efetividade: Sem efeito',
    )
    expect(within(screen.getByRole('button', { name: 'Quick Attack' })).getByRole('tooltip')).toHaveTextContent(
      'Efetividade: Dano normal',
    )
    expect(within(screen.getByRole('button', { name: 'Recover' })).getByRole('tooltip')).toHaveTextContent(
      'Efetividade: Super efetivo (x2)',
    )
    expect(within(screen.getByRole('button', { name: 'Growl' })).getByRole('tooltip')).toHaveTextContent(
      'Efetividade: Super efetivo (x4)',
    )
  })
})
