import { Bubbles, CircleDotDashed, Mountain, Network, type LucideIcon } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { BattleField, BattleHazards, BattleSide, BattleSideConditions } from '../../lib/battle'

const hazardPresentation: {
  key: keyof BattleHazards
  translationKey: 'stealthRock' | 'spikes' | 'toxicSpikes' | 'stickyWeb'
  Icon: LucideIcon
}[] = [
  { key: 'stealthRock', translationKey: 'stealthRock', Icon: Mountain },
  { key: 'spikes', translationKey: 'spikes', Icon: CircleDotDashed },
  { key: 'toxicSpikes', translationKey: 'toxicSpikes', Icon: Bubbles },
  { key: 'stickyWeb', translationKey: 'stickyWeb', Icon: Network },
]

const sideConditionKeys: (keyof BattleSideConditions)[] = [
  'reflect',
  'lightScreen',
  'auroraVeil',
  'tailwind',
  'safeguard',
  'craftyShield',
]

export function BattleFieldEffects({
  field,
  player,
  opponent,
}: {
  field: BattleField
  player: BattleSide
  opponent: BattleSide
}) {
  const { t } = useLanguage()
  const effects = [
    ...(field.weather ? [{ id: field.weather, turns: field.weatherTurns }] : []),
    ...(field.terrain ? [{ id: field.terrain }] : []),
    ...(field.trickRoomTurns > 0 ? [{ id: 'trick-room' as const }] : []),
    ...(['player', 'opponent'] as const).flatMap((sideName) => {
      const side = sideName === 'player' ? player : opponent
      return [
        ...(side.futureSight
          ? [{ id: 'future-sight' as const, side: sideName, turns: Math.min(2, side.futureSight.turns) }]
          : []),
        ...sideConditionKeys.flatMap((condition) =>
          side.conditions[condition] > 0 ? [{ id: condition, side: sideName }] : [],
        ),
      ]
    }),
  ]
  if (!effects.length) return null
  return (
    <div className="battle-field-effects" aria-live="polite" role="group" aria-label={t('battle.fieldEffects')}>
      {effects.map((effect) => (
        <span key={`${effect.id}-${'side' in effect ? effect.side : 'field'}`}>
          {t(`battle.fieldEffect.${effect.id}`)}
          {'turns' in effect && ` · ${t('battle.turnsRemaining', { turns: effect.turns ?? 0 })}`}
          {'side' in effect && ` · ${t(`battle.fieldSide.${effect.side}`)}`}
        </span>
      ))}
    </div>
  )
}

export function BattleSideHazards({ hazards, side }: { hazards: BattleHazards; side: 'player' | 'opponent' }) {
  const { t } = useLanguage()
  const activeHazards = hazardPresentation.filter(({ key }) => {
    const value = hazards[key]
    return typeof value === 'number' ? value > 0 : value
  })
  if (!activeHazards.length) return null

  return (
    <div
      className={`battle-side-hazards ${side}`}
      role="group"
      aria-label={t('battle.hazardsOnSide', { side: t(`battle.fieldSide.${side}`) })}
    >
      {activeHazards.map(({ key, translationKey, Icon }) => {
        const layers = hazards[key]
        const label = t(`battle.hazard.${translationKey}`)
        const layeredLabel =
          typeof layers === 'number' && layers > 1 ? t('battle.hazardLayers', { hazard: label, layers }) : label
        return (
          <span
            key={key}
            className={`battle-hazard battle-hazard--${translationKey}`}
            role="img"
            aria-label={layeredLabel}
          >
            <Icon aria-hidden="true" />
            {typeof layers === 'number' && layers > 1 && <b aria-hidden="true">{layers}</b>}
            <span className="battle-hazard-label" aria-hidden="true">
              {layeredLabel}
            </span>
          </span>
        )
      })}
    </div>
  )
}
