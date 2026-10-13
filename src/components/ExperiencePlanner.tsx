import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { formatNumber } from '../lib/api'
import { experienceBetween, parseExperience } from '../lib/resource-data'

export function ExperiencePlanner({ data }: { data: unknown }) {
  const { language, t } = useLanguage()
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState('100')
  let levels
  try {
    levels = parseExperience(data)
  } catch {
    return (
      <section className="info-card">
        <h2>{t('tools.experience')}</h2>
        <p>{t('tools.noData')}</p>
      </section>
    )
  }
  const amount = experienceBetween(levels, Number(from), Number(to))
  const max = Math.max(1, ...levels.map((entry) => entry.experience))
  const points = levels
    .map(({ level, experience }) => `${10 + (level - 1) * 4.8},${190 - (experience / max) * 170}`)
    .join(' ')
  return (
    <section className="info-card resource-tool">
      <h2>{t('tools.experience')}</h2>
      <div className="tool-controls">
        <label>
          {t('tools.fromLevel')}
          <input type="number" min="1" max="100" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          {t('tools.toLevel')}
          <input type="number" min="1" max="100" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <p role="status">
        {amount === null
          ? t('tools.invalidLevels')
          : t('tools.neededExperience', { amount: formatNumber(amount, language) })}
      </p>
      <svg className="experience-chart" viewBox="0 0 500 220" role="img" aria-label={t('tools.growthCurve')}>
        <title>{t('tools.growthCurve')}</title>
        <path d="M10 10 V190 H490" fill="none" stroke="currentColor" />
        <polyline points={points} fill="none" stroke="var(--red)" strokeWidth="3" />
        <text x="10" y="210">
          1
        </text>
        <text x="460" y="210">
          100
        </text>
        <text x="16" y="20">
          {formatNumber(max, language)}
        </text>
      </svg>
      <details>
        <summary>{t('tools.growthCurve')}</summary>
        <div className="tool-table-scroll" tabIndex={0} role="region" aria-label={t('tools.growthCurve')}>
          <table className="tool-table">
            <thead>
              <tr>
                <th scope="col">{t('tools.level')}</th>
                <th scope="col">{t('tools.xp')}</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(({ level, experience }) => (
                <tr key={level}>
                  <th scope="row">{level}</th>
                  <td>{formatNumber(experience, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
