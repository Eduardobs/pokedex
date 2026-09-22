import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useIntersectionVisibility } from '../hooks/useIntersectionVisibility'
import { localizedName, prettyName } from '../lib/api'
import type { NamedResource } from '../types'
import { DamageClassBadge } from './SemanticBadges'
import { TypeBadge } from './TypeBadge'
import { useLanguage, type Translate, type TranslationKey } from '../contexts/LanguageContext'

type MoveDetail = {
  name: string
  names?: { name: string; language: NamedResource }[]
  type: NamedResource
  damage_class: NamedResource
  power: number | null
  accuracy: number | null
  pp: number | null
  priority: number
}

type Props = {
  move: NamedResource
  method: string
  level: number
}

const learningMethodKeys: Record<string, TranslationKey> = {
  machine: 'move.method.machine',
  egg: 'move.method.egg',
  tutor: 'move.method.tutor',
  'form-change': 'move.method.formChange',
  'zygarde-cube': 'move.method.zygardeCube',
  'stadium-surfing-pikachu': 'move.method.stadiumSurfingPikachu',
  'light-ball-egg': 'move.method.lightBallEgg',
  'colosseum-purification': 'move.method.colosseumPurification',
  'xd-shadow': 'move.method.xdShadow',
  'xd-purification': 'move.method.xdPurification',
  unknown: 'move.method.unknown',
}

export function moveLearningLabel(method: string, level: number, t: Translate) {
  if (method === 'level-up') return t('move.level', { level })
  return moveLearningMethodLabel(method, t)
}

export function moveLearningMethodLabel(method: string, t: Translate) {
  if (method === 'level-up') return t('move.method.levelUp')
  const translationKey = learningMethodKeys[method]
  return translationKey ? t(translationKey) : prettyName(method)
}

export function MoveCard({ move, method, level }: Props) {
  const { apiLanguage, t } = useLanguage()
  const { targetRef: cardRef, visible } = useIntersectionVisibility<HTMLAnchorElement>(false, '250px')
  const { data } = useApi<MoveDetail>(visible ? move.url : null)

  const learning = moveLearningLabel(method, level, t)
  return (
    <Link ref={cardRef} className={`move-card ${data ? `damage-border-${data.damage_class.name}` : ''}`} to={`/explorar/move/${move.name}`}>
      <div className="move-card-title"><b>{localizedName(data?.names, apiLanguage) || prettyName(move.name)}</b>{data && <DamageClassBadge value={data.damage_class.name} />}</div>
      <div className="move-card-meta">
        <div className="move-learning"><BookOpen aria-hidden="true" /><span>{t('move.learning')}</span><strong>{learning}</strong></div>
        {data ? <TypeBadge type={data.type.name} /> : <i className="move-meta-placeholder" />}
      </div>
      {data && <div className="move-numbers"><span>{t('move.power')} <b>{data.power ?? '—'}</b></span><span>{t('move.accuracy')} <b>{data.accuracy ?? '—'}</b></span><span>{t('move.pp')} <b>{data.pp ?? '—'}</b></span><span>{t('move.priority')} <b>{data.priority}</b></span></div>}
    </Link>
  )
}
