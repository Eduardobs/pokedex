import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { prettyName } from '../lib/api'
import type { NamedResource } from '../types'
import { DamageClassBadge } from './SemanticBadges'
import { TypeBadge } from './TypeBadge'
import { useLanguage } from '../contexts/LanguageContext'

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

  const learning = method === 'level-up' ? t('move.level', { level }) : prettyName(method)
  return (
    <Link ref={cardRef} className={`move-card ${data ? `damage-border-${data.damage_class.name}` : ''}`} to={`/explorar/move/${move.name}`}>
      <div className="move-card-title"><b>{prettyName(move.name)}</b>{data && <DamageClassBadge value={data.damage_class.name} compact />}</div>
      <div className="move-card-meta"><span>{learning}</span>{data ? <TypeBadge type={data.type.name} /> : <i className="move-meta-placeholder" />}</div>
      {data && <div className="move-numbers"><span>{t('move.power')} <b>{data.power ?? '—'}</b></span><span>{t('move.accuracy')} <b>{data.accuracy ?? '—'}</b></span></div>}
    </Link>
  )
}
