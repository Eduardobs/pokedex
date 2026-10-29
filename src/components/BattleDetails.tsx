import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const compactQuery = '(max-width: 720px), (hover: none)'
const PanelContext = createContext(false)

export function usesBattleDetailsPanel() {
  return typeof window.matchMedia === 'function' && window.matchMedia(compactQuery).matches
}

export function BattleTooltipContent({ children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const panel = useContext(PanelContext)
  return (
    <span {...props} id={panel ? undefined : props.id} role={panel ? undefined : 'tooltip'}>
      {children}
    </span>
  )
}

export function BattleDetails({
  label,
  tooltip,
  action = false,
  children,
}: {
  label: string
  tooltip: ReactNode
  action?: boolean
  children: (props: HTMLAttributes<HTMLElement>, tooltip: ReactNode) => ReactNode
}) {
  const { t } = useLanguage()
  const [compact, setCompact] = useState(usesBattleDetailsPanel)
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [returnTarget, setReturnTarget] = useState<HTMLElement | null>(null)
  const titleId = useId()
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(compactQuery)
    const update = () => {
      setCompact(media.matches)
      setOpen(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true })
    }
  }, [open, returnTarget])
  const show = (trigger: HTMLElement) => {
    setReturnTarget(trigger)
    setOpen(true)
  }
  const bindings: HTMLAttributes<HTMLElement> =
    compact && !action
      ? {
          role: 'button',
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          onClick: (event) => show(event.currentTarget),
          onKeyDown: (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            show(event.currentTarget)
          },
        }
      : {}
  const trigger = children(bindings, compact ? null : tooltip)
  return (
    <>
      {compact && action ? (
        <div className="battle-action-with-details">
          {trigger}
          <button
            type="button"
            className="battle-details-trigger"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(event) => show(event.currentTarget)}
          >
            <Info size={17} aria-hidden="true" /> {t('battle.details')}
          </button>
        </div>
      ) : (
        trigger
      )}
      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="battle-details-dialog"
            aria-labelledby={titleId}
            onCancel={(event) => {
              event.preventDefault()
              setOpen(false)
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false)
            }}
          >
            <div className="battle-details-sheet">
              <header>
                <h2 id={titleId}>{label}</h2>
                <button type="button" autoFocus aria-label={t('battle.closeDetails')} onClick={() => setOpen(false)}>
                  <X size={22} aria-hidden="true" />
                </button>
              </header>
              <PanelContext.Provider value={true}>{tooltip}</PanelContext.Provider>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
