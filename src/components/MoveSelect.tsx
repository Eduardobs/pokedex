import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useApi } from '../hooks/useApi'
import { useProgressiveList } from '../hooks/useProgressiveList'
import { localizedName, localizedText, prettyName } from '../lib/api'
import { moveIdentifier, parseComparisonMove } from '../lib/move-comparison'
import { sortByLocalizedLabel } from '../lib/alphabetical-sort'
import { reference } from '../lib/resource-data'
import { TypeBadge } from './TypeBadge'
import { DamageClassBadge } from './SemanticBadges'
import { SearchField } from './SearchField'

/** Loads only visible options; the API client shares and caches repeated move requests. */
function MoveRow({ name, onError, descriptionId }: { name: string; onError: () => void; descriptionId?: string }) {
  const { t, apiLanguage } = useLanguage()
  const state = useApi(`move/${name}`, parseComparisonMove)
  useEffect(() => {
    if (state.error) onError()
  }, [state.error, onError])
  const move = state.data
  const description = move
    ? localizedText(move.effect_entries, ['short_effect', 'effect'], apiLanguage) ||
      t('battle.moveDescriptionUnavailable')
    : ''
  return (
    <span className="move-select-row">
      <strong>{move ? localizedName(move.names, apiLanguage) || prettyName(name) : prettyName(name)}</strong>
      {move ? (
        <>
          <TypeBadge type={reference(move.type)!.name} />
          <DamageClassBadge value={reference(move.damage_class)!.name} compact />
          {(['power', 'accuracy', 'pp'] as const).map((field) => (
            <span className="move-select-stat" key={field}>
              <small>{t(field === 'power' ? 'move.power' : field === 'accuracy' ? 'move.accuracy' : 'move.pp')}</small>
              <span>{String(move[field] ?? '—')}</span>
            </span>
          ))}
          {descriptionId && (
            <span id={descriptionId} role="tooltip" className="move-select-description-tooltip">
              {description}
            </span>
          )}
        </>
      ) : (
        <span className="muted">{t(state.error ? 'teams.moveUnavailable' : 'common.loadingShort')}</span>
      )}
    </span>
  )
}

export function MoveSelect({
  value,
  options,
  label,
  onChange,
}: {
  value: string
  options: string[]
  label: string
  onChange: (value: string) => void
}) {
  const { language, t } = useLanguage()
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [retry, setRetry] = useState(0)
  const [hasError, setHasError] = useState(false)
  const descriptionId = `${id}-description`
  const reportError = useCallback(() => setHasError(true), [])
  const filtered = sortByLocalizedLabel(
    [...new Set(options)].filter(
      (name) =>
        moveIdentifier(name) === name &&
        prettyName(name).toLowerCase().includes(query.trim().toLowerCase().replaceAll('-', ' ')),
    ),
    prettyName,
    language,
  )
  const { visible, hasMore, loadMore, sentinelRef } = useProgressiveList(filtered, query, 6, open)
  useEffect(() => {
    if (open) popup.current?.querySelector('input')?.focus()
  }, [open])
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  const choose = (name: string) => {
    onChange(name)
    close()
  }
  const focusOption = (index: number) => {
    const nodes = list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    if (nodes?.length) nodes[(index + nodes.length) % nodes.length].focus()
  }
  return (
    <div
      className="move-select"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.preventDefault()
          e.stopPropagation()
          close()
        }
      }}
    >
      <span id={`${id}-label`} className="move-select-label">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className="move-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-describedby={value ? descriptionId : undefined}
        onClick={() => {
          setOpen(!open)
          setQuery('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        {value ? (
          <MoveRow key={retry} name={value} onError={reportError} descriptionId={descriptionId} />
        ) : (
          <span>{t('teams.none')}</span>
        )}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="move-select-popover" ref={popup}>
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value)
            }}
            clearLabel={t('common.clear')}
            aria-label={t('teams.moveSearch')}
            placeholder={t('teams.moveSearch')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                focusOption(0)
              }
            }}
          />
          <div ref={list} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} key={retry}>
            {['', ...visible].map((name, index) => (
              <button
                type="button"
                role="option"
                aria-selected={value === name}
                tabIndex={-1}
                key={name}
                onClick={() => choose(name)}
                onKeyDown={(e) => {
                  const next =
                    e.key === 'ArrowDown'
                      ? index + 1
                      : e.key === 'ArrowUp'
                        ? index - 1
                        : e.key === 'Home'
                          ? 0
                          : e.key === 'End'
                            ? visible.length
                            : null
                  if (next !== null) {
                    e.preventDefault()
                    focusOption(next)
                  }
                }}
              >
                {name ? <MoveRow name={name} onError={reportError} /> : t('teams.none')}
              </button>
            ))}
          </div>
          {!filtered.length && <p role="status">{t('teams.noMoves')}</p>}
          {hasMore && (
            <>
              <div ref={sentinelRef} className="team-select-sentinel" aria-hidden="true" />
              <button type="button" className="text-action team-load-more" onClick={loadMore}>
                {t('teams.loadMoreMoves')}
              </button>
            </>
          )}
          {!!filtered.length && (
            <p className="sr-only" role="status">
              {t('teams.optionsShown', { visible: visible.length, total: filtered.length })}
            </p>
          )}
          {hasError && (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setHasError(false)
                setRetry((v) => v + 1)
              }}
            >
              {t('common.retry')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
