import { Shield, UserRound } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { prettyName } from '../../lib/api'
import type { BattleSide } from '../../lib/battle'
import { visibleBattlePokemon } from '../../lib/battle-abilities'
import { BattleDetails } from './BattleDetails'
import { ActivePokemonTooltip } from './BattlePokemonTooltip'
import { battleTooltipBindings } from './battle-tooltip'

const trainerSpriteNames = [
  'acetrainer-gen1',
  'acetrainer-gen2',
  'acetrainer-gen3',
  'acetrainer-gen4',
  'acetrainer-gen6',
] as const

export function randomTrainerSprites() {
  const player = trainerSpriteNames[Math.floor(Math.random() * trainerSpriteNames.length)]
  const opponents = trainerSpriteNames.filter((name) => name !== player)
  const opponent = opponents[Math.floor(Math.random() * opponents.length)]
  return {
    player: `https://play.pokemonshowdown.com/sprites/trainers/${player}.png`,
    opponent: `https://play.pokemonshowdown.com/sprites/trainers/${opponent}.png`,
  }
}

export function TrainerPanel({ side, opponent, sprite }: { side: BattleSide; opponent: boolean; sprite: string }) {
  const { t } = useLanguage()
  const alive = side.roster.filter((pokemon) => pokemon.hp > 0).length
  const fainted = side.roster.length - alive
  return (
    <aside
      className={`battle-trainer${opponent ? ' opponent' : ' player'}`}
      aria-label={t('battle.trainerTeam', { name: side.team.name })}
    >
      <span className="battle-trainer-sprite" aria-hidden="true">
        <UserRound />
        <img
          src={sprite}
          alt=""
          width={76}
          height={76}
          onError={({ currentTarget }) => {
            currentTarget.hidden = true
          }}
        />
      </span>
      <span className="battle-trainer-copy">
        <b>{side.team.name}</b>
        <small>{t('battle.teamStatus', { alive, fainted })}</small>
      </span>
      <ul className="battle-roster-icons" aria-label={t('battle.rosterStatus', { name: side.team.name })}>
        {side.roster.map((member) => {
          const pokemon = visibleBattlePokemon(member, opponent)
          const tooltipId = `battle-roster-${side.team.id}-${pokemon.member.id}`
          const faintedPokemon = pokemon.hp === 0
          const homeSprite = pokemon.member.shiny ? pokemon.pokemon.homeShinySprite : pokemon.pokemon.homeSprite
          const rosterLabel = t(
            faintedPokemon
              ? 'battle.rosterFainted'
              : pokemon.hasEnteredBattle
                ? 'battle.rosterUsed'
                : 'battle.rosterUnused',
            { name: prettyName(pokemon.pokemon.name) },
          )
          return (
            <li
              key={pokemon.member.id}
              className={`${pokemon.hasEnteredBattle ? 'is-used' : 'is-unused'}${faintedPokemon ? ' is-fainted' : ''}`}
            >
              <BattleDetails
                label={t('battle.activePokemonDetails', { name: prettyName(pokemon.pokemon.name) })}
                tooltip={<ActivePokemonTooltip id={tooltipId} pokemon={pokemon} opponent={opponent} />}
              >
                {(detailProps, detailTooltip) => (
                  <span
                    {...(pokemon.hasEnteredBattle ? detailProps : {})}
                    className={pokemon.hasEnteredBattle ? 'battle-roster-tooltip-trigger' : undefined}
                    tabIndex={pokemon.hasEnteredBattle ? 0 : undefined}
                    aria-label={rosterLabel}
                    aria-describedby={pokemon.hasEnteredBattle && detailTooltip ? tooltipId : undefined}
                    {...battleTooltipBindings(tooltipId)}
                  >
                    {pokemon.hasEnteredBattle && homeSprite ? (
                      <img src={homeSprite} alt="" width={30} height={30} />
                    ) : pokemon.hasEnteredBattle ? (
                      <Shield aria-hidden="true" />
                    ) : (
                      <span className="battle-pokeball" aria-hidden="true" />
                    )}
                    {pokemon.hasEnteredBattle && detailTooltip}
                  </span>
                )}
              </BattleDetails>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
