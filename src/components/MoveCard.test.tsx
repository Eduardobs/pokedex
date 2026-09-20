import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider, type Translate, type TranslationKey } from '../contexts/LanguageContext'
import { MoveCard, moveLearningLabel } from './MoveCard'

afterEach(cleanup)

const translations: Partial<Record<TranslationKey, string>> = {
  'move.level': 'Nível {level}',
  'move.method.machine': 'Máquina (TM/TR)',
  'move.method.egg': 'Ovo',
  'move.method.tutor': 'Tutor de golpes',
}

const t: Translate = (key, variables) => {
  let text = translations[key] ?? key
  Object.entries(variables ?? {}).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value))
  })
  return text
}

describe('moveLearningLabel', () => {
  it('shows the level for moves learned by leveling up', () => {
    expect(moveLearningLabel('level-up', 16, t)).toBe('Nível 16')
  })

  it.each([
    ['machine', 'Máquina (TM/TR)'],
    ['egg', 'Ovo'],
    ['tutor', 'Tutor de golpes'],
  ])('localizes the %s learning method', (method, label) => {
    expect(moveLearningLabel(method, 0, t)).toBe(label)
  })

  it('keeps uncommon API methods readable', () => {
    expect(moveLearningLabel('special-event', 0, t)).toBe('Special Event')
  })
})

describe('MoveCard', () => {
  it('renders the learning information inside the card', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <MoveCard move={{ name: 'thunder-shock', url: 'https://example.test/move/84' }} method="level-up" level={5} />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Aprendizado')).toBeVisible()
    expect(screen.getByText('Nível 5')).toBeVisible()
  })
})
