import type { NavPage } from '../types'

/**
 * Canonical display order of nav destinations. Sidebar renders in this order
 * and page-transition direction (slide left/right) is derived from index deltas.
 */
export const NAV_ORDER: NavPage[] = [
  'knowledge',
  'today',
  'mistakes',
  'mistake-types',
  'manage',
  'plans',
  'pomodoro',
  'study-stats',
  'import',
  'stats',
  'settings'
]
