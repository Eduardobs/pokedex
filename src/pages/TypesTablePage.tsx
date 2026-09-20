import { ArrowDown, ArrowRight, Grid3X3 } from 'lucide-react'
import { TypeBadge } from '../components/TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'
import { BATTLE_TYPES, getDamageMultiplier, type DamageMultiplier } from '../lib/type-chart'

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

export function TypesTablePage() {
  const { t } = useLanguage()

  return (
    <section className="page content-width types-table-page">
      <div className="page-title types-table-title">
        <div>
          <span className="eyebrow"><Grid3X3 size={14} /> {t('typesTable.eyebrow')}</span>
          <h1>{t('typesTable.title')}</h1>
          <p>{t('typesTable.description')}</p>
        </div>
      </div>

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
        <table className="type-chart">
          <caption className="sr-only">{t('typesTable.caption')}</caption>
          <thead>
            <tr>
              <th className="type-chart-corner" scope="col">
                <ArrowDown size={15} aria-hidden="true" />
                <span>/</span>
                <ArrowRight size={15} aria-hidden="true" />
                <span className="sr-only">{t('typesTable.attackDefense')}</span>
              </th>
              {BATTLE_TYPES.map((type) => <th scope="col" key={type}><TypeBadge type={type} /></th>)}
            </tr>
          </thead>
          <tbody>
            {BATTLE_TYPES.map((attackingType) => (
              <tr key={attackingType}>
                <th scope="row"><TypeBadge type={attackingType} /></th>
                {BATTLE_TYPES.map((defendingType) => {
                  const multiplier = getDamageMultiplier(attackingType, defendingType)
                  return (
                    <td key={defendingType} className={multiplierClass(multiplier)}>
                      <span aria-label={t('typesTable.damageValue', { multiplier: multiplierLabels[multiplier] })}>
                        {multiplierLabels[multiplier]}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-chart-note">{t('typesTable.note')}</p>
    </section>
  )
}
