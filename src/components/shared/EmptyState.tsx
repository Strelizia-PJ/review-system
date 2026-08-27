import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/** Centered empty-state placeholder — floating icon in a soft tinted blob. */
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
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      {icon && (
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/8 motion-safe:animate-float">
          <span className="text-3xl">{icon}</span>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>}
    </div>
  )
}
