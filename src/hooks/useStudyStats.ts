import { create } from 'zustand'
import type { WeekStats, Recent7Stats, MonthStats, MonthReviewStats } from '../types'
import dayjs from 'dayjs'

const api = () => window.electronAPI?.study

interface StudyStatsState {
  weekStats: WeekStats | null
  recent7Stats: Recent7Stats | null
  monthStats: MonthStats | null
  monthReviewStats: MonthReviewStats | null
  monthYear: number
  monthMonth: number
  loading: boolean
  error: string | null
  fetchAll: () => Promise<void>
  fetchMonth: (year?: number, month?: number) => Promise<void>
  prevMonth: () => void
  nextMonth: () => void
  addBackfill: (date: string, minutes: number) => Promise<void>
}

export const useStudyStats = create<StudyStatsState>((set, get) => ({
  weekStats: null,
  recent7Stats: null,
  monthStats: null,
  monthReviewStats: null,
  monthYear: dayjs().year(),
  monthMonth: dayjs().month() + 1,
  loading: false,
  error: null,

  fetchAll: async () => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      const [weekStats, recent7Stats, monthStats, monthReviewStats] = await Promise.all([
        api()!.getWeekStats(),
        api()!.getRecent7(),
        api()!.getMonthStats(get().monthYear, get().monthMonth),
        api()!.getMonthReviewStats(get().monthYear, get().monthMonth)
      ])
      set({ weekStats, recent7Stats, monthStats, monthReviewStats, loading: false })
    } catch (e) {
      console.error('Failed to fetch study stats:', e)
      set({ loading: false, error: '加载统计数据失败' })
    }
  },

  fetchMonth: async (year?: number, month?: number) => {
    if (!api()) return
    try {
      const y = year ?? get().monthYear
      const m = month ?? get().monthMonth
      const [monthStats, monthReviewStats] = await Promise.all([
        api()!.getMonthStats(y, m),
        api()!.getMonthReviewStats(y, m)
      ])
      set({ monthStats, monthReviewStats, monthYear: y, monthMonth: m })
    } catch (e) {
      console.error('Failed to fetch month stats:', e)
    }
  },

  prevMonth: () => {
    const { monthYear, monthMonth } = get()
    const prev = dayjs(`${monthYear}-${String(monthMonth).padStart(2, '0')}-01`).subtract(1, 'month')
    get().fetchMonth(prev.year(), prev.month() + 1)
  },

  nextMonth: () => {
    const { monthYear, monthMonth } = get()
    const next = dayjs(`${monthYear}-${String(monthMonth).padStart(2, '0')}-01`).add(1, 'month')
    get().fetchMonth(next.year(), next.month() + 1)
  },

  addBackfill: async (date: string, minutes: number) => {
    if (!api()) return
    try {
      await api()!.addSession(date, minutes)
      const [weekStats, recent7Stats, monthStats, monthReviewStats] = await Promise.all([
        api()!.getWeekStats(),
        api()!.getRecent7(),
        api()!.getMonthStats(get().monthYear, get().monthMonth),
        api()!.getMonthReviewStats(get().monthYear, get().monthMonth)
      ])
      set({ weekStats, recent7Stats, monthStats, monthReviewStats })
    } catch (e) {
      console.error('Failed to add backfill:', e)
    }
  }
}))
