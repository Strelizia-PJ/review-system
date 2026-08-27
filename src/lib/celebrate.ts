import confetti from 'canvas-confetti'

/** Brand confetti palette — indigo/violet core with emerald & amber highlights */
const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#34d399', '#fbbf24']

/**
 * Fire a short celebration burst (used when the day's reviews are cleared
 * or a plan list is completed). Respects prefers-reduced-motion.
 */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const defaults: confetti.Options = { colors: COLORS, disableForReducedMotion: true }

  confetti({ ...defaults, particleCount: 90, spread: 70, origin: { y: 0.65 }, startVelocity: 38 })
  // Second delayed burst from the other side for a richer feel
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 60,
      spread: 90,
      angle: 120,
      origin: { x: 0.9, y: 0.7 },
      startVelocity: 32
    })
  }, 180)
}
