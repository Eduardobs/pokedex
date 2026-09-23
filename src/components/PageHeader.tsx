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
    <div className={`page-title${className ? ` ${className}` : ''}`}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description !== undefined && <p>{description}</p>}
      </div>
      {aside}
    </div>
  )
}
