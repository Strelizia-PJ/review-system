import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const badgeVariants = cva('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-primary/10 text-primary',
      neutral: 'bg-muted text-muted-foreground',
      success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      danger: 'bg-destructive/15 text-destructive'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), 'motion-safe:animate-pop', className)} {...props} />
}
