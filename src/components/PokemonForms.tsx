import { Gem, Globe2, Maximize2, Shield, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, prettyName } from '../lib/api'
import type { Pokemon, PokemonForm, Species } from '../types'
import { TypeBadge } from './TypeBadge'
import { Translate, useLanguage } from '../contexts/LanguageContext'

type FormEntry = {
  pokemon: Pokemon
  form: PokemonForm | null
  isDefaultVariety: boolean
}

type PresentedForm = FormEntry & {
  presentation: ReturnType<typeof formPresentation>
}

function localizedFormName(form: PokemonForm | null, language: string) {
  if (!form) return ''
  const names = form.form_names.length ? form.form_names : form.names
  return names.find((entry) => entry.language.name === language)?.name
    ?? names.find((entry) => entry.language.name === 'en')?.name
    ?? ''
}

function formPresentation(entry: FormEntry, speciesName: string, t: Translate, apiLanguage: string) {
  const { pokemon, form, isDefaultVariety } = entry
  const suffix = pokemon.name.replace(new RegExp(`^${speciesName}-?`), '')
  const regional = [
    ['alola', 'Alola'], ['galar', 'Galar'], ['hisui', 'Hisui'], ['paldea', 'Paldea'],
  ].find(([key]) => pokemon.name.includes(`-${key}`))

  if (form?.is_mega || pokemon.name.includes('-mega')) return { label: suffix.endsWith('-x') ? 'Mega X' : suffix.endsWith('-y') ? 'Mega Y' : 'Mega', category: t('pokemonForms.megaEvolution'), kind: 'mega', icon: Gem }
  if (regional) return { label: localizedFormName(form, apiLanguage) || t('pokemonForms.regionForm', { region: regional[1] }), category: t('pokemonForms.regional'), kind: 'regional', icon: Globe2 }
  if (pokemon.name.includes('-gmax')) return { label: t('forms.gmax'), category: t('pokemonForms.gmax'), kind: 'gmax', icon: Maximize2 }
  if (form?.is_battle_only) return { label: localizedFormName(form, apiLanguage) || prettyName(suffix), category: t('pokemonForms.battle'), kind: 'battle', icon: Shield }
  if (isDefaultVariety && form?.is_default !== false) return { label: t('pokemonForms.default'), category: t('pokemonForms.original'), kind: 'default', icon: Sparkles }
  return { label: localizedFormName(form, apiLanguage) || prettyName(suffix || form?.form_name || t('pokemonForms.alternative')), category: t('pokemonForms.alternate'), kind: 'alternate', icon: Sparkles }
}

function FormTile({ entry, currentPokemon }: { entry: PresentedForm; currentPokemon: Pokemon }) {
  const { t } = useLanguage()
  const { pokemon, form, presentation } = entry
  const Icon = presentation.icon
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default
    ?? form?.sprites.front_default
    ?? pokemon.sprites.front_default
  const active = pokemon.name === currentPokemon.name

  return (
    <Link className={`form-card form-${presentation.kind} ${active ? 'active' : ''}`} to={`/pokemon/${pokemon.name}`} aria-current={active ? 'page' : undefined}>
      <div className="form-art"><span /><img src={artwork ?? ''} alt={presentation.label} loading="lazy" />{active && <small>{t('pokemonForms.current')}</small>}</div>
      <div className="form-info"><span className="form-category"><Icon size={13} />{presentation.category}</span><h3>{presentation.label}</h3><p>{prettyName(pokemon.name)}</p><div className="type-row">{(form?.types ?? pokemon.types).map(({ type }) => <TypeBadge key={type.name} type={type.name} />)}</div></div>
    </Link>
  )
}

export function PokemonForms({ species, currentPokemon }: { species: Species; currentPokemon: Pokemon }) {
  const { apiLanguage, t } = useLanguage()
  const [entries, setEntries] = useState<FormEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    Promise.all(species.varieties.map(async (variety) => {
      const pokemon = await apiFetch<Pokemon>(variety.pokemon.url, controller.signal)
      const forms = await Promise.all(pokemon.forms.map((resource) =>
        apiFetch<PokemonForm>(resource.url, controller.signal).catch(() => null),
      ))
      const availableForms = forms.filter((form): form is PokemonForm => form !== null)
      if (!availableForms.length) return [{ pokemon, form: null, isDefaultVariety: variety.is_default }]
      return availableForms.map((form) => ({ pokemon, form, isDefaultVariety: variety.is_default }))
    }))
      .then((groups) => setEntries(groups.flat().sort((a, b) => (a.form?.form_order ?? 0) - (b.form?.form_order ?? 0))))
      .catch((reason: unknown) => {
        if (!(reason instanceof Error) || reason.name !== 'AbortError') setEntries([])
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [species])

  if (loading) return <article className="info-card forms-card forms-loading"><div><span className="pokeball-spinner" /><p>{t('pokemonForms.loading')}</p></div></article>
  if (entries.length <= 1) return null

  const presented: PresentedForm[] = entries.map((entry) => ({ ...entry, presentation: formPresentation(entry, species.name, t, apiLanguage) }))
  const sections = [
    {
      key: 'different', title: t('pokemonForms.different'), description: t('pokemonForms.differentDesc'), icon: Sparkles,
      entries: presented.filter(({ presentation }) => ['default', 'alternate', 'battle'].includes(presentation.kind)),
    },
    {
      key: 'regional', title: t('pokemonForms.variations'), description: t('pokemonForms.variationsDesc'), icon: Globe2,
      entries: presented.filter(({ presentation }) => presentation.kind === 'regional'),
    },
    {
      key: 'mega', title: t('pokemonForms.megaForms'), description: t('pokemonForms.megaDesc'), icon: Gem,
      entries: presented.filter(({ presentation }) => presentation.kind === 'mega'),
    },
    {
      key: 'gmax', title: t('forms.gmax'), description: t('pokemonForms.gmaxDesc'), icon: Maximize2,
      entries: presented.filter(({ presentation }) => presentation.kind === 'gmax'),
    },
  ].filter((section) => section.entries.length)

  return (
    <article className="info-card forms-card">
      <header><div><h2>{t('pokemonForms.title')}</h2><p>{t('pokemonForms.description')}</p></div><span>{t('pokemonForms.count', { count: entries.length })}</span></header>
      <div className="forms-sections">
        {sections.map((section) => {
          const SectionIcon = section.icon
          return (
            <section className={`forms-section forms-section-${section.key}`} key={section.key}>
              <header><span><SectionIcon size={18} /></span><div><h3>{section.title}</h3><p>{section.description}</p></div><small>{section.entries.length}</small></header>
              <div className="forms-grid">{section.entries.map((entry) => <FormTile entry={entry} currentPokemon={currentPokemon} key={`${entry.pokemon.name}-${entry.form?.name ?? 'default'}`} />)}</div>
            </section>
          )
        })}
      </div>
    </article>
  )
}
