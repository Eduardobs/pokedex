import { useLanguage } from '../contexts/LanguageContext'

export function EvSlider({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (value: number) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="ev-control">
      <input
        type="range"
        aria-label={t('teams.evSlider', { stat: label })}
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        aria-label={`${t('teams.ev')} ${label}`}
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
