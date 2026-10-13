import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LanguageProvider } from '../contexts/LanguageContext'
import { ExperiencePlanner } from './ExperiencePlanner'
import { ItemPrices } from './ItemPrices'
import { VersionDescriptions } from './VersionDescriptions'
import { FormConditions } from './FormConditions'
import { EvolutionRules } from './EvolutionRules'
import { SpriteGallery } from './pokemon-detail/SpriteGallery'
import { PokemonSpeciesDetails } from './pokemon-detail/PokemonSpeciesDetails'
import type { EvolutionDetail, Species } from '../types'

const ref = (name: string, endpoint = 'version-group', id = 1) => ({
  name,
  url: `https://pokeapi.co/api/v2/${endpoint}/${id}/`,
})
function show(children: ReactNode) {
  return render(
    <MemoryRouter>
      <LanguageProvider>{children}</LanguageProvider>
    </MemoryRouter>,
  )
}
function select(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(screen.getByRole('option', { name: option }))
}
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('data tools', () => {
  it('calculates level ranges and exposes an accessible curve and table', () => {
    show(
      <ExperiencePlanner
        data={{
          levels: [
            { level: 1, experience: 0 },
            { level: 50, experience: 125000 },
            { level: 100, experience: 1000000 },
          ],
        }}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('1.000.000')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Nível inicial' }), { target: { value: '50' } })
    expect(screen.getByRole('status')).toHaveTextContent('875.000')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Nível desejado' }), { target: { value: '1' } })
    expect(screen.getByRole('status')).toHaveTextContent('Escolha níveis')
    expect(screen.getByRole('img', { name: 'Experiência acumulada por nível' })).toBeVisible()
    fireEvent.click(screen.getByText('Experiência acumulada por nível', { selector: 'summary' }))
    expect(screen.getByRole('table')).toBeVisible()
  })
  it('handles missing curves and empty prices', () => {
    show(
      <>
        <ExperiencePlanner data={{}} />
        <ItemPrices value={[]} />
      </>,
    )
    expect(screen.getAllByText('Dados não disponíveis para esta seleção.')).toHaveLength(2)
  })
  it('changes item prices by game and links to currencies', () => {
    show(
      <ItemPrices
        value={[
          {
            version_group: ref('red-blue'),
            currency: ref('poke-dollar', 'currency'),
            purchase_price: 0,
            sell_price: null,
          },
          {
            version_group: ref('gold-silver'),
            currency: ref('battle-point', 'currency', 2),
            purchase_price: null,
            sell_price: 50,
          },
        ]}
      />,
    )
    expect(screen.getByRole('cell', { name: '0' })).toBeVisible()
    expect(screen.getByText('Não comercializável')).toBeVisible()
    select('Jogo', 'Gold Silver')
    expect(screen.getByRole('cell', { name: '50' })).toBeVisible()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/explore/currency/2')
  })
  it('selects localized item and species descriptions by version', () => {
    const entries = [
      { text: 'First game.', language: ref('en', 'language'), version_group: ref('red-blue') },
      { flavor_text: 'Segundo jogo.', language: ref('pt-br', 'language'), version: ref('gold-silver') },
    ]
    show(<VersionDescriptions entries={entries} />)
    expect(screen.getByText('First game.')).toHaveAttribute('lang', 'en')
    select('Jogo', 'Gold Silver')
    expect(screen.getByText('Segundo jogo.')).toHaveAttribute('lang', 'pt-br')
    expect(screen.queryByText('First game.')).not.toBeInTheDocument()
  })
  it('shows regional numbers, form descriptions and a growth planner link', () => {
    const species = {
      pokedex_numbers: [{ entry_number: 74, pokedex: ref('paldea', 'pokedex', 31) }],
      growth_rate: ref('medium', 'growth-rate', 2),
      form_descriptions: [{ description: 'Form description.', language: ref('en', 'language') }],
    } as Species
    show(<PokemonSpeciesDetails species={species} />)
    expect(screen.getByText('#74')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Paldea' })).toHaveAttribute('href', '/explore/pokedex/paldea')
    expect(screen.getByText('Form description.')).toBeVisible()
    expect(screen.getByRole('link', { name: /Planejador de experiência/ })).toHaveAttribute(
      'href',
      '/explore/growth-rate/medium',
    )
  })
  it('shows linked form requirements without nesting links', () => {
    show(
      <FormConditions
        conditions={[
          { trigger: 'held-item', ...ref('insect-plate', 'item', 285), base_form: ref('arceus', 'pokemon-form', 493) },
          { trigger: 'gigantamax-factor' },
          { trigger: 'weather' },
        ]}
      />,
    )
    expect(screen.getByText('Segurar o item')).toBeVisible()
    expect(screen.getByRole('link', { name: /Insect Plate/ })).toHaveAttribute('href', '/explore/item/285')
    expect(screen.getByText('Possuir o fator Gigantamax')).toBeVisible()
    expect(screen.getByText('Forma inicial necessária:', { exact: false })).toBeVisible()
  })
  it('loads variable explanations on demand with retry', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          symbol: 'EC',
          names: [],
          descriptions: [{ description: 'Encryption constant.', language: ref('en', 'language') }],
        }),
      )
    vi.stubGlobal('fetch', fetch)
    show(
      <EvolutionRules
        detail={
          {
            condition_expression: {
              expression: 'EC 100 % 0 ==',
              percentage_chance: 1,
              variables: [ref('encryption-constant', 'evolution-variable')],
            },
          } as EvolutionDetail
        }
      />,
    )
    expect(fetch).not.toHaveBeenCalled()
    const details = screen.getByText('Regras especiais de evolução').closest('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Encryption constant.')).toBeVisible()
    expect(screen.getByText('((EC mod 100) = 0)')).toBeVisible()
  })
  it('keeps animated sprites opt-in and lets users change gallery sources', async () => {
    const prefix = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
    show(
      <SpriteGallery
        sprites={{
          front_default: `${prefix}25.png`,
          front_shiny: null,
          other: { showdown: { front_default: `${prefix}25.gif` } },
        }}
      />,
    )
    expect(screen.getByRole('img', { name: 'Frente · Normal' })).toHaveAttribute('src', `${prefix}25.png`)
    select('Estilo ou jogo', 'Showdown')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Exibir animações' }))
    expect(screen.getByRole('img')).toHaveAttribute('src', `${prefix}25.gif`)
    fireEvent.error(screen.getByRole('img'))
    await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument())
    select('Estilo ou jogo', 'Normal')
    expect(screen.getByRole('img')).toHaveAttribute('src', `${prefix}25.png`)
  })
  it('renders an empty gallery and ignores absent optional sections', () => {
    const { container } = show(
      <>
        <SpriteGallery sprites={{ front_default: null, front_shiny: null }} />
        <VersionDescriptions entries={[]} />
        <FormConditions conditions={[]} />
        <EvolutionRules detail={{} as EvolutionDetail} />
      </>,
    )
    expect(within(container).getByText('Dados não disponíveis para esta seleção.')).toBeVisible()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
