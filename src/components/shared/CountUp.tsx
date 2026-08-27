import { useEffect, useRef } from 'react'
import { animate } from 'motion/react'
import { cn } from '../../utils/cn'

interface CountUpProps {
  value: number
  /** Seconds to count from the previous value (default 0.6s, capped for big jumps) */
  duration?: number
  className?: string
}

/** Animated number that rolls from its previous value to `value` on mount/change. */
export default function CountUp({ value, duration = 0.6, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const prevRef = useRef(0)

  useEffect(() => {
    const controls = animate(prevRef.current, value, {
      // Long jumps shouldn't take forever; short ticks should still be visible
      duration: Math.max(0.25, Math.min(duration, Math.abs(value - prevRef.current) > 50 ? 0.9 : 0.6)),
      ease: 'easeOut',
      onUpdate: v => {
        if (ref.current) ref.current.textContent = String(Math.round(v))
      }
    })
    prevRef.current = value
    return () => controls.stop()
  }, [value, duration])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {value}
    </span>
  )
}
