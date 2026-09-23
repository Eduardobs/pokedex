import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
  headingLevel?: 2 | 3
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <div className={`empty${className ? ` ${className}` : ''}`}>
      {icon}
      <Heading>{title}</Heading>
      {description !== undefined && <p>{description}</p>}
      {children}
    </div>
  )
}

type InlineRetryErrorProps = {
  message: ReactNode
  retryLabel: ReactNode
  onRetry: () => void
}

export function InlineRetryError({ message, retryLabel, onRetry }: InlineRetryErrorProps) {
  return (
    <div className="inline-error">
      <p>{message}</p>
      <button className="button secondary" type="button" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  )
}
