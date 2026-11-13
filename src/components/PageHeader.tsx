import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, aside, className }: PageHeaderProps) {
  return (
    <header className={`page-title notebook-title${className ? ` ${className}` : ''}`}>
      <div className="page-heading-copy">
        <div className="notebook-title-index">
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h1>{title}</h1>
        {description !== undefined && <p>{description}</p>}
      </div>
      {aside && <div className="page-heading-aside">{aside}</div>}
    </header>
  )
}
