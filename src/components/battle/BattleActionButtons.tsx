import { useId } from 'react'
import { Shield } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatDecimal, formatNumber, prettyName } from '../../lib/api'
import { currentBattleStats, battleMoveEffectiveness, type BattlePokemon } from '../../lib/battle'
import { DamageClassBadge } from '../SemanticBadges'
import { TypeBadge } from '../TypeBadge'
import { TeraTypeBadge } from '../TeraTypeBadge'
import { BattleDetails, BattleTooltipContent } from './BattleDetails'
import { GenderIcon, BattleTooltipStats, ResourceDetails } from './BattlePokemonTooltip'
import { battleTooltipBindings } from './battle-tooltip'
import { moveDescription } from './battle-text'

export function BattleMoveButton({
  move,
  opponent,
  onChoose,
  disabled = false,
}: {
  move: BattlePokemon['moves'][number]
  opponent: BattlePokemon
  onChoose: () => void
  disabled?: boolean
}) {
  const tooltipId = useId()
  const { apiLanguage, language, t } = useLanguage()
  const description =
    move.data.name === 'struggle' ? t('battle.struggleDescription') : moveDescription(move.data, apiLanguage)
  const number = (value: number | null) => (value === null ? '—' : formatNumber(value, language))
  const multiplier = battleMoveEffectiveness(move.data, opponent)
  const formattedMultiplier = formatDecimal(multiplier, language, 2)
  const effectiveness =
    multiplier === 0
      ? t('battle.effectiveness.none')
      : multiplier === 1
        ? t('battle.effectiveness.normal')
        : multiplier === 2 || multiplier === 4
          ? t('battle.effectiveness.super', { multiplier: formattedMultiplier })
          : t('battle.effectiveness.reduced', { multiplier: formattedMultiplier })
  return (
    <BattleDetails
      label={t('battle.activePokemonDetails', { name: prettyName(move.data.name) })}
      tooltip={
        <BattleTooltipContent id={tooltipId} className="battle-move-tooltip">
          <span className="battle-tooltip-damage">
            <span>{t('move.damageClass')}</span>
            <DamageClassBadge value={move.data.damageClass} />
          </span>
          <span>
            {t('move.power')}: <b>{number(move.data.power)}</b>
          </span>
          <span>
            {t('move.accuracy')}: <b>{number(move.data.accuracy)}</b>
          </span>
          <span>
            {t('move.priority')}: <b>{formatNumber(move.data.priority, language)}</b>
          </span>
          <span>
            {t('battle.effectiveness')}: <b>{effectiveness}</b>
          </span>
          <span className="battle-tooltip-description">
            <b>{t('resource.field.description')}</b>
            <span>{description || t('battle.moveDescriptionUnavailable')}</span>
          </span>
        </BattleTooltipContent>
      }
      action={true}
    >
      {(detailProps, detailTooltip) => (
        <button
          className="battle-move-button"
          {...detailProps}
          disabled={disabled || move.pp <= 0}
          aria-label={prettyName(move.data.name)}
          aria-describedby={detailTooltip ? tooltipId : undefined}
          onClick={onChoose}
          {...battleTooltipBindings(tooltipId)}
        >
          <span>{prettyName(move.data.name)}</span>
          <TypeBadge type={move.data.type} iconOnly />
          <span className="battle-move-meta">
            <small>
              {move.data.name === 'struggle' ? '—' : t('battle.pp', { current: move.pp, total: move.data.pp })}
            </small>
            <small>
              {t('move.priority')}: <b>{formatNumber(move.data.priority, language)}</b>
            </small>
          </span>
          {detailTooltip}
        </button>
      )}
    </BattleDetails>
  )
}

export function BattleSwitchButton({
  pokemon,
  onChoose,
  disabled = false,
}: {
  pokemon: BattlePokemon
  onChoose: () => void
  disabled?: boolean
}) {
  const tooltipId = useId()
  const { language, t } = useLanguage()
  const hpPercentage = Math.round((pokemon.hp / pokemon.maxHp) * 100)
  const homeSprite = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
  return (
    <BattleDetails
      label={t('battle.activePokemonDetails', { name: prettyName(pokemon.pokemon.name) })}
      tooltip={
        <BattleTooltipContent id={tooltipId} className="battle-switch-tooltip">
          <span className="battle-switch-tooltip-title">
            <b>
              {prettyName(pokemon.pokemon.name)}
              <GenderIcon gender={pokemon.member.gender} />
            </b>
            <span>{t('battle.level', { level: formatNumber(pokemon.member.level, language) })}</span>
          </span>
          <span className="battle-switch-tooltip-types">
            <span>{t('resource.field.types')}</span>
            <span className="battle-switch-type-list">
              {pokemon.pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </span>
            <span className="battle-switch-tooltip-tera">
              {t('teams.tera')}: <TeraTypeBadge type={pokemon.member.tera} />
            </span>
          </span>
          <span>
            {t('battle.hpRemaining')}: <b>{formatNumber(hpPercentage, language)}%</b> (
            {formatNumber(pokemon.hp, language)}/{formatNumber(pokemon.maxHp, language)} HP)
          </span>
          <BattleTooltipStats
            className="battle-switch-stats"
            stats={currentBattleStats(pokemon)}
            originalStats={pokemon.originalStats}
          />
          <span className="battle-switch-resources">
            <span className="battle-resource-section">
              <b>{t('resource.field.ability')}</b>
              <ResourceDetails resource={pokemon.ability} />
            </span>
            <span className="battle-resource-section">
              <b>{t('resource.field.item')}</b>
              {pokemon.item ? (
                <ResourceDetails resource={pokemon.item} item />
              ) : (
                <span className="battle-resource-empty">{t('battle.noItem')}</span>
              )}
            </span>
          </span>
          <span className="battle-switch-tooltip-moves">
            <b>{t('battle.availableMoves')}</b>
            <span>
              {pokemon.moves.map((move, index) => (
                <span className="battle-switch-move" key={`${move.data.name}-${index}`}>
                  <span className="battle-switch-move-name">{prettyName(move.data.name)}</span>
                  <span className="battle-switch-move-icons">
                    <DamageClassBadge value={move.data.damageClass} compact />
                    <TypeBadge type={move.data.type} iconOnly />
                  </span>
                  <small>
                    {move.data.name === 'struggle' ? '—' : t('battle.pp', { current: move.pp, total: move.data.pp })}
                  </small>
                </span>
              ))}
            </span>
          </span>
        </BattleTooltipContent>
      }
      action={true}
    >
      {(detailProps, detailTooltip) => (
        <button
          className="battle-switch-button"
          {...detailProps}
          disabled={disabled}
          aria-label={prettyName(pokemon.pokemon.name)}
          aria-describedby={detailTooltip ? tooltipId : undefined}
          onClick={onChoose}
          {...battleTooltipBindings(tooltipId)}
        >
          <span className="battle-switch-summary">
            <span className="battle-switch-sprite" aria-hidden="true">
              {homeSprite ? <img src={homeSprite} alt="" /> : <Shield />}
            </span>
            <span className="battle-switch-copy">
              <b>{prettyName(pokemon.pokemon.name)}</b>
              <small>
                {t('battle.healthSummary', {
                  current: formatNumber(pokemon.hp, language),
                  total: formatNumber(pokemon.maxHp, language),
                  percentage: formatNumber(hpPercentage, language),
                })}
              </small>
            </span>
          </span>
          {detailTooltip}
        </button>
      )}
    </BattleDetails>
  )
}
