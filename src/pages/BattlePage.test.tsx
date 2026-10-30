import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { BATTLE_TIMING, STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { clearApiCache } from '../lib/api-client'
import { createBattlePokemon, createBattleState, type BattleMove } from '../lib/battle'
import * as battleData from '../lib/battle-data'
import * as battleEngine from '../lib/battle'
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

function show(entry = '/battle') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
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
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

describe('BattlePage lobby', () => {
  it.each([
    ['won', 'Você venceu', 'lucide-trophy'],
    ['lost', 'Você perdeu', 'lucide-skull'],
  ] as const)('shows the %s result with its icon above the text', async (phase, title, iconClass) => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    const state = createBattleState(player, battleRoster(player), opponent, battleRoster(opponent))
    state.phase = phase
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => battleRoster(team))
    vi.spyOn(battleEngine, 'createBattleState').mockReturnValue(state)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    const heading = await screen.findByRole('heading', { name: title })
    const icon = heading.previousElementSibling
    expect(icon).toHaveClass(iconClass)
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Batalhar novamente' })).toBeEnabled()
  })

  it.each(['second', 'missing'])('validates the requested team %s before showing difficulty choices', (requested) => {
    localStorage.setItem(
      STORAGE_KEYS.teams,
      JSON.stringify([completeTeam('first', 'Primeira equipe'), completeTeam('second', 'Segunda equipe')]),
    )
    show(`/battle?team=${requested}`)
    expect(screen.getByRole('combobox', { name: 'Sua equipe' })).toHaveTextContent(
      requested === 'second' ? 'Segunda equipe' : 'Primeira equipe',
    )
    expect(within(screen.getByRole('combobox', { name: 'Dificuldade' })).getAllByRole('option')).toHaveLength(6)
  })

  it('offers six ordered difficulties and describes the selected strategy', () => {
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([completeTeam('player', 'Minha equipe')]))
    show()
    const selector = screen.getByRole('combobox', { name: 'Dificuldade' })
    expect(selector).toHaveValue('medium')
    expect(
      within(selector)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Muito fácil', 'Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Especialista'])
    fireEvent.change(selector, { target: { value: 'expert' } })
    expect(selector).toHaveValue('expert')
    expect(selector).toHaveAccessibleDescription(
      'Combina as análises anteriores e considera possíveis trocas para Pokémon já revelados.',
    )
  })

  it('loads HOME thumbnails for the selected saved team', async () => {
    const team = completeTeam('player', 'Minha equipe')
    team.members = team.members.map((member) => ({ ...member, pokemon: 'pikachu' }))
    const otherTeam = { ...team, id: 'other', name: 'Outra equipe' }
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([team, otherTeam]))
    const reference = (name: string, endpoint: string) => ({ name, url: `https://pokeapi.co/api/v2/${endpoint}/1/` })
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            name: 'pikachu',
            id: 25,
            species: reference('pikachu', 'pokemon-species'),
            types: [{ type: reference('electric', 'type') }],
            abilities: [{ ability: reference('static', 'ability') }],
            moves: [],
            sprites: {
              other: {
                home: {
                  front_default:
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/25.png',
                  front_shiny: null,
                },
              },
            },
            stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name) => ({
              stat: reference(name, 'stat'),
              base_stat: 50,
            })),
          }),
        ),
      ),
    )

    show()
    const selector = screen.getByRole('combobox', { name: 'Sua equipe' })
    await waitFor(() => {
      const sprites = within(selector).getAllByRole('img', { name: 'Pikachu' })
      expect(sprites).toHaveLength(6)
      for (const sprite of sprites) {
        expect(sprite).toHaveAttribute('src', expect.stringContaining('/sprites/pokemon/other/home/25.png'))
      }
    })
    fireEvent.click(selector)
    for (const name of ['Minha equipe', 'Outra equipe']) {
      const option = screen.getByRole('option', { name: new RegExp(name) })
      await waitFor(() => {
        const sprites = within(option).getAllByRole('img', { name: 'Pikachu' })
        expect(sprites).toHaveLength(6)
        for (const sprite of sprites) {
          expect(sprite).toHaveAttribute('src', expect.stringContaining('/sprites/pokemon/other/home/25.png'))
        }
      })
    }
    fireEvent.click(screen.getByRole('option', { name: /Outra equipe/ }))
    expect(selector).toHaveTextContent('Outra equipe')
    expect(within(selector).getAllByRole('img', { name: 'Pikachu' })).toHaveLength(6)
    expect(selector).toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

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
    fireEvent.click(screen.getByRole('combobox', { name: 'Sua equipe' }))
    expect(screen.getByRole('option', { name: /Equipe completa/ })).toBeVisible()
    expect(screen.queryByRole('option', { name: /Equipe incompleta/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    expect(screen.getByRole('status')).toHaveTextContent('Gerando a equipe adversária')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível preparar a batalha'))
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled()
  })

  it.each([
    { status: 'sleep' as const, description: 'dormindo', roll: 0.5 },
    { status: 'freeze' as const, description: 'congelado', roll: 0.5 },
    { status: 'paralysis' as const, description: 'paralisado', roll: 0 },
  ])(
    'explains that $status prevented the selected move without announcing its use',
    async ({ status, description, roll }) => {
      const player = completeTeam('player', 'Minha equipe')
      const opponent = completeTeam('opponent', 'Equipe adversária')
      player.members[0].pokemon = 'klefki'
      player.members[0].moves[0] = 'play-rough'
      localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
      vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
      vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
      vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => {
        const roster = battleRoster(team)
        if (team.id === player.id) {
          roster[0].status = status
          roster[0].sleepTurns = 2
          roster[0].moves[0].data = testMove('play-rough', 'fairy')
        }
        return roster
      })
      show()
      fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
      const attack = await screen.findByRole('button', { name: 'Play Rough' })
      vi.spyOn(Math, 'random').mockReturnValue(roll)
      vi.useFakeTimers()
      fireEvent.click(attack)
      await act(() => vi.runAllTimersAsync())
      const log = screen.getByRole('log')
      expect(log).toHaveTextContent(`Klefki está ${description} e não conseguiu usar Play Rough.`)
      expect(log).not.toHaveTextContent('Klefki usou Play Rough.')
    },
  )

  it('offers a reusable Struggle button when every learned move has zero PP', async () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => {
      const roster = battleRoster(team)
      roster.forEach((pokemon) =>
        pokemon.moves.forEach((slot) => {
          slot.pp = 0
        }),
      )
      return roster
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    const fallback = await screen.findByRole('button', { name: 'Struggle' })
    expect(fallback).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Tackle' })).toBeDisabled()
    fallback.focus()
    expect(fallback).toHaveFocus()
    vi.useFakeTimers()
    fireEvent.click(fallback)
    await act(() => vi.runAllTimersAsync())
    expect(screen.getByRole('button', { name: 'Struggle' })).toBeEnabled()
    expect(screen.getAllByText('Struggle').length).toBeGreaterThan(1)
  })

  it('temporarily announces misses over the defender for either side', async () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => {
      const roster = battleRoster(team, { pokemonStats: [100, 100, 100, 100, 100, team.id === player.id ? 200 : 50] })
      roster.forEach((pokemon) =>
        pokemon.moves.forEach((move) => {
          move.data = { ...testMove('tackle'), accuracy: 0 }
        }),
      )
      return roster
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    await screen.findByRole('heading', { name: 'O que Pokemon 0 fará?' })
    vi.useFakeTimers()
    fireEvent.click(screen.getAllByRole('button', { name: 'Tackle' })[0])
    expect(screen.queryByText('Errou')).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.actionDelayMs))
    expect(screen.getByText('Errou').closest('article')).toHaveClass('opponent')
    expect(screen.getByText('Errou')).toHaveAttribute('role', 'status')
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.resultDisplayMs))
    expect(screen.queryByText('Errou')).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.actionDelayMs))
    expect(screen.getByText('Errou').closest('article')).toHaveClass('player')
    await act(() => vi.advanceTimersByTimeAsync(BATTLE_TIMING.resultDisplayMs))
    expect(screen.queryByText('Errou')).not.toBeInTheDocument()
  })

  it('opens mobile move details without choosing a move and restores focus on close', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      },
    })
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => battleRoster(team))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    const details = await screen.findByRole('button', { name: 'Detalhes de Tackle' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.click(details)
    const dialog = screen.getByRole('dialog', { name: 'Detalhes de Tackle' })
    expect(dialog).toHaveTextContent('Poder: 80')
    expect(dialog).toHaveTextContent('tackle em detalhes.')
    expect(screen.getByRole('button', { name: 'Tackle' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar informações' }))
    expect(details).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
      loaded[0].status = team.id === opponent.id ? 'burn' : 'poison'
      if (team.id === opponent.id) {
        loaded[0].stages.specialDefense = -1
        loaded[0].stages.evasion = 1
        loaded.forEach((pokemon) => {
          pokemon.moves.forEach((move) => {
            move.data = testMove('growl')
          })
        })
      } else {
        loaded[0].stages.specialAttack = 2
        loaded[0].stages.accuracy = -1
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
    expect(screen.queryByText('Nº 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Saudável')).not.toBeInTheDocument()
    expect(screen.queryByText('Ataque 0')).not.toBeInTheDocument()
    const battleField = screen.getByLabelText('Campo de batalha')
    expect(within(battleField).queryByLabelText('Equipe de Minha equipe')).not.toBeInTheDocument()
    expect(within(battleField).queryByLabelText('Equipe de Equipe adversária')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Equipe de Minha equipe')).toBeVisible()
    expect(screen.getByLabelText('Equipe de Equipe adversária')).toBeVisible()
    const activePokemonTriggers = screen.getAllByLabelText('Detalhes de Pokemon 0')
    const opponentInformationCard = activePokemonTriggers[0]
      .closest('article')
      ?.querySelector<HTMLElement>('.battle-health')
    const playerInformationCard = activePokemonTriggers[1]
      .closest('article')
      ?.querySelector<HTMLElement>('.battle-health')
    expect(playerInformationCard).not.toBeNull()
    expect(opponentInformationCard).not.toBeNull()
    const opponentInformationHeader = opponentInformationCard!.querySelector<HTMLElement>('.battle-health-copy')
    const playerInformationHeader = playerInformationCard!.querySelector<HTMLElement>('.battle-health-copy')
    expect(opponentInformationHeader).not.toBeNull()
    expect(playerInformationHeader).not.toBeNull()
    expect(opponentInformationHeader!.firstElementChild).toHaveTextContent('Pokemon 0')
    expect(opponentInformationHeader!.lastElementChild).toHaveClass('battle-health-level')
    expect(opponentInformationHeader!.lastElementChild).toHaveTextContent('Nv. 50')
    expect(playerInformationHeader!.firstElementChild).toHaveTextContent('Pokemon 0')
    expect(
      within(playerInformationHeader!.firstElementChild as HTMLElement).getByRole('img', {
        name: 'Gênero: Masculino',
      }),
    ).toBeVisible()
    expect(playerInformationHeader!.lastElementChild).toHaveClass('battle-health-level')
    expect(playerInformationHeader!.lastElementChild).toHaveTextContent('Nv. 100')
    expect(within(playerInformationCard!).getByText('100% HP')).toBeVisible()
    const opponentHealthTrack = opponentInformationCard!.querySelector<HTMLElement>('.battle-health-track')
    const playerHealthTrack = playerInformationCard!.querySelector<HTMLElement>('.battle-health-track')
    expect(opponentHealthTrack).not.toBeNull()
    expect(playerHealthTrack).not.toBeNull()
    expect(within(opponentHealthTrack!).getByText(/\d+ \/ \d+/)).toHaveClass('battle-health-value')
    expect(within(playerHealthTrack!).getByText('341 / 341')).toHaveClass('battle-health-value')
    expect(playerInformationCard!.querySelector('.battle-health-meta .battle-health-value')).toBeNull()
    const opponentModifiers = within(opponentInformationCard!).getByLabelText('Modificadores de atributo')
    const playerModifiers = within(playerInformationCard!).getByLabelText('Modificadores de atributo')
    expect(opponentModifiers).toHaveTextContent('SpD -1')
    expect(opponentModifiers).toHaveTextContent('Eva +1')
    expect(opponentModifiers).not.toHaveTextContent('Defesa Especial')
    expect(playerModifiers).toHaveTextContent('SpA +2')
    expect(playerModifiers).toHaveTextContent('Prec -1')
    expect(playerModifiers).not.toHaveTextContent('Ataque Especial')
    expect(opponentInformationCard!.querySelector('.battle-health-bar')?.nextElementSibling).toBe(opponentModifiers)
    expect(playerInformationCard!.querySelector('.battle-health-bar')?.nextElementSibling).toBe(playerModifiers)
    expect(within(playerInformationCard!).queryByText('Tipos')).not.toBeInTheDocument()
    expect(screen.getByRole('log', { name: /./ })).toHaveAttribute('tabindex', '0')
    expect(within(playerInformationHeader!).getByLabelText('Normal')).toBeVisible()
    expect(playerInformationHeader!.querySelector('.battle-health-identity .battle-active-types')).not.toBeNull()
    expect(activePokemonTriggers[1].closest('.battle-pokemon-visual')?.querySelector('.battle-active-types')).toBeNull()
    const activeTooltips = activePokemonTriggers.map((active) => within(active).getByRole('tooltip'))
    expect(activeTooltips[0]).toHaveTextContent('Velocidade possível')
    expect(activeTooltips[0]).toHaveTextContent('Spe')
    expect(activeTooltips[0]).toHaveTextContent('94–167')
    expect(activeTooltips[0]).not.toHaveTextContent('HP')
    expect(activeTooltips[0]).not.toHaveTextContent('Atk')
    expect(activeTooltips[0]).toHaveTextContent('Habilidades possíveis')
    expect(activeTooltips[0]).not.toHaveTextContent('Tipo original')
    expect(activeTooltips[0]).not.toHaveTextContent('Tipo Tera')
    expect(activeTooltips[0]).toHaveTextContent('Inativo')
    expect(
      activeTooltips[0].querySelector('.battle-active-tooltip-title .battle-tooltip-original-types'),
    ).not.toBeNull()
    expect(activeTooltips[0].querySelector('.battle-active-tooltip-title .battle-tooltip-tera')).not.toBeNull()
    expect(within(activeTooltips[0]).getByLabelText('Queimadura')).toHaveClass('is-compact')
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
    expect(activeTooltips[1]).not.toHaveTextContent('Tipo original')
    expect(activeTooltips[1]).not.toHaveTextContent('Tipo Tera')
    expect(activeTooltips[1]).toHaveTextContent('Inativo')
    expect(
      activeTooltips[1].querySelector('.battle-active-tooltip-title .battle-tooltip-original-types'),
    ).not.toBeNull()
    expect(activeTooltips[1].querySelector('.battle-active-tooltip-title .battle-tooltip-tera')).not.toBeNull()
    expect(within(activeTooltips[1]).getByLabelText('Envenenamento')).toHaveClass('is-compact')
    expect(within(activeTooltips[1]).getByRole('img', { name: 'Gênero: Masculino' })).toBeVisible()
    expect(screen.getAllByRole('img', { name: 'Gênero: Feminino' })).toHaveLength(3)
    expect(screen.getAllByRole('img', { name: 'Gênero: Masculino' })).toHaveLength(3)
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    expect(screen.getAllByLabelText(/ainda não entrou em batalha/)).toHaveLength(10)
    expect(screen.getAllByLabelText(/já entrou em batalha/)).toHaveLength(2)
    const rosterTriggers = screen.getAllByLabelText(/já entrou em batalha/)
    const playerRosterTooltip = within(rosterTriggers[0]).getByRole('tooltip')
    const opponentRosterTooltip = within(rosterTriggers[1]).getByRole('tooltip')
    expect(playerRosterTooltip).toHaveTextContent('Atributos atuais')
    expect(playerRosterTooltip).toHaveTextContent('Fuga')
    expect(within(playerRosterTooltip).getByLabelText('Envenenamento')).toHaveClass('is-compact')
    expect(opponentRosterTooltip).toHaveTextContent('Velocidade possível')
    expect(opponentRosterTooltip).toHaveTextContent('Habilidades possíveis')
    expect(within(opponentRosterTooltip).getByLabelText('Queimadura')).toHaveClass('is-compact')
    fireEvent.focus(rosterTriggers[0])
    expect(playerRosterTooltip).toHaveClass('is-pointer-positioned')
    fireEvent.blur(rosterTriggers[0])
    expect(playerRosterTooltip).not.toHaveClass('is-pointer-positioned')
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
    const measureTooltip = vi.spyOn(moveTooltip, 'getBoundingClientRect').mockImplementation(() => {
      expect(moveTooltip.style.display).toBe('grid')
      return { x: 0, y: 0, left: 0, top: 0, right: 250, bottom: 180, width: 250, height: 180, toJSON: () => ({}) }
    })
    vi.stubGlobal('innerWidth', 320)
    vi.stubGlobal('innerHeight', 568)
    const measureTrigger = vi.spyOn(tackle, 'getBoundingClientRect').mockReturnValue({
      x: 200,
      y: 900,
      left: 200,
      top: 900,
      right: 300,
      bottom: 944,
      width: 100,
      height: 44,
      toJSON: () => ({}),
    })
    fireEvent.focus(tackle)
    expect(moveTooltip).toHaveStyle({ left: '60px', top: '378px' })
    measureTrigger.mockRestore()
    expect(moveTooltip).toHaveClass('is-pointer-positioned')
    fireEvent.pointerMove(tackle, { clientX: 310, clientY: 558 })
    expect(moveTooltip).toHaveStyle({ left: '60px', top: '378px' })
    fireEvent.blur(tackle)
    measureTooltip.mockRestore()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
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
    // The -1 accuracy / +1 evasion fixture gives Tackle a 56.25% hit chance.
    // Control battle rolls after trainer selection so this journey exercises a hit.
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
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
    const teraLog = screen.getAllByText(
      (_, element) =>
        Boolean(element?.matches('.battle-log-event')) &&
        Boolean(element?.textContent?.includes('Terastalizou para o tipo Normal')),
    )[0]
    expect(teraLog.querySelector('.tera-type-badge')).toHaveClass('type-normal')
    expect(screen.getByLabelText('Campo de batalha')).toHaveAttribute('aria-busy', 'false')
    expect(activeTooltips[0]).toHaveTextContent('Golpes utilizados')
    expect(activeTooltips[0]).toHaveTextContent('Growl')
    expect(activeTooltips[0].textContent?.match(/Growl/g)).toHaveLength(1)
    const activeTeraType = playerInformationCard!.querySelector<HTMLElement>('.battle-active-types.is-tera')
    expect(activeTeraType).not.toBeNull()
    expect(within(activeTeraType!).getByLabelText('Tipo Tera')).toBeVisible()
    expect(within(activeTeraType!).getByLabelText('Normal')).toBeVisible()
    expect(playerInformationHeader!.contains(activeTeraType)).toBe(true)
    expect(activeTeraType!.querySelector('.tera-type-badge')).toHaveClass('type-normal')
    expect(activeTooltips[1]).toHaveTextContent('Ativo')
    expect(activeTooltips[1].querySelector('.battle-tooltip-tera.is-active')).not.toBeNull()
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
    expect(logMoveTooltip).toHaveTextContent('Poder: 80')
    expect(logMoveTooltip).toHaveTextContent('Precisão: 100')
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

describe('battle ability presentation', () => {
  it('presents Illusion consistently in the field, images and accessible details', async () => {
    const player = completeTeam('player', 'Minha equipe')
    const opponent = completeTeam('opponent', 'Equipe adversária')
    opponent.members[0].pokemon = 'zoroark'
    opponent.members[0].ability = 'illusion'
    opponent.members[5].pokemon = 'dragonite'
    opponent.members[5].gender = 'female'
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => battleRoster(team))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    expect(await screen.findByRole('meter', { name: 'Pontos de vida de Dragonite' })).toBeVisible()
    expect(screen.queryByText('Zoroark')).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('img', { name: 'Dragonite' }).some((image) => image.getAttribute('src')?.includes('/6.gif')),
    ).toBe(true)
    expect(screen.getAllByLabelText('Detalhes de Dragonite').length).toBeGreaterThan(0)
  })
})
