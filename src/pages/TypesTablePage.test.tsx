import { fireEvent, render } from '@testing-library/react'
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
})
