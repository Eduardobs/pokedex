import { Clock3, Sparkles } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { supplementalMoveEffect, type SupplementalMoveEffect } from '../lib/battle-move-effects'

type Translator = ReturnType<typeof useLanguage>['t']
type Detail = { label: string; value: string }

function exhaustiveEffect(effect: never): never {
  throw new Error(`Unsupported supplemental move effect: ${JSON.stringify(effect)}`)
}

function effectDetails(effect: SupplementalMoveEffect, t: Translator): Detail[] {
  const mechanic = (value: string) => ({ label: t('moveSupplemental.mechanic'), value })
  const duration = (turns: number) => ({
    label: t('moveSupplemental.duration'),
    value: t('moveSupplemental.turns', { turns }),
  })
  switch (effect.kind) {
    case 'revive-ally':
      return [mechanic(t('moveSupplemental.kind.reviveAlly'))]
    case 'lunar-blessing':
      return [mechanic(t('moveSupplemental.kind.lunarBlessing'))]
    case 'wish':
      return [mechanic(t('moveSupplemental.kind.wish'))]
    case 'encore':
      return [
        mechanic(t('moveSupplemental.kind.encore')),
        {
          label: t('moveSupplemental.duration'),
          value: t('moveSupplemental.turnRange', {
            minimum: effect.minimumTurns,
            maximum: effect.maximumTurns,
          }),
        },
      ]
    case 'taunt':
      return [mechanic(t('moveSupplemental.kind.taunt')), duration(effect.turns)]
    case 'fixed-damage':
      return [
        mechanic(t('moveSupplemental.kind.fixedDamage')),
        {
          label: t('moveSupplemental.calculation'),
          value: t(`moveSupplemental.fixedDamage.${effect.amount}`),
        },
      ]
    case 'equalize-hp':
      return [mechanic(t('moveSupplemental.kind.equalizeHp'))]
    case 'substitute':
      return [mechanic(t('moveSupplemental.kind.substitute'))]
    case 'curse':
      return [mechanic(t('moveSupplemental.kind.curse'))]
    case 'reset-stages':
      return [
        mechanic(t('moveSupplemental.kind.resetStages')),
        { label: t('moveSupplemental.target'), value: t(`moveSupplemental.target.${effect.target}`) },
      ]
    case 'cure-team-status':
      return [mechanic(t('moveSupplemental.kind.cureTeamStatus'))]
    case 'set-weather':
      return [
        mechanic(t('moveSupplemental.kind.setWeather')),
        { label: t('moveSupplemental.fieldEffect'), value: t(`battle.fieldEffect.${effect.weather}`) },
        duration(effect.turns),
      ]
    case 'set-terrain':
      return [
        mechanic(t('moveSupplemental.kind.setTerrain')),
        { label: t('moveSupplemental.fieldEffect'), value: t(`battle.fieldEffect.${effect.terrain}`) },
        duration(effect.turns),
      ]
    case 'clear-terrain':
      return [mechanic(t('moveSupplemental.kind.clearTerrain'))]
    case 'set-trick-room':
      return [mechanic(t('moveSupplemental.kind.setTrickRoom')), duration(effect.turns)]
    case 'clear-target-screens':
      return [mechanic(t('moveSupplemental.kind.clearTargetScreens'))]
    case 'set-volatile':
      return [
        mechanic(t('moveSupplemental.kind.setVolatile')),
        { label: t('moveSupplemental.target'), value: t(`battle.status.${effect.condition}`) },
        ...(effect.turns ? [duration(effect.turns)] : []),
      ]
    case 'set-side-condition': {
      const conditionKey = {
        reflect: 'reflect',
        'light-screen': 'lightScreen',
        'aurora-veil': 'auroraVeil',
        tailwind: 'tailwind',
        safeguard: 'safeguard',
        'crafty-shield': 'craftyShield',
      } as const
      return [
        mechanic(t('moveSupplemental.kind.setSideCondition')),
        {
          label: t('moveSupplemental.fieldEffect'),
          value: t(`battle.fieldEffect.${conditionKey[effect.condition]}`),
        },
        duration(effect.turns),
        ...(effect.requiresWeather
          ? [
              {
                label: t('moveSupplemental.requirement'),
                value: t('moveSupplemental.requiresWeather', {
                  weather: t(`battle.fieldEffect.${effect.requiresWeather}`),
                }),
              },
            ]
          : []),
      ]
    }
    default:
      return exhaustiveEffect(effect)
  }
}

export function MoveSupplementalDetails({ moveName }: { moveName: string }) {
  const { t } = useLanguage()
  const effect = supplementalMoveEffect(moveName)
  if (!effect) return null
  const details = effectDetails(effect, t)
  return (
    <section className="move-supplemental" aria-labelledby="move-supplemental-title">
      <div className="move-supplemental-heading">
        <span className="detail-field-icon" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <div>
          <h2 id="move-supplemental-title">{t('moveSupplemental.title')}</h2>
          <p>{t('moveSupplemental.description')}</p>
        </div>
      </div>
      <dl>
        {details.map((detail) => (
          <div key={detail.label}>
            <dt>
              <Clock3 size={14} aria-hidden="true" />
              {detail.label}
            </dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
