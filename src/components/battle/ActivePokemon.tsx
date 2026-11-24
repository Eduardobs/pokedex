import { Shield } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { BATTLE_TIMING } from '../../config/app'
import { useLanguage } from '../../contexts/LanguageContext'
import type { TranslationKey } from '../../i18n/types'
import { formatNumber, prettyName } from '../../lib/api'
import type { BattlePokemon, BattleStages, BattleSide, BattleVolatileCondition } from '../../lib/battle'
import { abilityTypes, visibleBattlePokemon } from '../../lib/battle-abilities'
import { TeraTypeBadge } from '../TeraTypeBadge'
import { TypeBadge } from '../TypeBadge'
import { BattleDetails } from './BattleDetails'
import { BattleSprite } from './BattleSprite'
import { ActivePokemonTooltip, GenderIcon, MajorStatusBadge } from './BattlePokemonTooltip'
import { battleTooltipBindings } from './battle-tooltip'

const battleStageShortStatKeys: Record<keyof BattleStages, TranslationKey> = {
  accuracy: 'battle.statShort.accuracy',
  evasion: 'battle.statShort.evasion',
  attack: 'battle.statShort.attack',
  defense: 'battle.statShort.defense',
  specialAttack: 'battle.statShort.specialAttack',
  specialDefense: 'battle.statShort.specialDefense',
  speed: 'battle.statShort.speed',
}

function useAnimatedHealth(target: number) {
  const [displayed, setDisplayed] = useState(target)
  const displayedRef = useRef(target)
  useEffect(() => {
    const start = displayedRef.current
    if (start === target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      displayedRef.current = target
      setDisplayed(target)
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / BATTLE_TIMING.hpTransitionMs)
      const next = Math.round(start + (target - start) * progress)
      displayedRef.current = next
      setDisplayed(next)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [target])
  return displayed
}

function HealthBar({ pokemon }: { pokemon: BattlePokemon }) {
  const { language, t } = useLanguage()
  const displayedHp = useAnimatedHealth(pokemon.hp)
  const percent = Math.max(0, Math.round((pokemon.hp / pokemon.maxHp) * 100))
  const formattedPercent = formatNumber(percent, language)
  const stages = Object.entries(pokemon.stages)
    .filter(([, value]) => value !== 0)
    .map(([stat, value]) => ({ stat: stat as keyof typeof pokemon.stages, value }))
  return (
    <div className="battle-health">
      <div className="battle-health-copy">
        <strong>
          {prettyName(pokemon.pokemon.name)}
          <span className="battle-health-identity">
            <GenderIcon gender={pokemon.member.gender} />
            <span className={`battle-active-types${pokemon.terastallized ? ' is-tera' : ''}`}>
              {pokemon.terastallized ? (
                <span aria-label={t('teams.tera')} title={t('teams.tera')}>
                  <TeraTypeBadge type={pokemon.member.tera} iconOnly />
                </span>
              ) : (
                abilityTypes(pokemon).map((type) => <TypeBadge key={type} type={type} iconOnly />)
              )}
            </span>
          </span>
        </strong>
        <span className="battle-health-level">
          {t('battle.level', { level: formatNumber(pokemon.member.level, language) })}
        </span>
      </div>
      <div className="battle-health-bar">
        <div
          className={`battle-health-track${percent <= 20 ? ' is-critical' : percent <= 50 ? ' is-low' : ''}`}
          role="meter"
          aria-label={t('battle.health', { name: prettyName(pokemon.pokemon.name) })}
          aria-valuemin={0}
          aria-valuemax={pokemon.maxHp}
          aria-valuenow={pokemon.hp}
        >
          <span
            className="battle-health-fill"
            style={{ width: `${percent}%`, transitionDuration: `${BATTLE_TIMING.hpTransitionMs}ms` }}
          />
          <span className="battle-health-value">
            {formatNumber(displayedHp, language)} / {formatNumber(pokemon.maxHp, language)}
          </span>
        </div>
        <span className="battle-health-percentage">
          {t('battle.healthPercentage', { percentage: formattedPercent })}
        </span>
      </div>
      <div className="battle-stat-modifiers" aria-label={t('battle.statModifiers')}>
        {stages.map(({ stat, value }) => (
          <span key={stat} className={value > 0 ? 'raised' : 'lowered'}>
            {t(battleStageShortStatKeys[stat])} {value > 0 ? `+${value}` : value}
          </span>
        ))}
      </div>
      <div className="battle-health-meta">
        <span className="battle-pokemon-conditions">
          {pokemon.status && <MajorStatusBadge status={pokemon.status} />}
          {pokemon.confusionTurns > 0 && <span>{t('battle.status.confusion')}</span>}
          {pokemon.attracted && <span>{t('battle.status.attraction')}</span>}
          {pokemon.cursed && <span>{t('battle.status.curse')}</span>}
          {pokemon.substituteHp > 0 && <span>{t('battle.status.substitute')}</span>}
          {(Object.keys(pokemon.volatile) as BattleVolatileCondition[]).map((condition) => (
            <span key={condition}>{t(`battle.status.${condition}`)}</span>
          ))}
          {pokemon.encoreTurns > 0 && <span>{t('battle.pokemonCondition.encore')}</span>}
          {pokemon.tauntTurns > 0 && <span>{t('battle.pokemonCondition.taunt')}</span>}
        </span>
      </div>
    </div>
  )
}

export function ActivePokemon({
  side,
  opponent = false,
  teraControl,
  activeMove,
  hit = false,
  missed = false,
}: {
  side: BattleSide
  opponent?: boolean
  teraControl?: ReactNode
  activeMove?: string
  hit?: boolean
  missed?: boolean
}) {
  const tooltipId = useId()
  const { t } = useLanguage()
  const pokemon = visibleBattlePokemon(side.roster[side.active], opponent)
  const sprite = pokemon.member.shiny
    ? opponent
      ? pokemon.pokemon.showdownFrontShinySprite
      : pokemon.pokemon.showdownBackShinySprite
    : opponent
      ? pokemon.pokemon.showdownFrontSprite
      : pokemon.pokemon.showdownBackSprite
  const fallback = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
  return (
    <article className={`battle-active${opponent ? ' opponent' : ' player'}`}>
      <div className="battle-active-data">
        <HealthBar key={pokemon.member.id} pokemon={pokemon} />
        {teraControl}
      </div>
      <div className="battle-pokemon-visual">
        {missed && (
          <span
            className="battle-move-announcement"
            style={{ animationDuration: `${BATTLE_TIMING.resultDisplayMs}ms` }}
            role="status"
          >
            {t('battle.missed')}
          </span>
        )}
        {activeMove && (
          <span
            className="battle-move-announcement"
            style={{ animationDuration: `${BATTLE_TIMING.actionDelayMs}ms` }}
            role="status"
          >
            {prettyName(activeMove)}
          </span>
        )}
        <BattleDetails
          label={t('battle.activePokemonDetails', { name: prettyName(pokemon.pokemon.name) })}
          tooltip={<ActivePokemonTooltip id={tooltipId} pokemon={pokemon} opponent={opponent} />}
        >
          {(detailProps, detailTooltip) => (
            <span
              className="battle-sprite-trigger"
              {...detailProps}
              tabIndex={0}
              aria-label={t('battle.activePokemonDetails', { name: prettyName(pokemon.pokemon.name) })}
              aria-describedby={detailTooltip ? tooltipId : undefined}
              {...battleTooltipBindings(tooltipId)}
            >
              <BattleSprite
                key={pokemon.member.id}
                attacking={Boolean(activeMove)}
                hit={hit}
                fainted={pokemon.hp === 0}
              >
                {sprite ? (
                  <img
                    src={sprite}
                    alt={prettyName(pokemon.pokemon.name)}
                    width="180"
                    height="180"
                    onError={({ currentTarget }) => {
                      if (!fallback || currentTarget.src === fallback) return
                      currentTarget.onerror = null
                      currentTarget.src = fallback
                    }}
                  />
                ) : fallback ? (
                  <img src={fallback} alt={prettyName(pokemon.pokemon.name)} width="180" height="180" />
                ) : (
                  <Shield aria-hidden="true" />
                )}
              </BattleSprite>
              <span className="battle-active-tooltip-anchor">{detailTooltip}</span>
            </span>
          )}
        </BattleDetails>
      </div>
    </article>
  )
}
