import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Layers3,
  LoaderCircle,
  MapPin,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { POKEMON_REGIONS, type PokemonRegion } from '../lib/pokemon-catalog'
import { POKEMON_TYPES, pokemonSortOptions } from '../lib/pokemon-directory'
import type { PokemonSortDirection, PokemonSortKey } from '../lib/pokemon-sort'
import { SearchField } from './SearchField'
import { SelectMenu } from './SelectMenu'
import { typeLabel } from './TypeBadge'
import { TypeIcon } from './TypeIcon'

type CatalogSuggestion = {
  id: number
  name: string
  label: ReactNode
}

type Props = {
  className?: string
  children?: ReactNode
  idPrefix: string
  query: string
  searchLabel: string
  suggestions: CatalogSuggestion[]
  onQueryChange: (value: string) => void
  type: string
  typeHelp: string
  onTypeChange: (value: string) => void
  region: PokemonRegion | 'all'
  onRegionChange: (value: string) => void
  regionPending: boolean
  sort: PokemonSortKey
  onSortChange: (value: PokemonSortKey) => void
  direction: PokemonSortDirection
  onDirectionChange: (value: PokemonSortDirection) => void
  sorting: boolean
  sortError: boolean
  legendary: boolean
  mythical: boolean
  onRarityChange: (filter: 'legendary' | 'mythical', checked: boolean) => void
  rarityPending: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
  shiny: boolean
  onShinyChange: (value: boolean) => void
  extraStatus?: ReactNode
}

export function PokemonCatalogFilters({
  className = '',
  children,
  idPrefix,
  query,
  searchLabel,
  suggestions,
  onQueryChange,
  type,
  typeHelp,
  onTypeChange,
  region,
  onRegionChange,
  regionPending,
  sort,
  onSortChange,
  direction,
  onDirectionChange,
  sorting,
  sortError,
  legendary,
  mythical,
  onRarityChange,
  rarityPending,
  hasActiveFilters,
  onClearFilters,
  shiny,
  onShinyChange,
  extraStatus,
}: Props) {
  const { language, t } = useLanguage()
  const [additionalFiltersOpen, setAdditionalFiltersOpen] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const options = pokemonSortOptions(t)
  const directionOptions: { value: PokemonSortDirection; label: string }[] = [
    { value: 'asc', label: t('pokedex.sort.ascending') },
    { value: 'desc', label: t('pokedex.sort.descending') },
  ]
  const regionOptions = [
    { value: 'all', label: t('pokedex.region.all') },
    ...POKEMON_REGIONS.map(({ name }) => ({
      value: name,
      label: t(`pokedex.region.${name}`),
    })),
  ]
  const suggestionListId = `${idPrefix}-suggestions`
  const additionalFiltersId = `additional-${idPrefix}-filters`
  const typeHelpId = `${idPrefix}-type-filter-help`
  const additionalFilterCount = Number(type !== 'all') + Number(legendary) + Number(mythical)

  const selectSuggestion = (name: string) => {
    onQueryChange(name)
    setSuggestionsOpen(false)
    setActiveSuggestion(-1)
  }
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false)
      setActiveSuggestion(-1)
      return
    }
    if (!suggestions.length || !suggestionsOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestion((current) => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions[activeSuggestion].name)
    }
  }

  return (
    <div className={`filter-panel${className ? ` ${className}` : ''}`}>
      {children}
      <div className="filter-primary">
        <div className="pokemon-search">
          <SearchField
            value={query}
            onChange={(value) => {
              onQueryChange(value)
              setSuggestionsOpen(true)
              setActiveSuggestion(-1)
            }}
            onClear={() => {
              onQueryChange('')
              setSuggestionsOpen(false)
              setActiveSuggestion(-1)
            }}
            clearLabel={t('common.clear')}
            iconSize={20}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls={suggestionListId}
            aria-activedescendant={
              activeSuggestion >= 0 ? `${idPrefix}-suggestion-${activeSuggestion}` : undefined
            }
            aria-label={searchLabel}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setSuggestionsOpen(false)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchLabel}
            autoComplete="off"
          />
          {suggestionsOpen && suggestions.length > 0 && (
            <ul id={suggestionListId} className="pokemon-suggestions" role="listbox">
              {suggestions.map((suggestion, index) => (
                <li
                  id={`${idPrefix}-suggestion-${index}`}
                  key={suggestion.name}
                  role="option"
                  aria-selected={index === activeSuggestion}
                  className={index === activeSuggestion ? 'active' : ''}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectSuggestion(suggestion.name)
                  }}
                >
                  <span>{suggestion.label}</span>
                  <small>#{String(suggestion.id).padStart(4, '0')}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <SelectMenu
          className="region-field"
          icon={
            regionPending ? (
              <LoaderCircle className="sort-spinner" size={18} />
            ) : (
              <MapPin size={18} />
            )
          }
          label={t('pokedex.region.label')}
          options={regionOptions}
          value={region}
          onChange={onRegionChange}
        />
        <div className="sort-controls">
          <SelectMenu
            icon={
              sorting ? (
                <LoaderCircle className="sort-spinner" size={18} />
              ) : (
                <ArrowUpDown size={18} />
              )
            }
            label={t('pokedex.sort.label')}
            options={options}
            value={sort}
            onChange={onSortChange}
          />
          <SelectMenu
            className="order-field"
            icon={direction === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
            label={t('pokedex.sort.direction')}
            options={directionOptions}
            value={direction}
            onChange={onDirectionChange}
          />
        </div>
      </div>
      <div className="filter-actions">
        <button
          className="filter-toggle"
          type="button"
          aria-expanded={additionalFiltersOpen}
          aria-controls={additionalFiltersId}
          onClick={() => setAdditionalFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span>{additionalFiltersOpen ? t('pokedex.hideFilters') : t('pokedex.showFilters')}</span>
          {additionalFilterCount > 0 && (
            <span
              className="active-filter-count"
              aria-label={
                additionalFilterCount === 1
                  ? t('pokedex.activeFilterOne')
                  : t('pokedex.activeFilterCount', { count: additionalFilterCount })
              }
            >
              {additionalFilterCount}
            </span>
          )}
          <ChevronDown
            className={additionalFiltersOpen ? 'open' : ''}
            size={17}
            aria-hidden="true"
          />
        </button>
        <div className="filter-end-actions">
          {hasActiveFilters && (
            <button className="clear-filters" type="button" onClick={onClearFilters}>
              {t('pokedex.clearFilters')}
            </button>
          )}
          <button
            className={`list-shiny-toggle${shiny ? ' active' : ''}`}
            type="button"
            aria-label={t(shiny ? 'pokedex.showNormal' : 'pokedex.showShiny')}
            aria-pressed={shiny}
            onClick={() => onShinyChange(!shiny)}
          >
            <Sparkles size={17} aria-hidden="true" />
            <span>{t(shiny ? 'detail.normal' : 'detail.shiny')}</span>
          </button>
        </div>
      </div>
      <div id={additionalFiltersId} className="additional-filters" hidden={!additionalFiltersOpen}>
        <fieldset className="type-filter" aria-describedby={typeHelpId}>
          <legend>{t('pokedex.type.label')}</legend>
          <p id={typeHelpId}>{typeHelp}</p>
          <div className="type-filter-grid">
            {POKEMON_TYPES.map((item) => {
              const label = item === 'all' ? t('pokedex.all') : typeLabel(item, language)
              return (
                <label
                  className={`type-filter-option${item === 'all' ? ' type-all' : ` type-${item}`}`}
                  key={item}
                >
                  <input
                    type="radio"
                    name={`${idPrefix}-type`}
                    value={item}
                    checked={type === item}
                    onChange={() => onTypeChange(item)}
                  />
                  <span className="type-filter-icon" aria-hidden="true">
                    {item === 'all' ? <Layers3 /> : <TypeIcon type={item} />}
                  </span>
                  <span>{label}</span>
                  <Check className="type-filter-check" aria-hidden="true" />
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="rarity-filter" role="group" aria-label={t('pokedex.rarity.label')}>
          <span>{t('pokedex.rarity.label')}</span>
          <label>
            <input
              type="checkbox"
              checked={legendary}
              onChange={(event) => onRarityChange('legendary', event.target.checked)}
            />
            {t('pokedex.rarity.legendary')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={mythical}
              onChange={(event) => onRarityChange('mythical', event.target.checked)}
            />
            {t('pokedex.rarity.mythical')}
          </label>
        </div>
      </div>
      {sorting && (
        <p className="sort-status" role="status">
          {t('pokedex.sort.loading')}
        </p>
      )}
      {sortError && (
        <p className="sort-status inline-sort-error" role="alert">
          {t('pokedex.sort.error')}
        </p>
      )}
      {rarityPending && (
        <p className="sort-status" role="status">
          {t('pokedex.rarity.loading')}
        </p>
      )}
      {regionPending && (
        <p className="sort-status" role="status">
          {t('pokedex.region.loading')}
        </p>
      )}
      {extraStatus}
    </div>
  )
}
