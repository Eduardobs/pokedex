import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Pokemon, Species } from '../../types'
import { TrainingBreedingCard } from './TrainingBreedingCard'

const pokemon = {
  stats: [
    { base_stat: 95, effort: 0, stat: { name: 'hp', url: '' } },
    { base_stat: 100, effort: 0, stat: { name: 'attack', url: '' } },
    { base_stat: 125, effort: 2, stat: { name: 'special-defense', url: '' } },
  ],
} as Pokemon

const species = {
  hatch_counter: 20,
  egg_groups: [{ name: 'water1', url: '' }, { name: 'dragon', url: '' }],
  has_gender_differences: true,
  forms_switchable: false,
  gender_rate: 4,
} as Species

describe('TrainingBreedingCard', () => {
  it('transforma os dados técnicos em informações úteis para o jogador', () => {
    render(<LanguageProvider><TrainingBreedingCard pokemon={pokemon} species={species} /></LanguageProvider>)

    expect(screen.getByRole('heading', { name: 'Treinamento e criação' })).toBeVisible()
    expect(screen.getByText('2 EV em Def. especial')).toBeVisible()
    expect(screen.getByText('21 ciclos')).toBeVisible()
    expect(screen.getByText('Água 1, Dragão')).toBeVisible()
    expect(screen.getByText('A quantidade de passos por ciclo varia conforme a geração do jogo.')).toBeVisible()
    expect(screen.getByLabelText('50% masculino / 50% feminino')).toBeVisible()
  })
})
