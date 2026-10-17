import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { TeamsPage } from './TeamsPage'
import { STORAGE_KEYS } from '../config/app'
import { createTeamExport } from '../lib/team-transfer'
import { validTeams } from '../lib/teams'
import { clearApiCache } from '../lib/api-client'

afterEach(() => {
  cleanup()
  localStorage.clear()
  clearApiCache()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('creates and renames separate teams and restores saved teams', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }] }),
      ),
  )
  const show = () =>
    render(
      <LanguageProvider>
        <TeamsPage />
      </LanguageProvider>,
    )
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Nova equipe' }))
  fireEvent.change(screen.getByLabelText('Nome da equipe'), { target: { value: 'Kanto' } })
  fireEvent.click(screen.getByRole('button', { name: 'Nova equipe' }))
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.teams)!)).toHaveLength(2)
  cleanup()
  show()
  expect(screen.getByLabelText('Nome da equipe')).toHaveValue('Kanto')
  fireEvent.click(screen.getByRole('button', { name: 'Excluir equipe' }))
  const deleteConfirmation = screen.getByRole('alertdialog', { name: 'Excluir equipe?' })
  expect(deleteConfirmation).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  fireEvent.keyDown(deleteConfirmation, { key: 'Escape' })
  expect(screen.getByLabelText('Nome da equipe')).toHaveValue('Kanto')
  fireEvent.click(screen.getByRole('button', { name: 'Excluir equipe' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByLabelText('Nome da equipe')).toHaveValue('Kanto')
  fireEvent.click(screen.getByRole('button', { name: 'Excluir equipe' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir equipe' }))
  expect(screen.getByLabelText('Nome da equipe')).toHaveValue('Equipe 2')
})
it('reports storage failure without discarding the current team', () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }] }),
      ),
  )
  render(
    <LanguageProvider>
      <TeamsPage />
    </LanguageProvider>,
  )
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Nova equipe' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar')
  expect(screen.getByLabelText('Nome da equipe')).toHaveValue('Equipe 1')
})

it('creates a complete random team only after every selected Pokémon is available', async () => {
  const ref = (name: string, resource: string) => ({ name, url: `https://pokeapi.co/api/v2/${resource}/1/` })
  const names = ['venusaur', 'charizard', 'blastoise', 'arbok', 'pikachu', 'raichu']
  const details: Record<string, { types: string[]; ability: string; moves: string[] }> = {
    venusaur: {
      types: ['grass', 'poison'],
      ability: 'overgrow',
      moves: ['giga-drain', 'leech-seed', 'sleep-powder', 'sludge-bomb', 'substitute'],
    },
    charizard: {
      types: ['fire', 'flying'],
      ability: 'blaze',
      moves: ['earthquake', 'flamethrower', 'focus-blast', 'hurricane', 'will-o-wisp'],
    },
    blastoise: { types: ['water'], ability: 'torrent', moves: ['earthquake', 'hydro-pump', 'ice-beam', 'shell-smash'] },
    arbok: { types: ['poison'], ability: 'intimidate', moves: ['coil', 'earthquake', 'gunk-shot', 'trailblaze'] },
    pikachu: {
      types: ['electric'],
      ability: 'lightning-rod',
      moves: ['fake-out', 'knock-off', 'play-rough', 'surf', 'volt-switch', 'volt-tackle'],
    },
    raichu: {
      types: ['electric'],
      ability: 'lightning-rod',
      moves: ['alluring-voice', 'encore', 'focus-blast', 'grass-knot', 'nuzzle', 'surf', 'thunderbolt', 'volt-switch'],
    },
  }
  const pokemon = (name: string, id: number) => ({
    name,
    id,
    species: ref(name, 'pokemon-species'),
    types: details[name].types.map((type) => ({ type: ref(type, 'type') })),
    abilities: [{ ability: ref(details[name].ability, 'ability') }],
    moves: details[name].moves.map((move) => ({ move: ref(move, 'move') })),
    stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((stat) => ({
      stat: ref(stat, 'stat'),
      base_stat: 50,
    })),
  })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      const path = new URL(url).pathname.replace('/api/v2/', '')
      if (path === 'pokemon')
        return Promise.resolve(Response.json({ results: names.map((name) => ref(name, 'pokemon')) }))
      if (path.startsWith('pokemon/')) {
        const name = path.split('/')[1]
        return Promise.resolve(Response.json(pokemon(name, names.indexOf(name) + 1)))
      }
      if (path.startsWith('pokemon-species/')) return Promise.resolve(Response.json({ id: 1, gender_rate: 4 }))
      if (path.startsWith('item/'))
        return Promise.resolve(
          Response.json({
            name: path.split('/')[1],
            sprites: {},
            names: [],
            effect_entries: [],
            flavor_text_entries: [],
          }),
        )
      return Promise.resolve(Response.json({}))
    }),
  )
  render(
    <LanguageProvider>
      <TeamsPage />
    </LanguageProvider>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Equipe aleatória' }))
  expect(screen.getByText('Gerando equipe aleatória…')).toHaveAttribute('role', 'status')

  await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.teams)!)).toHaveLength(1))
  const [team] = JSON.parse(localStorage.getItem(STORAGE_KEYS.teams)!)
  expect(team.name).toBe('Equipe aleatória 1')
  expect(team.members).toHaveLength(6)
  expect(
    team.members.every((member: { moves: string[]; item: string }) => member.moves.length === 4 && member.item),
  ).toBe(true)
  expect(validTeams([team])).toBe(true)
})

it('does not save a partial team when random team data cannot be loaded', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
  render(
    <LanguageProvider>
      <TeamsPage />
    </LanguageProvider>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Equipe aleatória' }))

  expect(await screen.findByText('Não foi possível gerar a equipe. Tente novamente.')).toHaveAttribute('role', 'alert')
  expect(localStorage.getItem(STORAGE_KEYS.teams)).toBeNull()
})

it('imports a team JSON file and selects the imported team', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [] })))
  const team = {
    id: 'team-1',
    name: 'Equipe importada',
    competitiveFormat: 'singles-3v3' as const,
    members: [],
  }
  render(
    <LanguageProvider>
      <TeamsPage />
    </LanguageProvider>,
  )
  const file = new File([JSON.stringify(createTeamExport(team))], 'equipe.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('Arquivo da equipe'), { target: { files: [file] } })

  await waitFor(() => expect(screen.getByLabelText('Nome da equipe')).toHaveValue('Equipe importada'))
  expect(screen.getByText('Equipe importada.')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.teams)!)).toMatchObject([{ name: 'Equipe importada' }])
})

it('keeps current teams when the imported JSON is invalid', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [] })))
  render(
    <LanguageProvider>
      <TeamsPage />
    </LanguageProvider>,
  )
  const file = new File(['{"team":{}}'], 'invalido.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText('Arquivo da equipe'), { target: { files: [file] } })

  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível importar o arquivo')
  expect(localStorage.getItem(STORAGE_KEYS.teams)).toBeNull()
})

it('adds a Pokémon, edits its build, prevents duplicate moves and removes it', async () => {
  const ref = (name: string, resource: string) => ({ name, url: `https://pokeapi.co/api/v2/${resource}/1/` })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      const path = new URL(url).pathname.replace('/api/v2/', '')
      const payload =
        path === 'pokemon'
          ? { results: [ref('pikachu', 'pokemon')] }
          : path === 'pokemon/pikachu'
            ? {
                name: 'pikachu',
                id: 25,
                species: ref('pikachu', 'pokemon-species'),
                types: [{ type: ref('electric', 'type') }],
                abilities: [{ ability: ref('static', 'ability') }, { ability: ref('lightning-rod', 'ability') }],
                moves: [{ move: ref('thunderbolt', 'move') }],
                stats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map((name) => ({
                  stat: ref(name, 'stat'),
                  base_stat: 50,
                })),
              }
            : path === 'pokemon-species/pikachu'
              ? { id: 25, gender_rate: 4 }
              : path === 'item'
                ? { results: [ref('eviolite', 'item')] }
                : path === 'item/eviolite'
                  ? {
                      name: 'eviolite',
                      sprites: {
                        default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/eviolite.png',
                      },
                      names: [],
                      effect_entries: [],
                      flavor_text_entries: [],
                    }
                  : path === 'move/thunderbolt'
                    ? {
                        name: 'thunderbolt',
                        type: ref('electric', 'type'),
                        damage_class: ref('special', 'move-damage-class'),
                        power: 90,
                        accuracy: 100,
                        pp: 15,
                        priority: 0,
                      }
                    : { names: [], effect_entries: [] }
      return Promise.resolve(Response.json(payload))
    }),
  )
  render(
    <LanguageProvider>
      <TeamsPage />
    </LanguageProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Nova equipe' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome original ou número do Pokémon' }), {
    target: { value: 'pikachu' },
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Pikachu' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Pikachu' }))
  await screen.findByRole('heading', { name: 'Pikachu' })
  fireEvent.change(screen.getByLabelText('Nível'), { target: { value: '50' } })
  fireEvent.change(screen.getByLabelText('Amizade'), { target: { value: '120' } })
  fireEvent.click(screen.getByLabelText('Shiny'))
  const female = await screen.findByRole('radio', { name: 'Feminino' })
  expect(female.closest('label')?.querySelector('svg')).toBeInTheDocument()
  fireEvent.click(female)
  fireEvent.click(screen.getByRole('combobox', { name: 'Tipo Tera' }))
  const fireType = screen.getByRole('option', { name: 'Fogo' })
  expect(fireType.querySelector('.tera-type-badge')).toHaveClass('type-fire')
  expect(fireType.querySelector('use')).toHaveAttribute('href', expect.stringContaining('#type-fire'))
  fireEvent.click(fireType)
  const teraSelect = screen.getByRole('combobox', { name: 'Tipo Tera' })
  expect(teraSelect).toHaveTextContent('Tipo Tera')
  expect(teraSelect.querySelector('.tera-type-badge')).toHaveClass('type-fire')
  expect(
    Array.from(screen.getByLabelText('Habilidade').querySelectorAll('option')).map((option) => option.textContent),
  ).toEqual(['Lightning Rod', 'Static'])
  fireEvent.change(screen.getByLabelText('Habilidade'), { target: { value: 'lightning-rod' } })
  const nature = screen.getByLabelText('Natureza')
  expect(Array.from(nature.querySelectorAll('option')).map((option) => option.textContent?.split(' ')[0])).toEqual(
    [...Array.from(nature.querySelectorAll('option')).map((option) => option.textContent?.split(' ')[0])].sort(),
  )
  fireEvent.change(nature, { target: { value: 'adamant' } })
  fireEvent.click(screen.getByLabelText(/Ativar condição da habilidade/))
  fireEvent.click(screen.getByRole('button', { name: 'Item equipado' }))
  fireEvent.click(await screen.findByRole('option', { name: /Eviolite/ }))
  fireEvent.click(await screen.findByLabelText(/Este Pokémon ainda pode evoluir/))
  fireEvent.change(screen.getByLabelText('IV HP'), { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('EV HP'), { target: { value: '252' } })
  fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
  expect(screen.getByLabelText('IV HP')).toHaveValue(31)
  expect(screen.getByLabelText('EV HP')).toHaveValue(0)
  fireEvent.change(screen.getByLabelText('IV HP'), { target: { value: '20' } })
  fireEvent.change(screen.getByLabelText('EV HP'), { target: { value: '252' } })
  fireEvent.click(screen.getByRole('combobox', { name: 'Regras competitivas' }))
  fireEvent.click(screen.getByRole('option', { name: /Duplas 4×4/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Golpe 1' }))
  fireEvent.click(await screen.findByRole('option', { name: /Thunderbolt/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Golpe 2' }))
  expect(screen.queryByRole('option', { name: /Thunderbolt/ })).toBeNull()
  fireEvent.keyDown(screen.getByLabelText('Buscar golpe pelo nome'), { key: 'Escape' })
  const savedTeam = JSON.parse(localStorage.getItem(STORAGE_KEYS.teams)!)[0]
  const member = savedTeam.members[0]
  expect(savedTeam.competitiveFormat).toBe('doubles-4v4')
  expect(member).toMatchObject({
    level: 50,
    friendship: 120,
    shiny: true,
    gender: 'female',
    tera: 'fire',
    ability: 'lightning-rod',
    nature: 'adamant',
    item: 'eviolite',
    abilityActive: true,
    itemActive: true,
  })
  expect(member.moves[0]).toBe('thunderbolt')
  expect(member.ivs[0]).toBe(20)
  expect(member.evs[0]).toBe(252)
  fireEvent.click(screen.getByRole('button', { name: 'Remover Pokémon' }))
  expect(screen.queryByRole('heading', { name: 'Pikachu' })).not.toBeInTheDocument()
})
