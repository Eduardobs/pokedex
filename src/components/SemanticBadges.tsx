import { Activity, EyeOff, Mars, Sparkles, Swords, Venus, Zap } from 'lucide-react'
import { prettyName } from '../lib/api'

const damageClass = {
  physical: { label: 'Físico', icon: Swords },
  special: { label: 'Especial', icon: Sparkles },
  status: { label: 'Status', icon: Activity },
}

export function DamageClassBadge({ value, compact = false }: { value: string; compact?: boolean }) {
  const config = damageClass[value as keyof typeof damageClass] ?? damageClass.status
  const Icon = config.icon
  return <span className={`damage-badge damage-${value}`} title={`Classe: ${config.label}`}><Icon size={compact ? 13 : 15} aria-hidden="true" />{!compact && config.label}</span>
}

export function AbilityBadge({ hidden }: { hidden: boolean }) {
  return hidden
    ? <span className="ability-badge hidden"><EyeOff size={13} />Oculta</span>
    : <span className="ability-badge standard"><Zap size={13} />Comum</span>
}

export function GenderRatio({ rate }: { rate: number }) {
  if (rate < 0) return <div className="gender-ratio genderless"><span>Ø</span><b>Sem gênero</b></div>
  const female = rate * 12.5
  const male = 100 - female
  return (
    <div className="gender-ratio" aria-label={`${male}% masculino e ${female}% feminino`}>
      <div className="gender-values">
        {male > 0 && <span className="gender-male"><Mars size={15} /><b>{male}%</b> masculino</span>}
        {female > 0 && <span className="gender-female"><Venus size={15} /><b>{female}%</b> feminino</span>}
      </div>
      <div className="gender-bar"><i style={{ width: `${male}%` }} /><i style={{ width: `${female}%` }} /></div>
    </div>
  )
}

export function GenderBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  if (normalized === 'male') return <span className="gender-badge gender-male"><Mars size={15} />Masculino</span>
  if (normalized === 'female') return <span className="gender-badge gender-female"><Venus size={15} />Feminino</span>
  return <span className="gender-badge genderless"><span>Ø</span>{prettyName(value)}</span>
}
