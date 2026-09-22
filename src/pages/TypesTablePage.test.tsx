import { fireEvent, render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../contexts/LanguageContext'
import { BATTLE_TYPES } from '../lib/type-chart'
import { TypesTablePage } from './TypesTablePage'

describe('TypesTablePage', () => {
  it('highlights the row and column of the hovered matchup', () => {
    const { container } = render(
      <LanguageProvider>
        <TypesTablePage />
      </LanguageProvider>,
    )
    const table = container.querySelector('.type-chart')
    const rows = container.querySelectorAll<HTMLTableRowElement>('.type-chart tbody tr')
    const columnHeaders = container.querySelectorAll<HTMLTableCellElement>('.type-chart thead th')
    const fireRow = rows[BATTLE_TYPES.indexOf('fire')]
    const waterColumn = BATTLE_TYPES.indexOf('water')
    const matchupCell = fireRow.querySelectorAll('td')[waterColumn]

    fireEvent.mouseEnter(matchupCell)

    expect(fireRow).toHaveClass('is-row-highlighted')
    expect(columnHeaders[waterColumn + 1]).toHaveClass('is-column-highlighted')
    expect(matchupCell).toHaveClass('is-column-highlighted', 'is-cell-highlighted')
    rows.forEach((row) => {
      expect(row.querySelectorAll('td')[waterColumn]).toHaveClass('is-column-highlighted')
    })

    fireEvent.mouseLeave(table!)

    expect(fireRow).not.toHaveClass('is-row-highlighted')
    expect(columnHeaders[waterColumn + 1]).not.toHaveClass('is-column-highlighted')
  })

  it('colors the calculator result according to its effectiveness', () => {
    const { container } = render(
      <LanguageProvider>
        <TypesTablePage />
      </LanguageProvider>,
    )
    const output = container.querySelector('output')
    const view = within(container)
    const defenseSelect = view.getByRole('combobox', { name: 'Primeiro tipo defensor' })

    expect(output).toHaveClass('result-effective')

    fireEvent.click(defenseSelect)
    fireEvent.click(view.getByRole('option', { name: 'Água' }))

    expect(output).toHaveClass('result-resistant')
  })

  it('clears a duplicate second defender when a matchup changes the first defender', () => {
    const { container } = render(
      <LanguageProvider>
        <TypesTablePage />
      </LanguageProvider>,
    )
    const view = within(container)
    const attackSelect = view.getByRole('combobox', { name: 'Tipo atacante' })
    const firstDefenseSelect = view.getByRole('combobox', { name: 'Primeiro tipo defensor' })
    const secondDefenseSelect = view.getByRole('combobox', { name: 'Segundo tipo defensor' })

    fireEvent.click(secondDefenseSelect)
    fireEvent.click(view.getByRole('option', { name: 'Água' }))
    fireEvent.click(view.getByRole('button', { name: /Elétrico → Água: Dano 2×/ }))

    expect(attackSelect).toHaveTextContent('Elétrico')
    expect(firstDefenseSelect).toHaveTextContent('Água')
    expect(secondDefenseSelect).toHaveTextContent('Sem segundo tipo')
    expect(container.querySelector('output')).toHaveTextContent('2×')
  })

  it('clears a duplicate second defender when the first selector changes', () => {
    const { container } = render(
      <LanguageProvider>
        <TypesTablePage />
      </LanguageProvider>,
    )
    const view = within(container)
    const firstDefenseSelect = view.getByRole('combobox', { name: 'Primeiro tipo defensor' })
    const secondDefenseSelect = view.getByRole('combobox', { name: 'Segundo tipo defensor' })

    fireEvent.click(secondDefenseSelect)
    fireEvent.click(view.getByRole('option', { name: 'Água' }))
    fireEvent.click(firstDefenseSelect)
    fireEvent.click(view.getByRole('option', { name: 'Água' }))

    expect(secondDefenseSelect).toHaveTextContent('Sem segundo tipo')
  })
})
