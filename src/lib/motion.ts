import type { Variants } from 'motion/react'

/** Shared ease-out curve — quick start, soft landing */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Bouncy spring for micro-interactions (badges, indicators) */
export const SPRING_BOUNCY = { type: 'spring', stiffness: 420, damping: 26 } as const

/**
 * Direction-aware page transition: incoming page slides ~20px toward its
 * resting spot while fading in; outgoing page drifts slightly the other way.
 * Pass the nav direction (+1 forward / -1 back) as `custom` to both
 * AnimatePresence and the motion element.
 */
export const pageVariants: Variants = {
  initial: (dir: number = 1) => ({ opacity: 0, x: dir * 16 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: (dir: number = 1) => ({ opacity: 0, x: dir * -10, transition: { duration: 0.12, ease: 'easeIn' } })
}

/**
 * Staggered list-item entrance + collapse exit for card lists.
 * Use with `<motion.div variants={listItemVariants} custom={index}>`
 * inside an AnimatePresence-wrapped container so removals fade out smoothly.
 * The stagger step/cap are deliberately small so long lists don't feel laggy.
 */
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.02, 0.16), duration: 0.22, ease: EASE_OUT }
  }),
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: 'easeIn' } }
}

/** Container that fades/slides a whole block (cards, dialogs' inner sections) */
export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } }
}
