import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useState } from 'react'
import { LanguageProvider } from '../contexts/LanguageContext'
import { EvSlider } from './EvSlider'
import { editEv, type Stats } from '../lib/teams'
afterEach(cleanup)
it('synchronizes numeric and slider inputs without exceeding the remaining EV budget', () => {
  function Show() {
    const [evs, setEvs] = useState<Stats>([252, 252, 0, 0, 0, 0])
    return (
      <LanguageProvider>
        <EvSlider label="HP" value={evs[2]} max={6} onChange={(value) => setEvs(editEv(evs, 2, value))} />
      </LanguageProvider>
    )
  }
  render(<Show />)
  fireEvent.change(screen.getByRole('slider'), { target: { value: '6' } })
  expect(screen.getByRole('spinbutton')).toHaveValue(6)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '252' } })
  expect(screen.getByRole('slider')).toHaveValue('6')
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } })
  expect(screen.getByRole('slider')).toHaveValue('4')
})
