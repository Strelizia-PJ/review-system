import { useEffect, useState } from 'react'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

export interface StreakInfo {
  /** Consecutive active days ending today (or yesterday if today isn't logged yet) */
  current: number
  /** Best consecutive run within the lookback window */
  longest: number
  /** Whether today already has any learning activity */
  activeToday: boolean
}

interface StreakState extends StreakInfo {
  loading: boolean
}

/**
 * A day counts as "checked in" when ANY learning happened: ≥1 review rated,
 * focus minutes logged (pomodoro sessions / game import / manual backfill).
 * Data comes exclusively from the existing study-stats endpoints
 * (getMonthStats minutes + getMonthReviewStats completedCount) — same source
 * as the heatmap, so the two always agree.
 *
 * Longest streak scans up to one year of history (fetched month by month,
 * ~13 lightweight IPC calls on first mount of a page using this hook).
 */
const MAX_LOOKBACK_DAYS = 366

export function useStreak(): StreakState {
  const [state, setState] = useState<StreakState>({
    current: 0,
    longest: 0,
    activeToday: false,
    loading: true
  })

  useEffect(() => {
    let cancelled = false
    const api = () => window.electronAPI?.study

    const safeSet = (next: Partial<StreakState>) => {
      if (!cancelled) setState(prev => ({ ...prev, ...next }))
    }

    if (!api()) {
      safeSet({ loading: false })
      return
    }

    // Month-keyed caches shared by both walks
    const cache = new Map<string, Set<string>>()
    const inflight = new Map<string, Promise<Set<string>>>()
    const monthKey = (d: Dayjs) => `${d.year()}-${d.month() + 1}`
    const fmt = (d: Dayjs) => d.format('YYYY-MM-DD')

    const loadMonth = (d: Dayjs): Promise<Set<string>> => {
      const key = monthKey(d)
      const hit = cache.get(key)
      if (hit) return Promise.resolve(hit)
      let p = inflight.get(key)
      if (!p) {
        p = Promise.all([
          api()!.getMonthStats(d.year(), d.month() + 1),
          api()!.getMonthReviewStats(d.year(), d.month() + 1)
        ])
          .then(([monthStats, reviewStats]) => {
            const active = new Set<string>()
            for (const day of monthStats?.days ?? []) if (day.minutes > 0) active.add(day.date)
            for (const day of reviewStats?.days ?? []) if (day.completedCount > 0) active.add(day.date)
            cache.set(key, active)
            return active
          })
          .catch(() => {
            const empty = new Set<string>()
            cache.set(key, empty)
            return empty
          })
        inflight.set(key, p)
      }
      return p
    }

    ;(async () => {
      try {
        const today = dayjs()
        const activeOn = async (d: Dayjs) => (await loadMonth(d)).has(fmt(d))

        // Current streak: today counts once active; an un-logged today doesn't
        // break a chain that ran through yesterday ("not yet checked in today").
        let cursor = today
        let current = 0
        const activeToday = await activeOn(today)
        if (!activeToday) cursor = cursor.subtract(1, 'day')
        while (current < MAX_LOOKBACK_DAYS && (await activeOn(cursor))) {
          current++
          cursor = cursor.subtract(1, 'day')
        }

        // Ensure every month in the lookback window is cached, then linear-scan
        const start = today.subtract(MAX_LOOKBACK_DAYS, 'day')
        let m = start.startOf('month')
        const loaders: Promise<unknown>[] = []
        while (!m.isAfter(today)) {
          loaders.push(loadMonth(m))
          m = m.add(1, 'month')
        }
        await Promise.all(loaders)

        let run = 0
        let longest = 0
        for (let d = start; !d.isAfter(today); d = d.add(1, 'day')) {
          if (cache.get(monthKey(d))?.has(fmt(d))) {
            run++
            longest = Math.max(longest, run)
          } else {
            run = 0
          }
        }

        safeSet({ current, longest: Math.max(longest, current), activeToday, loading: false })
      } catch (e) {
        console.error('Failed to compute streak:', e)
        safeSet({ loading: false })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
