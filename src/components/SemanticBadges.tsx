import type { ImgHTMLAttributes } from 'react'
import { EyeOff, Mars, Venus, Zap } from 'lucide-react'
import { prettyName } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

type DamageClass = 'physical' | 'special' | 'status'

export function normalizedDamageClass(value: string): DamageClass {
  return value === 'physical' || value === 'special' ? value : 'status'
}

const damageClassIcons: Record<DamageClass, string> = {
  physical: '/icons/damage-physical.png',
  special: '/icons/damage-special.png',
  status: '/icons/damage-status.png',
}

export function DamageClassIcon({
  value,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { value: string }) {
  const damageClass = normalizedDamageClass(value)
  return <img src={damageClassIcons[damageClass]} alt="" aria-hidden="true" {...props} />
}

export function DamageClassIconSet() {
  return (
    <span className="damage-class-icon-set" aria-hidden="true">
      <i className="damage-physical">
        <DamageClassIcon value="physical" />
      </i>
      <i className="damage-special">
        <DamageClassIcon value="special" />
      </i>
      <i className="damage-status">
        <DamageClassIcon value="status" />
      </i>
    </span>
  )
}

export function DamageClassBadge({ value, compact = false }: { value: string; compact?: boolean }) {
  const { t } = useLanguage()
  const normalizedValue = normalizedDamageClass(value)
  const damageClass = {
    physical: t('damage.physical'),
    special: t('damage.special'),
    status: t('damage.status'),
  }
  const label = damageClass[normalizedValue]
  return (
    <span
      className={`damage-badge damage-${normalizedValue}`}
      title={t('damage.class', { name: label })}
    >
      <DamageClassIcon
        value={normalizedValue}
        width={compact ? 18 : 20}
        height={compact ? 14 : 16}
      />
      {!compact && label}
    </span>
  )
}

export function AbilityBadge({ hidden }: { hidden: boolean }) {
  const { t } = useLanguage()
  return hidden ? (
    <span className="ability-badge hidden">
      <EyeOff size={13} />
      {t('ability.hidden')}
    </span>
  ) : (
    <span className="ability-badge standard">
      <Zap size={13} />
      {t('ability.common')}
    </span>
  )
}

export function GenderRatio({ rate }: { rate: number }) {
  const { t } = useLanguage()
  if (rate < 0)
    return (
      <div className="gender-ratio genderless">
        <span>Ø</span>
        <b>{t('gender.none')}</b>
      </div>
    )
  const female = rate * 12.5
  const male = 100 - female
  return (
    <div
      className="gender-ratio"
      aria-label={`${male}% ${t('gender.male')} / ${female}% ${t('gender.female')}`}
    >
      <div className="gender-values">
        {male > 0 && (
          <span className="gender-male">
            <Mars size={15} />
            <b>{male}%</b> {t('gender.male')}
          </span>
        )}
        {female > 0 && (
          <span className="gender-female">
            <Venus size={15} />
            <b>{female}%</b> {t('gender.female')}
          </span>
        )}
      </div>
      <div className="gender-bar">
        <i style={{ width: `${male}%` }} />
        <i style={{ width: `${female}%` }} />
      </div>
    </div>
  )
}

export function GenderBadge({ value }: { value: string }) {
  const { t } = useLanguage()
  const normalized = value.toLowerCase()
  if (normalized === 'male')
    return (
      <span className="gender-badge gender-male">
        <Mars size={15} />
        {t('gender.maleLabel')}
      </span>
    )
  if (normalized === 'female')
    return (
      <span className="gender-badge gender-female">
        <Venus size={15} />
        {t('gender.femaleLabel')}
      </span>
    )
  if (normalized === 'genderless')
    return (
      <span className="gender-badge genderless">
        <span>Ø</span>
        {t('gender.none')}
      </span>
    )
  return (
    <span className="gender-badge genderless">
      <span>Ø</span>
      {prettyName(value)}
    </span>
  )
}
