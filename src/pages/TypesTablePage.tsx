import { useSearchParamUpdater } from '../hooks/useSearchParamUpdater'
import { useTypeHistory } from '../hooks/useTypeHistory'
import { historicalMultiplier } from '../lib/type-history'
import { InlineRetryError } from '../components/FeedbackState'
import { useRef, useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowRight, Grid3X3, Shield, ShieldPlus, Swords } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { TypeBadge, typeLabel } from '../components/TypeBadge'
import { SelectMenu } from '../components/SelectMenu'
import { useLanguage } from '../contexts/LanguageContext'
import { BATTLE_TYPES, getDamageMultiplier, type BattleType, type DamageMultiplier } from '../lib/type-chart'
import { formatDecimal } from '../lib/api'

const multiplierLabels: Record<DamageMultiplier, string> = {
  0: '0×',
  0.5: '½×',
  1: '1×',
  2: '2×',
}

function multiplierClass(multiplier: DamageMultiplier) {
  if (multiplier === 2) return 'super'
  if (multiplier === 0.5) return 'resisted'
  if (multiplier === 0) return 'immune'
  return 'neutral'
}

function resultClass(multiplier: number) {
  if (multiplier === 0) return 'result-immune'
  if (multiplier <= 0.25) return 'result-very-resistant'
  if (multiplier <= 0.5) return 'result-resistant'
  if (multiplier === 1) return 'result-neutral'
  if (multiplier <= 2) return 'result-effective'
  return 'result-very-effective'
}

export function TypesTablePage() {
  const { language, t } = useLanguage()
  const [matrixOpen, setMatrixOpen] = useState(false)
  const [focusedCell, setFocusedCell] = useState('normal:normal')
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const { searchParams, updateSearchParam } = useSearchParamUpdater()
  const requestedGeneration = searchParams.get('generation') ?? ''
  const generation = /^[1-9]$/.test(requestedGeneration) ? requestedGeneration : 'current'
  const setGeneration = (value: string) => updateSearchParam('generation', value, 'current')
  const history = useTypeHistory(generation !== 'current')
  const generationNumber = Number(generation)
  const types = BATTLE_TYPES.filter(
    (type) =>
      generation === 'current' ||
      (history.data?.find((entry) => entry.name === type)?.generation ?? 100) <= generationNumber,
  )
  const multiplierFor = (attack: BattleType, defense: BattleType) =>
    generation === 'current'
      ? getDamageMultiplier(attack, defense)
      : historicalMultiplier(history.data ?? [], generationNumber, attack, defense)
  const [hoveredCell, setHoveredCell] = useState<{
    attackingType: BattleType
    defendingType: BattleType
  } | null>(null)
  const [selectedCell, setSelectedCell] = useState<{
    attackingType: BattleType
    defendingType: BattleType
  } | null>(null)
  const [calculatorAttack, setCalculatorAttack] = useState<BattleType>('fire')
  const [calculatorDefense, setCalculatorDefense] = useState<BattleType>('grass')
  const [calculatorSecondDefense, setCalculatorSecondDefense] = useState<BattleType | ''>('')
  const activeCell = hoveredCell ?? selectedCell
  const attack = types.includes(calculatorAttack) ? calculatorAttack : types[0]
  const defense = types.includes(calculatorDefense) ? calculatorDefense : types[0]
  const secondDefense =
    calculatorSecondDefense && types.includes(calculatorSecondDefense) && calculatorSecondDefense !== defense
      ? calculatorSecondDefense
      : ''
  const calculatorResult =
    attack && defense ? multiplierFor(attack, defense) * (secondDefense ? multiplierFor(attack, secondDefense) : 1) : 1
  const typeOptions = types.map((type) => ({
    value: type,
    label: typeLabel(type, language),
  }))
  const secondTypeOptions: Array<{ value: BattleType | ''; label: string; pinned?: boolean }> = [
    { value: '', label: t('typesTable.noSecond'), pinned: true },
    ...types
      .filter((type) => type !== defense)
      .map((type) => ({
        value: type,
        label: typeLabel(type, language),
      })),
  ]

  const focusKey = types.some((a) => types.some((d) => `${a}:${d}` === focusedCell))
    ? focusedCell
    : `${types[0]}:${types[0]}`
  function navigateCell(event: KeyboardEvent<HTMLButtonElement>, attacker: BattleType, defender: BattleType) {
    let row = types.indexOf(attacker),
      column = types.indexOf(defender)
    if (event.key === 'ArrowRight') column++
    else if (event.key === 'ArrowLeft') column--
    else if (event.key === 'ArrowDown') row++
    else if (event.key === 'ArrowUp') row--
    else if (event.key === 'Home') {
      column = 0
      if (event.ctrlKey) row = 0
    } else if (event.key === 'End') {
      column = types.length - 1
      if (event.ctrlKey) row = types.length - 1
    } else return
    event.preventDefault()
    row = Math.max(0, Math.min(types.length - 1, row))
    column = Math.max(0, Math.min(types.length - 1, column))
    cellRefs.current[`${types[row]}:${types[column]}`]?.focus()
  }

  function changeFirstDefense(type: BattleType) {
    setCalculatorDefense(type)
    if (calculatorSecondDefense === type) setCalculatorSecondDefense('')
  }

  function selectMatchup(attackingType: BattleType, defendingType: BattleType) {
    setCalculatorAttack(attackingType)
    setCalculatorDefense(defendingType)
    if (calculatorSecondDefense === defendingType) setCalculatorSecondDefense('')
    setSelectedCell((current) =>
      current?.attackingType === attackingType && current.defendingType === defendingType
        ? null
        : { attackingType, defendingType },
    )
  }

  return (
    <section className="page content-width types-table-page">
      <PageHeader
        className="types-table-title"
        eyebrow={
          <>
            <Grid3X3 size={14} /> {t('typesTable.eyebrow')}
          </>
        }
        title={t('typesTable.title')}
        description={t('typesTable.description')}
      />

      <div className="tool-controls">
        <SelectMenu
          icon={<Grid3X3 size={18} />}
          label={t('tools.generation')}
          value={generation}
          onChange={(value) => {
            setGeneration(value)
            setHoveredCell(null)
            setSelectedCell(null)
          }}
          options={[
            { value: 'current', label: t('tools.current') },
            ...Array.from({ length: 9 }, (_, i) => ({
              value: String(i + 1),
              label: `${t('tools.generation')} ${i + 1}`,
            })),
          ]}
          sortOptions={false}
        />
      </div>
      {history.loading && <p role="status">{t('common.loading')}</p>}
      {generation !== 'current' && history.error && (
        <InlineRetryError message={t('error.message')} retryLabel={t('common.retry')} onRetry={history.retry} />
      )}
      {types.length > 0 && (
        <>
          <section className="type-calculator" aria-labelledby="type-calculator-title">
            <div>
              <h2 id="type-calculator-title">{t('typesTable.calculator')}</h2>
              <p>{t('typesTable.calculatorDesc')}</p>
            </div>
            <SelectMenu
              icon={<Swords size={18} />}
              label={t('typesTable.attacking')}
              options={typeOptions}
              value={attack}
              onChange={setCalculatorAttack}
            />
            <SelectMenu
              icon={<Shield size={18} />}
              label={t('typesTable.defenderOne')}
              options={typeOptions}
              value={defense}
              onChange={changeFirstDefense}
            />
            <SelectMenu
              icon={<ShieldPlus size={18} />}
              label={t('typesTable.defenderTwo')}
              options={secondTypeOptions}
              value={secondDefense}
              onChange={setCalculatorSecondDefense}
            />
            <output className={resultClass(calculatorResult)} aria-live="polite">
              <span>{t('typesTable.result')}</span>
              <b>{formatDecimal(calculatorResult, language)}×</b>
            </output>
          </section>

          <button
            className="button secondary type-matrix-toggle"
            type="button"
            aria-expanded={matrixOpen}
            aria-controls="type-matrix"
            onClick={() => setMatrixOpen(!matrixOpen)}
          >
            {t(matrixOpen ? 'ui.hideMatrix' : 'ui.showMatrix')}
          </button>
          <div id="type-matrix" className={`type-matrix${matrixOpen ? '' : ' matrix-collapsed'}`}>
            <p id="type-matrix-help" className="type-chart-tap-hint">
              {t('ui.matrixHelp')}
            </p>
            <div className="type-chart-selection" aria-live="polite">
              {activeCell ? (
                <>
                  <TypeBadge type={activeCell.attackingType} />
                  <ArrowRight size={16} aria-hidden="true" />
                  <TypeBadge type={activeCell.defendingType} />
                  <strong>{multiplierLabels[multiplierFor(activeCell.attackingType, activeCell.defendingType)]}</strong>
                </>
              ) : (
                t('ui.chooseMatchup')
              )}
            </div>
            <div className="type-chart-guide">
              <div className="type-chart-axis">
                <span>
                  <ArrowDown size={16} /> {t('typesTable.attack')}
                </span>
                <span>
                  <ArrowRight size={16} /> {t('typesTable.defense')}
                </span>
              </div>
              <div className="type-chart-legend" aria-label={t('typesTable.legend')}>
                <span>
                  <i className="multiplier super">2×</i>
                  {t('typesTable.super')}
                </span>
                <span>
                  <i className="multiplier neutral">1×</i>
                  {t('typesTable.neutral')}
                </span>
                <span>
                  <i className="multiplier resisted">½×</i>
                  {t('typesTable.resisted')}
                </span>
                <span>
                  <i className="multiplier immune">0×</i>
                  {t('typesTable.immune')}
                </span>
              </div>
            </div>

            <div className="type-chart-scroll" tabIndex={0} aria-label={t('typesTable.scrollLabel')}>
              <table
                aria-describedby="type-matrix-help"
                className="type-chart"
                onMouseLeave={() => setHoveredCell(null)}
              >
                <caption className="sr-only">{t('typesTable.caption')}</caption>
                <thead>
                  <tr>
                    <th className="type-chart-corner" scope="col">
                      <ArrowDown size={15} aria-hidden="true" />
                      <span>/</span>
                      <ArrowRight size={15} aria-hidden="true" />
                      <span className="sr-only">{t('typesTable.attackDefense')}</span>
                    </th>
                    {types.map((type) => (
                      <th
                        scope="col"
                        key={type}
                        className={activeCell?.defendingType === type ? 'is-column-highlighted' : undefined}
                      >
                        <TypeBadge type={type} iconOnly />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {types.map((attackingType) => (
                    <tr
                      key={attackingType}
                      className={activeCell?.attackingType === attackingType ? 'is-row-highlighted' : undefined}
                    >
                      <th scope="row">
                        <TypeBadge type={attackingType} />
                      </th>
                      {types.map((defendingType) => {
                        const multiplier = multiplierFor(attackingType, defendingType)
                        const isHovered =
                          activeCell?.attackingType === attackingType && activeCell.defendingType === defendingType
                        const classes = [
                          multiplierClass(multiplier),
                          activeCell?.defendingType === defendingType && 'is-column-highlighted',
                          isHovered && 'is-cell-highlighted',
                        ]
                          .filter(Boolean)
                          .join(' ')

                        return (
                          <td
                            key={defendingType}
                            className={classes}
                            onMouseEnter={() => setHoveredCell({ attackingType, defendingType })}
                          >
                            <button
                              type="button"
                              ref={(node) => {
                                cellRefs.current[`${attackingType}:${defendingType}`] = node
                              }}
                              tabIndex={focusKey === `${attackingType}:${defendingType}` ? 0 : -1}
                              onFocus={() => {
                                setFocusedCell(`${attackingType}:${defendingType}`)
                                setHoveredCell({ attackingType, defendingType })
                              }}
                              onBlur={() => setHoveredCell(null)}
                              onKeyDown={(event) => navigateCell(event, attackingType, defendingType)}
                              aria-label={`${typeLabel(attackingType, language)} → ${typeLabel(defendingType, language)}: ${t('typesTable.damageValue', { multiplier: multiplierLabels[multiplier] })}`}
                              aria-pressed={
                                selectedCell?.attackingType === attackingType &&
                                selectedCell.defendingType === defendingType
                              }
                              onClick={() => selectMatchup(attackingType, defendingType)}
                            >
                              <span aria-hidden="true">{multiplierLabels[multiplier]}</span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="type-chart-tap-hint">{t('typesTable.tapHint')}</p>
          </div>
          <p className="type-chart-note">{t(generation === 'current' ? 'typesTable.note' : 'tools.historicalTypes')}</p>
        </>
      )}
    </section>
  )
}
