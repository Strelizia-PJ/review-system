import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

/** FSRS recall quality labels (1-4) */
export const QUALITY_LABELS: Record<number, string> = {
  1: '忘',
  2: '难',
  3: '过',
  4: '易'
}

/** FSRS quality rating button color classes */
export const QUALITY_COLORS: Record<number, string> = {
  1: 'bg-red-500 hover:bg-red-600',
  2: 'bg-orange-500 hover:bg-orange-600',
  3: 'bg-green-500 hover:bg-green-600',
  4: 'bg-blue-500 hover:bg-blue-600'
}

/** Day-of-week labels starting from Sunday (index 0 = Sunday) */
export const DAY_LABELS_SUNDAY_FIRST = ['日', '一', '二', '三', '四', '五', '六']

/** Day-of-week labels starting from Monday (index 0 = Monday) */
export const DAY_LABELS_MONDAY_FIRST = ['一', '二', '三', '四', '五', '六', '日']

/** Weekday order for display: Monday first (dayjs day values 1-6, 0) */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** FSRS — default global interval cap and absolute bound, mirrors electron/database/queries.ts. */
export const DEFAULT_MAX_REVIEW_INTERVAL_DAYS = 28
export const ABSOLUTE_MAX_INTERVAL_DAYS = 365

/** FSRS — compute predicted next review interval (days) for a given quality rating.
 *  Uses ts-fsrs repeat() to preview all 4 outcomes. Pass the KP's effective cap
 *  so the preview matches what rateReview would actually schedule. */
const previewScheduler = fsrs({ maximum_interval: ABSOLUTE_MAX_INTERVAL_DAYS })

export function previewInterval(
  cardState: string | null | undefined,
  quality: number,
  effectiveCap: number = DEFAULT_MAX_REVIEW_INTERVAL_DAYS
): number {
  if (!cardState) return 1
  try {
    const card = { ...createEmptyCard(), ...JSON.parse(cardState) }
    const rating = quality === 1 ? Rating.Again : quality === 2 ? Rating.Hard : quality === 3 ? Rating.Good : Rating.Easy
    const preview = previewScheduler.repeat(card, new Date())
    const entry = preview[rating]
    return Math.min(Math.max(entry?.card?.scheduled_days ?? 1, 1), effectiveCap)
  } catch {
    return 1
  }
}

/** FSRS — compute current memory retrievability (0-1) from card state.
 *  Returns null if no card state is available (e.g., never reviewed). */
const retrievalScheduler = fsrs()

export function getRetrievability(cardState: string | null | undefined): number | null {
  if (!cardState) return null
  try {
    const card = { ...createEmptyCard(), ...JSON.parse(cardState) }
    return retrievalScheduler.get_retrievability(card, new Date(), false)
  } catch {
    return null
  }
}
