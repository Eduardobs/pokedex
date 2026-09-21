import { useState } from 'react'
import { ArrowDown, ArrowRight, Grid3X3, Shield, ShieldPlus, Swords } from 'lucide-react'
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
  const [hoveredCell, setHoveredCell] = useState<{
    attackingType: BattleType
    defendingType: BattleType
  } | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ attackingType: BattleType; defendingType: BattleType } | null>(null)
  const [calculatorAttack, setCalculatorAttack] = useState<BattleType>('fire')
  const [calculatorDefense, setCalculatorDefense] = useState<BattleType>('grass')
  const [calculatorSecondDefense, setCalculatorSecondDefense] = useState<BattleType | ''>('')
  const activeCell = hoveredCell ?? selectedCell
  const calculatorResult = getDamageMultiplier(calculatorAttack, calculatorDefense)
    * (calculatorSecondDefense ? getDamageMultiplier(calculatorAttack, calculatorSecondDefense) : 1)
  const typeOptions = BATTLE_TYPES.map((type) => ({ value: type, label: typeLabel(type, language) }))
  const secondTypeOptions: Array<{ value: BattleType | ''; label: string }> = [
    { value: '', label: t('typesTable.noSecond') },
    ...BATTLE_TYPES.filter((type) => type !== calculatorDefense || type === calculatorSecondDefense)
      .map((type) => ({ value: type, label: typeLabel(type, language) })),
  ]

  function selectMatchup(attackingType: BattleType, defendingType: BattleType) {
    setCalculatorAttack(attackingType)
    setCalculatorDefense(defendingType)
    setSelectedCell((current) => current?.attackingType === attackingType && current.defendingType === defendingType
      ? null
      : { attackingType, defendingType })
  }

  return (
    <section className="page content-width types-table-page">
      <div className="page-title types-table-title">
        <div>
          <span className="eyebrow"><Grid3X3 size={14} /> {t('typesTable.eyebrow')}</span>
          <h1>{t('typesTable.title')}</h1>
          <p>{t('typesTable.description')}</p>
        </div>
      </div>

      <section className="type-calculator" aria-labelledby="type-calculator-title">
        <div><h2 id="type-calculator-title">{t('typesTable.calculator')}</h2><p>{t('typesTable.calculatorDesc')}</p></div>
        <SelectMenu icon={<Swords size={18} />} label={t('typesTable.attacking')} options={typeOptions} value={calculatorAttack} onChange={setCalculatorAttack} />
        <SelectMenu icon={<Shield size={18} />} label={t('typesTable.defenderOne')} options={typeOptions} value={calculatorDefense} onChange={setCalculatorDefense} />
        <SelectMenu icon={<ShieldPlus size={18} />} label={t('typesTable.defenderTwo')} options={secondTypeOptions} value={calculatorSecondDefense} onChange={setCalculatorSecondDefense} />
        <output className={resultClass(calculatorResult)} aria-live="polite"><span>{t('typesTable.result')}</span><b>{formatDecimal(calculatorResult, language)}×</b></output>
      </section>

      <div className="type-chart-guide">
        <div className="type-chart-axis">
          <span><ArrowDown size={16} /> {t('typesTable.attack')}</span>
          <span><ArrowRight size={16} /> {t('typesTable.defense')}</span>
        </div>
        <div className="type-chart-legend" aria-label={t('typesTable.legend')}>
          <span><i className="multiplier super">2×</i>{t('typesTable.super')}</span>
          <span><i className="multiplier neutral">1×</i>{t('typesTable.neutral')}</span>
          <span><i className="multiplier resisted">½×</i>{t('typesTable.resisted')}</span>
          <span><i className="multiplier immune">0×</i>{t('typesTable.immune')}</span>
        </div>
      </div>

      <div className="type-chart-scroll" tabIndex={0} aria-label={t('typesTable.scrollLabel')}>
        <table className="type-chart" onMouseLeave={() => setHoveredCell(null)}>
          <caption className="sr-only">{t('typesTable.caption')}</caption>
          <thead>
            <tr>
              <th className="type-chart-corner" scope="col">
                <ArrowDown size={15} aria-hidden="true" />
                <span>/</span>
                <ArrowRight size={15} aria-hidden="true" />
                <span className="sr-only">{t('typesTable.attackDefense')}</span>
              </th>
              {BATTLE_TYPES.map((type) => (
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
            {BATTLE_TYPES.map((attackingType) => (
              <tr
                key={attackingType}
                className={activeCell?.attackingType === attackingType ? 'is-row-highlighted' : undefined}
              >
                <th scope="row"><TypeBadge type={attackingType} /></th>
                {BATTLE_TYPES.map((defendingType) => {
                  const multiplier = getDamageMultiplier(attackingType, defendingType)
                  const isHovered = activeCell?.attackingType === attackingType
                    && activeCell.defendingType === defendingType
                  const classes = [
                    multiplierClass(multiplier),
                    activeCell?.defendingType === defendingType && 'is-column-highlighted',
                    isHovered && 'is-cell-highlighted',
                  ].filter(Boolean).join(' ')

                  return (
                    <td
                      key={defendingType}
                      className={classes}
                      onMouseEnter={() => setHoveredCell({ attackingType, defendingType })}
                    >
                      <button
                        type="button"
                        aria-label={`${typeLabel(attackingType, language)} → ${typeLabel(defendingType, language)}: ${t('typesTable.damageValue', { multiplier: multiplierLabels[multiplier] })}`}
                        aria-pressed={selectedCell?.attackingType === attackingType && selectedCell.defendingType === defendingType}
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
      <p className="type-chart-note">{t('typesTable.note')}</p>
    </section>
  )
}
