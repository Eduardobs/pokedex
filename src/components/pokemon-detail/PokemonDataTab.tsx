import { Database, ExternalLink, Gamepad2, History, Image, PackageOpen, Volume2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { API_BASE } from '../../lib/api'
import type { Pokemon, Species } from '../../types'
import { ResourceValue } from '../ResourceValue'

type Props = {
  pokemon: Pokemon
  species: Species | null
  speciesLoading: boolean
}

export function PokemonDataTab({ pokemon, species, speciesLoading }: Props) {
  const { t } = useLanguage()
  const speciesFlag = (value: boolean | undefined) => speciesLoading
    ? <span className="muted">{t('common.loadingShort')}</span>
    : value === undefined
      ? <span className="muted">—</span>
      : <span className={`boolean ${value}`}>{t(value ? 'common.yes' : 'common.no')}</span>
  const sprites = [
    { label: `${t('detail.front')} · ${t('detail.normal')}`, url: pokemon.sprites.front_default },
    { label: `${t('detail.front')} · ${t('detail.shiny')}`, url: pokemon.sprites.front_shiny },
    { label: `${t('detail.back')} · ${t('detail.normal')}`, url: pokemon.sprites.back_default },
    { label: `${t('detail.back')} · ${t('detail.shiny')}`, url: pokemon.sprites.back_shiny },
  ].filter((sprite): sprite is { label: string; url: string } => Boolean(sprite.url))
  const cries = [
    { label: t('detail.latestCry'), url: pokemon.cries?.latest },
    { label: t('detail.legacyCry'), url: pokemon.cries?.legacy },
  ].filter((cry): cry is { label: string; url: string } => Boolean(cry.url))

  return (
    <div className="technical-data-grid" style={{ '--resource-color': 'var(--theme)' } as React.CSSProperties}>
      <article className="info-card technical-card registry-card">
        <h2><Database />{t('detail.registry')}</h2>
        <dl>
          <div><dt>ID</dt><dd>#{String(pokemon.id).padStart(4, '0')}</dd></div>
          <div><dt>{t('detail.apiOrder')}</dt><dd>{pokemon.order}</dd></div>
          <div><dt>{t('detail.defaultForm')}</dt><dd>{t(pokemon.is_default ? 'common.yes' : 'common.no')}</dd></div>
          <div><dt>{t('detail.legendary')}</dt><dd>{speciesFlag(species?.is_legendary)}</dd></div>
          <div><dt>{t('detail.mythical')}</dt><dd>{speciesFlag(species?.is_mythical)}</dd></div>
          <div><dt>{t('detail.species')}</dt><dd><ResourceValue value={pokemon.species} /></dd></div>
          <div><dt>{t('detail.forms')}</dt><dd>{pokemon.forms.length}</dd></div>
        </dl>
      </article>

      <article className="info-card technical-card">
        <h2><Volume2 />{t('detail.cries')}</h2>
        {cries.length ? <div className="cry-list">{cries.map((cry) => <label key={cry.label}><span>{cry.label}</span><audio controls preload="none" src={cry.url} /></label>)}</div> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card sprites-card">
        <h2><Image />{t('detail.sprites')}</h2>
        <div className="sprite-grid">{sprites.map((sprite) => <figure key={sprite.label}><img src={sprite.url} alt={sprite.label} width="96" height="96" loading="lazy" /><figcaption>{sprite.label}</figcaption></figure>)}</div>
      </article>

      <article className="info-card technical-card">
        <h2><PackageOpen />{t('detail.heldItems')}</h2>
        {pokemon.held_items?.length ? <ResourceValue value={pokemon.held_items} /> : <p className="muted">{t('detail.noHeldItems')}</p>}
      </article>

      <article className="info-card technical-card">
        <h2><Gamepad2 />{t('detail.gameIndices')}</h2>
        {pokemon.game_indices.length ? <ResourceValue value={pokemon.game_indices} /> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card">
        <h2><History />{t('detail.pastAbilities')}</h2>
        {pokemon.past_abilities?.length ? <ResourceValue value={pokemon.past_abilities} /> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card">
        <h2><History />{t('detail.pastTypes')}</h2>
        {pokemon.past_types?.length ? <ResourceValue value={pokemon.past_types} /> : <p className="muted">{t('detail.noHistoricalData')}</p>}
      </article>

      <article className="info-card technical-card api-source-card">
        <h2><ExternalLink />{t('detail.apiSource')}</h2>
        <p>{t('detail.apiDataDesc')}</p>
        <a className="button secondary" href={`${API_BASE}/pokemon/${encodeURIComponent(pokemon.name)}`} target="_blank" rel="noopener noreferrer">JSON <ExternalLink size={15} /></a>
      </article>
    </div>
  )
}
