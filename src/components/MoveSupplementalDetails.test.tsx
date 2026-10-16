import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { MoveSupplementalDetails } from './MoveSupplementalDetails'

afterEach(cleanup)

function renderDetails(moveName: string) {
  render(
    <LanguageProvider>
      <MoveSupplementalDetails moveName={moveName} />
    </LanguageProvider>,
  )
  return screen.queryByRole('heading', { name: 'Comportamento suplementar' })?.closest('section')
}

describe('MoveSupplementalDetails', () => {
  it.each([
    ['taunt', 'Impede o alvo de usar golpes de estado', '3 turnos'],
    ['seismic-toss', 'Causa dano calculado por uma regra fixa', 'Dano igual ao nível do usuário'],
    ['pain-split', 'Divide igualmente o HP atual combinado entre o usuário e o alvo', null],
    ['substitute', 'Gasta um quarto do HP máximo para criar um substituto que absorve dano', null],
    ['curse', 'Usa o tipo atual para escolher entre amaldiçoar o alvo ou alterar os atributos do usuário', null],
    ['haze', 'Remove alterações de atributos', 'Todos os Pokémon ativos'],
    ['heal-bell', 'Cura os problemas de estado da equipe', null],
    ['rain-dance', 'Altera o clima', 'Chuva'],
    ['grassy-terrain', 'Altera o terreno', 'Campo de Grama'],
    ['ice-spinner', 'Remove o terreno ativo', null],
    ['trick-room', 'Ativa ou encerra Trick Room', '5 turnos'],
    ['brick-break', 'Remove as proteções do lado do alvo', null],
    ['reflect', 'Aplica uma condição ao lado do usuário', 'Reflect'],
  ])('presents the supplemental data for %s', (moveName, mechanic, detail) => {
    const section = renderDetails(moveName)

    expect(section).toHaveTextContent(mechanic)
    if (detail) expect(section).toHaveTextContent(detail)
  })

  it('renders nothing for a move without supplemental data', () => {
    expect(renderDetails('tackle')).toBeUndefined()
  })
})
