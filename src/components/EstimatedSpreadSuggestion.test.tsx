import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { newMember, type TeamPokemon } from '../lib/teams'
import { EstimatedSpreadSuggestion } from './EstimatedSpreadSuggestion'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const arcanine: TeamPokemon = {
  name: 'arcanine',
  id: 59,
  species: 'arcanine',
  stats: [90, 110, 80, 100, 80, 95],
  types: ['fire'],
  abilities: ['intimidate'],
  moves: ['flare-blitz', 'close-combat', 'wild-charge', 'extreme-speed'],
}

const labels: Record<string, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Especial',
  'special-defense': 'Defesa Especial',
  speed: 'Velocidade',
}

it('asks for four moves without issuing requests for an incomplete set', () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  render(
    <LanguageProvider>
      <EstimatedSpreadSuggestion
        pokemon={arcanine}
        member={{ ...newMember(arcanine), moves: ['flare-blitz', '', '', ''] }}
        competitiveFormat="singles-6v6"
        statLabel={(stat) => labels[stat]}
        onApply={vi.fn()}
      />
    </LanguageProvider>,
  )

  expect(screen.getByText('Escolha quatro golpes para calcular uma distribuição estimada.')).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('calculates from the current build and applies EVs and Nature together', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const name = new URL(String(input)).pathname.split('/').filter(Boolean).at(-1)!
    return Promise.resolve(
      Response.json({
        name,
        damage_class: { name: 'physical', url: 'https://pokeapi.co/api/v2/move-damage-class/1/' },
        target: { name: 'selected-pokemon', url: 'https://pokeapi.co/api/v2/move-target/1/' },
        meta: { healing: 0 },
      }),
    )
  })
  const member = {
    ...newMember(arcanine),
    ability: 'intimidate',
    item: 'choice-band',
    moves: ['flare-blitz', 'close-combat', 'wild-charge', 'extreme-speed'],
  }
  const onApply = vi.fn()
  render(
    <LanguageProvider>
      <EstimatedSpreadSuggestion
        pokemon={arcanine}
        member={member}
        competitiveFormat="singles-6v6"
        statLabel={(stat) => labels[stat]}
        onApply={onApply}
      />
    </LanguageProvider>,
  )

  const suggestion = await screen.findByRole('button', { name: /Atacante veloz com Choice Band/ })
  expect(suggestion).toHaveTextContent('4 HP / 252 Ataque / 252 Velocidade')
  expect(suggestion).toHaveTextContent('Jolly (+Velocidade, −Ataque Especial)')
  fireEvent.click(suggestion)
  expect(onApply).toHaveBeenCalledWith({ evs: [4, 252, 0, 0, 0, 252], nature: 'jolly' })
  expect(screen.getByRole('status')).toHaveTextContent('EVs e Natureza da distribuição estimada aplicados.')
})
