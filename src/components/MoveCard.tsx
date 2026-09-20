import { BookOpen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { prettyName } from '../lib/api'
import type { NamedResource } from '../types'
import { DamageClassBadge } from './SemanticBadges'
import { TypeBadge } from './TypeBadge'
import { useLanguage, type Translate, type TranslationKey } from '../contexts/LanguageContext'

type MoveDetail = {
  name: string
  type: NamedResource
  damage_class: NamedResource
  power: number | null
  accuracy: number | null
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
  const { t } = useLanguage()
  const cardRef = useRef<HTMLAnchorElement>(null)
  const [visible, setVisible] = useState(false)
  const { data } = useApi<MoveDetail>(visible ? move.url : null)

  useEffect(() => {
    const target = cardRef.current
    if (!target || visible) return
    if (!('IntersectionObserver' in window)) { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '250px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [visible])

  const learning = moveLearningLabel(method, level, t)
  return (
    <Link ref={cardRef} className={`move-card ${data ? `damage-border-${data.damage_class.name}` : ''}`} to={`/explorar/move/${move.name}`}>
      <div className="move-card-title"><b>{prettyName(move.name)}</b>{data && <DamageClassBadge value={data.damage_class.name} compact />}</div>
      <div className="move-card-meta">
        <div className="move-learning"><BookOpen aria-hidden="true" /><span>{t('move.learning')}</span><strong>{learning}</strong></div>
        {data ? <TypeBadge type={data.type.name} /> : <i className="move-meta-placeholder" />}
      </div>
      {data && <div className="move-numbers"><span>{t('move.power')} <b>{data.power ?? '—'}</b></span><span>{t('move.accuracy')} <b>{data.accuracy ?? '—'}</b></span></div>}
    </Link>
  )
}
