/** Ebbinghaus review stage labels (kept for backward compat with pre-migration data) */
export const STAGE_LABELS = ['', '第1天', '第2天', '第4天', '第7天', '第15天', '第30天', '第90天', '第180天']

/** SM-2 recall quality labels (0-5) */
export const QUALITY_LABELS: Record<number, string> = {
  0: '完全忘记',
  1: '错误回忆',
  2: '勉强回忆',
  3: '困难回忆',
  4: '基本正确',
  5: '完美回忆'
}

/** SM-2 quality rating button color classes */
export const QUALITY_COLORS: Record<number, string> = {
  0: 'bg-red-500 hover:bg-red-600',
  1: 'bg-orange-500 hover:bg-orange-600',
  2: 'bg-amber-500 hover:bg-amber-600',
  3: 'bg-yellow-500 hover:bg-yellow-600',
  4: 'bg-lime-500 hover:bg-lime-600',
  5: 'bg-green-500 hover:bg-green-600'
}

/** SM-2 quality short labels for compact buttons */
export const QUALITY_SHORT: Record<number, string> = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5'
}

/** Day-of-week labels starting from Sunday (index 0 = Sunday) */
export const DAY_LABELS_SUNDAY_FIRST = ['日', '一', '二', '三', '四', '五', '六']

/** Day-of-week labels starting from Monday (index 0 = Monday) */
export const DAY_LABELS_MONDAY_FIRST = ['一', '二', '三', '四', '五', '六', '日']

/** Weekday order for display: Monday first (dayjs day values 1-6, 0) */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** SM-2 algorithm — compute the next review interval (days) for a given quality rating.
 *  Mirrors the backend calculateSM2 logic. Pure function, usable from renderer. */
export function previewInterval(
  ef: number,
  reviewCount: number,
  lastInterval: number,
  quality: number
): number {
  const MAX = 28
  const MIN_EF = 1.3
  const MAX_EF = 3.0

  if (quality >= 3) {
    let interval: number
    if (reviewCount === 0) interval = 1
    else if (reviewCount === 1) interval = 3
    else {
      const mult = quality === 5 ? 2.5 : quality === 4 ? 2.0 : 1.5
      interval = Math.round(lastInterval * mult)
    }
    return Math.min(MAX, interval)
  }
  return 1
}
