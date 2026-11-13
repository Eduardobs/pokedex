import { useId, type CSSProperties, type ReactNode } from 'react'

type Props = {
  index?: number
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  titleId?: string
  level?: 2 | 3
  style?: CSSProperties
}

/** A named content group with a consistent heading and optional contextual actions. */
export function NotebookSection({
  index,
  title,
  description,
  actions,
  children,
  className = '',
  titleId,
  level = 2,
  style,
}: Props) {
  const generatedId = useId()
  const headingId = titleId ?? generatedId
  const Heading = level === 3 ? 'h3' : 'h2'
  return (
    <section className={`notebook-section ${className}`.trim()} aria-labelledby={headingId} style={style}>
      <header className="notebook-section-heading">
        {index !== undefined && (
          <span className="notebook-coordinate" aria-hidden="true">
            {String(index).padStart(2, '0')}
          </span>
        )}
        <div className="notebook-section-copy">
          <Heading id={headingId} tabIndex={-1}>
            {title}
          </Heading>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="notebook-section-actions">{actions}</div>}
      </header>
      <div className="notebook-section-content">{children}</div>
    </section>
  )
}
