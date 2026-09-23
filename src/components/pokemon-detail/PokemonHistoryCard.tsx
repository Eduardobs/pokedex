import { Activity, History, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage, type TranslationKey } from '../../contexts/LanguageContext'
import { localizedApiTerm, prettyName } from '../../lib/api'
import type { Pokemon } from '../../types'
import { AbilityBadge } from '../SemanticBadges'
import { TypeBadge } from '../TypeBadge'

type Props = {
  pokemon: Pokemon
}

export function PokemonHistoryCard({ pokemon }: Props) {
  const { language, t } = useLanguage()
  const statKeys: Record<string, TranslationKey> = {
    attack: 'stats.attack',
    defense: 'stats.defense',
    special: 'stats.special',
    'special-attack': 'stats.specialAttack',
    'special-defense': 'stats.specialDefense',
    speed: 'stats.speed',
  }
  const hasHistory = Boolean(pokemon.past_stats?.length || pokemon.past_types?.length || pokemon.past_abilities?.length)

  return (
    <article className="info-card technical-card pokemon-history-card">
      <h2>
        <History />
        {t('detail.history')}
      </h2>
      <p className="history-description">{t('detail.historyDesc')}</p>
      {!hasHistory && <p className="muted">{t('detail.noHistoricalData')}</p>}
      {hasHistory && (
        <div className="history-sections">
          {Boolean(pokemon.past_stats?.length) && (
            <section>
              <h3>
                <Activity aria-hidden="true" />
                {t('detail.pastStats')}
              </h3>
              <div className="history-generation-list">
                {pokemon.past_stats?.map(({ generation, stats }) => (
                  <div className="history-generation" key={generation.name}>
                    <b>
                      {t('detail.throughGeneration', {
                        generation: localizedApiTerm(generation.name, language),
                      })}
                    </b>
                    <div>
                      {stats.map(({ base_stat, stat }) => {
                        const key = statKeys[stat.name]
                        const label =
                          stat.name === 'hp'
                            ? t('pokedex.sort.hp')
                            : key
                              ? t(key)
                              : localizedApiTerm(stat.name, language)
                        return (
                          <span className="history-stat" key={stat.name}>
                            <small>{label}</small>
                            <strong>{base_stat}</strong>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {Boolean(pokemon.past_types?.length) && (
            <section>
              <h3>
                <ShieldCheck aria-hidden="true" />
                {t('detail.pastTypes')}
              </h3>
              <div className="history-generation-list">
                {pokemon.past_types?.map(({ generation, types }) => (
                  <div className="history-generation" key={generation.name}>
                    <b>
                      {t('detail.throughGeneration', {
                        generation: localizedApiTerm(generation.name, language),
                      })}
                    </b>
                    <div>
                      {types.map(({ type }) => (
                        <TypeBadge key={type.name} type={type.name} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {Boolean(pokemon.past_abilities?.length) && (
            <section>
              <h3>
                <Sparkles aria-hidden="true" />
                {t('detail.pastAbilities')}
              </h3>
              <div className="history-generation-list">
                {pokemon.past_abilities?.map(({ generation, abilities }) => (
                  <div className="history-generation" key={generation.name}>
                    <b>
                      {t('detail.throughGeneration', {
                        generation: localizedApiTerm(generation.name, language),
                      })}
                    </b>
                    <div>
                      {abilities.map(({ ability, is_hidden, slot }) =>
                        ability ? (
                          <Link
                            className="history-ability"
                            key={`${ability.name}-${slot}`}
                            to={`/explorar/ability/${encodeURIComponent(ability.name)}`}
                          >
                            <span>{prettyName(ability.name)}</span>
                            <AbilityBadge hidden={is_hidden} />
                          </Link>
                        ) : (
                          <span className="history-empty-slot" key={`empty-${slot}`}>
                            {t('detail.emptyAbilitySlot', { slot })}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  )
}
