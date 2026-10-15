import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { STORAGE_KEYS } from '../config/app'
import { LanguageProvider } from '../contexts/LanguageContext'
import { clearApiCache } from '../lib/api-client'
import { createBattlePokemon, type BattleMove } from '../lib/battle'
import * as battleData from '../lib/battle-data'
import * as randomTeam from '../lib/random-team'
import type { Team } from '../lib/teams'
import { BattlePage } from './BattlePage'

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
    gender: 'random',
    tera: 'normal',
    ability: 'run-away',
    nature: 'hardy',
    item: '',
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
  statChanges: name === 'growl' ? [{ stat: 'attack', change: -1 }] : [],
  descriptions: [{ language: 'pt-br', text: `${name} em detalhes.` }],
})

const battleRoster = (team: Team) =>
  team.members.map((member, index) =>
    createBattlePokemon(
      member,
      {
        id: index + 1,
        name: member.pokemon,
        species: member.pokemon,
        stats: [100, 100, 100, 100, 100, 100],
        types: ['normal'],
        abilities: ['run-away'],
        moves: member.moves,
        homeSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${index + 1}.png`,
        showdownFrontSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${index + 1}.gif`,
        showdownBackSprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${index + 1}.gif`,
      },
      [testMove('tackle'), testMove('quick-attack'), testMove('recover'), testMove('growl')],
    ),
  )

afterEach(() => {
  cleanup()
  localStorage.clear()
  clearApiCache()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('BattlePage lobby', () => {
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
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([player]))
    vi.spyOn(randomTeam, 'loadRandomTeamPokemon').mockResolvedValue([])
    vi.spyOn(randomTeam, 'createRandomTeam').mockReturnValue(opponent)
    vi.spyOn(battleData, 'loadBattleRoster').mockImplementation(async (team) => battleRoster(team))

    show()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar batalha' }))
    expect(await screen.findByRole('heading', { name: 'O que Pokemon 0 fará?' })).toBeVisible()
    expect(screen.getAllByRole('meter', { name: 'Pontos de vida de Pokemon 0' })[0]).toHaveAttribute('aria-valuenow')
    expect(screen.getAllByText('Nº 1')).toHaveLength(2)
    expect(screen.queryByText('Ataque 0')).not.toBeInTheDocument()
    const playerSprite = screen
      .getAllByRole('img', { name: 'Pokemon 0' })
      .find((image) => image.getAttribute('src')?.includes('/back/1.gif'))
    expect(playerSprite).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/1.gif',
    )

    const tackle = screen.getByRole('button', { name: /Tackle/ })
    fireEvent.mouseOver(tackle)
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('Poder: 80')
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('Efetividade: 1×')
    expect(within(tackle).getByRole('tooltip')).toHaveTextContent('tackle em detalhes.')

    fireEvent.click(screen.getByRole('button', { name: 'Terastalizar (Normal)' }))
    const teraButton = screen.getByRole('button', { name: 'Terastalizar (Normal)' })
    expect(teraButton).toHaveAttribute('aria-pressed', 'true')
    expect(teraButton).toHaveClass('is-selected')
    expect(teraButton.querySelector('svg')).toBeInTheDocument()
    fireEvent.click(teraButton)
    expect(teraButton).toHaveAttribute('aria-pressed', 'false')
    expect(teraButton).not.toHaveClass('is-selected')
    expect(teraButton.querySelector('svg')).not.toBeInTheDocument()
    fireEvent.click(teraButton)
    fireEvent.click(screen.getByRole('button', { name: /Tackle/ }))
    await waitFor(() => expect(screen.getAllByText(/Terastalizou para o tipo Normal/).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/usou/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Terastalizar (Normal)' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Trocar Pokémon'))
    expect(screen.queryByRole('button', { name: /Tackle/ })).not.toBeInTheDocument()
    const replacement = screen.getByRole('button', { name: /Pokemon 1/ })
    fireEvent.mouseOver(replacement)
    const replacementTooltip = within(replacement).getByRole('tooltip')
    expect(replacementTooltip).toHaveTextContent('Pokemon 1')
    expect(replacementTooltip).toHaveTextContent('Nv. 100')
    expect(replacementTooltip).toHaveTextContent('Tipo Tera')
    expect(within(replacementTooltip).getAllByText('Normal')).toHaveLength(2)
    expect(replacementTooltip).toHaveTextContent('HP restante')
    expect(replacementTooltip).toHaveTextContent('Ataque')
    expect(replacementTooltip).toHaveTextContent('Tackle')
    fireEvent.click(replacement)
    expect(await screen.findByRole('heading', { name: 'O que Pokemon 1 fará?' })).toBeVisible()
    expect(screen.getByText(/Pokemon 1 entrou em campo/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Terastalizar (Normal)' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Nova batalha' }))
    expect(screen.getByRole('heading', { name: 'Prepare-se para batalhar' })).toBeVisible()
  })
})
