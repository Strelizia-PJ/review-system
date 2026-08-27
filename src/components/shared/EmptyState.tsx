import type { ReactNode } from 'react'

/** Centered empty-state placeholder. */
export default function EmptyState({
  icon,
  title,
  description,
  className = 'py-12'
}: {
  icon?: ReactNode
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {icon && <div className="mb-2 text-3xl">{icon}</div>}
      <p className="text-sm text-muted-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>}
    </div>
  )
}
