import { useEffect, useId, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useMoveListDetails } from '../hooks/useMoveListDetails'
import { prettyName } from '../lib/api'
import { moveIdentifier } from '../lib/move-comparison'
import { sortByLocalizedLabel } from '../lib/alphabetical-sort'
import { matchesResource, parseResourceDirectory, RESOURCE_SEARCH_LIMIT } from '../lib/resource-search'
import { SearchField } from './SearchField'
import { TypeBadge } from './TypeBadge'
import { DamageClassBadge } from './SemanticBadges'

export function MovePicker({
  name,
  label,
  onSelect,
}: {
  name: string
  label: string
  onSelect: (value: string) => void
}) {
  const { apiLanguage, language, t } = useLanguage()
  const [query, setQuery] = useState(name)
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    setQuery(name)
    setInvalid(false)
    setActive(-1)
  }, [name])
  const id = useId()
  const directory = useApi(
    focused && query.trim().length >= 2 ? `move?limit=${RESOURCE_SEARCH_LIMIT}&offset=0` : null,
    parseResourceDirectory,
  )
  const suggestions = sortByLocalizedLabel(
    (directory.data?.results ?? []).filter((entry) => matchesResource(entry.name, entry.url, query)),
    (entry) => prettyName(entry.name),
    language,
  ).slice(0, 6)
  const details = useMoveListDetails(suggestions, apiLanguage)
  const choose = (value: string) => {
    const identifier = moveIdentifier(value)
    setInvalid(!identifier)
    if (identifier) {
      onSelect(identifier)
      setQuery(identifier)
      setFocused(false)
      setActive(-1)
    }
  }
  const open = focused && suggestions.length > 0
  return (
    <section
      className="info-card move-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false)
          setActive(-1)
        }
      }}
    >
      <h2>{label}</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          choose(active >= 0 && open ? suggestions[active].name : query)
        }}
      >
        <div className="move-picker-field">
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value)
              setFocused(true)
              setActive(-1)
              setInvalid(false)
            }}
            clearLabel={t('common.clear')}
            placeholder={t('tools.movePrompt')}
            aria-label={label}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : `${id}-hint`}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setFocused(false)
                setActive(-1)
              }
              if (!open) return
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((value) =>
                  event.key === 'ArrowDown'
                    ? (value + 1) % suggestions.length
                    : value <= 0
                      ? suggestions.length - 1
                      : value - 1,
                )
              }
            }}
          />
          {open && (
            <ul id={`${id}-options`} role="listbox" aria-label={label} className="pokemon-suggestions move-suggestions">
              {suggestions.map((entry, index) => {
                const detail = details.data?.[entry.name]
                return (
                  <li
                    id={`${id}-${index}`}
                    key={entry.name}
                    role="option"
                    aria-selected={active === index}
                    className={active === index ? 'active' : ''}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(entry.name)}
                  >
                    <span>{prettyName(entry.name)}</span>
                    {detail && (
                      <span className="move-suggestion-meta">
                        <TypeBadge type={detail.type} />
                        <DamageClassBadge value={detail.damageClass} compact />
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <button type="submit" className="button secondary">
          {t('ui.selectMove')}
        </button>
      </form>
      <p id={`${id}-hint`} className="muted">
        {t('ui.moveSearchHint')}
      </p>
      {focused && directory.loading && <p role="status">{t('common.loadingShort')}</p>}
      {focused && directory.error && (
        <p className="muted">
          {t('ui.suggestionsUnavailable')}{' '}
          <button type="button" className="text-action" onClick={directory.retry}>
            {t('common.retry')}
          </button>
        </p>
      )}
      {invalid && (
        <p id={`${id}-error`} role="alert">
          {t('tools.invalidMove')}
        </p>
      )}
    </section>
  )
}
