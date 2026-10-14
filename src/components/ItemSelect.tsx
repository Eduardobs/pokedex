import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useProgressiveList } from '../hooks/useProgressiveList'
import { useLanguage } from '../contexts/LanguageContext'
import { localizedName, localizedText, prettyName } from '../lib/api'
import { parseItemDirectory, parseTeamItem } from '../lib/team-items'
import { sortByLocalizedLabel } from '../lib/alphabetical-sort'
import { SearchField } from './SearchField'
import { ItemImage } from './ItemImage'

function ItemRow({ name, onError }: { name: string; onError: () => void }) {
  const { apiLanguage, t } = useLanguage()
  const state = useApi(`item/${name}`, parseTeamItem)
  useEffect(() => {
    if (state.error) onError()
  }, [onError, state.error])
  const item = state.data
  const displayName = item ? localizedName(item.names, apiLanguage) || prettyName(name) : prettyName(name)
  const description = item
    ? localizedText(item.effectEntries, ['short_effect', 'effect'], apiLanguage) ||
      localizedText(item.flavorTextEntries, ['text', 'flavor_text'], apiLanguage)
    : ''

  return (
    <span className="item-select-row">
      <ItemImage name={name} preferredSource={item?.sprite} alt="" width={40} height={40} />
      <span>
        <strong>{displayName}</strong>
        <small>{description || t(state.error ? 'teams.itemUnavailable' : 'common.loadingShort')}</small>
      </span>
    </span>
  )
}

export function ItemSelect({
  value,
  label,
  onChange,
}: {
  value: string
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
  const [hasDetailError, setHasDetailError] = useState(false)
  const reportError = useCallback(() => setHasDetailError(true), [])
  const directory = useApi(open ? 'item?limit=2500' : null, parseItemDirectory)
  const filtered = sortByLocalizedLabel(
    (directory.data ?? []).filter((name) =>
      prettyName(name).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase().replaceAll('-', ' ')),
    ),
    prettyName,
    language,
  )
  const { visible, hasMore, loadMore, sentinelRef } = useProgressiveList(filtered, query, 8, open)

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
      className="item-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
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
        className="move-select-trigger item-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => {
          setOpen((value) => !value)
          setQuery('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {value ? <ItemRow key={retry} name={value} onError={reportError} /> : <span>{t('teams.none')}</span>}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="move-select-popover item-select-popover" ref={popup}>
          <SearchField
            value={query}
            onChange={setQuery}
            clearLabel={t('common.clear')}
            aria-label={t('teams.itemSearch')}
            placeholder={t('teams.itemSearch')}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                focusOption(0)
              }
            }}
          />
          {directory.loading && <p role="status">{t('common.loading')}</p>}
          {directory.error && (
            <p role="alert" className="team-hint">
              {t('teams.itemsUnavailable')}{' '}
              <button type="button" className="text-action" onClick={directory.retry}>
                {t('common.retry')}
              </button>
            </p>
          )}
          {!directory.loading && !directory.error && (
            <div ref={list} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} key={retry}>
              {['', ...visible].map((name, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === name}
                  tabIndex={-1}
                  key={name}
                  onClick={() => choose(name)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === 'ArrowDown'
                        ? index + 1
                        : event.key === 'ArrowUp'
                          ? index - 1
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? visible.length
                              : null
                    if (next !== null) {
                      event.preventDefault()
                      focusOption(next)
                    }
                  }}
                >
                  {name ? <ItemRow name={name} onError={reportError} /> : t('teams.none')}
                </button>
              ))}
            </div>
          )}
          {!directory.loading && !directory.error && !filtered.length && <p role="status">{t('teams.noItems')}</p>}
          {hasMore && (
            <>
              <div ref={sentinelRef} className="team-select-sentinel" aria-hidden="true" />
              <button type="button" className="text-action team-load-more" onClick={loadMore}>
                {t('teams.loadMoreItems')}
              </button>
            </>
          )}
          {!!filtered.length && (
            <p className="sr-only" role="status">
              {t('teams.optionsShown', { visible: visible.length, total: filtered.length })}
            </p>
          )}
          {hasDetailError && (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setHasDetailError(false)
                setRetry((value) => value + 1)
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
