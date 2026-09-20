import { Activity, EyeOff, Mars, Sparkles, Swords, Venus, Zap } from 'lucide-react'
import { prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

export function DamageClassBadge({ value, compact = false }: { value: string; compact?: boolean }) {
  const { t } = useLanguage()
  const damageClass = {
    physical: { label: t('damage.physical'), icon: Swords },
    special: { label: t('damage.special'), icon: Sparkles },
    status: { label: t('damage.status'), icon: Activity },
  }
  const config = damageClass[value as keyof typeof damageClass] ?? damageClass.status
  const Icon = config.icon
  return <span className={`damage-badge damage-${value}`} title={t('damage.class', { name: config.label })}><Icon size={compact ? 13 : 15} aria-hidden="true" />{!compact && config.label}</span>
}

export function AbilityBadge({ hidden }: { hidden: boolean }) {
  const { t } = useLanguage()
  return hidden
    ? <span className="ability-badge hidden"><EyeOff size={13} />{t('ability.hidden')}</span>
    : <span className="ability-badge standard"><Zap size={13} />{t('ability.common')}</span>
}

export function GenderRatio({ rate }: { rate: number }) {
  const { t } = useLanguage()
  if (rate < 0) return <div className="gender-ratio genderless"><span>Ø</span><b>{t('gender.none')}</b></div>
  const female = rate * 12.5
  const male = 100 - female
  return (
    <div className="gender-ratio" aria-label={`${male}% ${t('gender.male')} / ${female}% ${t('gender.female')}`}>
      <div className="gender-values">
        {male > 0 && <span className="gender-male"><Mars size={15} /><b>{male}%</b> {t('gender.male')}</span>}
        {female > 0 && <span className="gender-female"><Venus size={15} /><b>{female}%</b> {t('gender.female')}</span>}
      </div>
      <div className="gender-bar"><i style={{ width: `${male}%` }} /><i style={{ width: `${female}%` }} /></div>
    </div>
  )
}

export function GenderBadge({ value }: { value: string }) {
  const { t } = useLanguage()
  const normalized = value.toLowerCase()
  if (normalized === 'male') return <span className="gender-badge gender-male"><Mars size={15} />{t('gender.maleLabel')}</span>
  if (normalized === 'female') return <span className="gender-badge gender-female"><Venus size={15} />{t('gender.femaleLabel')}</span>
  return <span className="gender-badge genderless"><span>Ø</span>{prettyName(value)}</span>
}
