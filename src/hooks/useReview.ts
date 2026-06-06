import { create } from 'zustand'
import type { ReviewRecord, ReviewStats } from '../types'

const api = () => window.electronAPI?.review

interface ReviewState {
  todayItems: ReviewRecord[]
  overdueItems: ReviewRecord[]
  stats: ReviewStats
  loading: boolean
  error: string | null
  statsLoading: boolean

  fetchToday: () => Promise<void>
  fetchOverdue: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchAll: () => Promise<void>
  rate: (reviewId: number, quality: number) => Promise<void>
}

export const useReview = create<ReviewState>((set) => ({
  todayItems: [],
  overdueItems: [],
  stats: { total: 0, todayPending: 0, overdue: 0, completed: 0, mastered: 0 },
  loading: false,
  error: null,
  statsLoading: false,

  fetchToday: async () => {
    if (!api()) return
    try {
      const todayItems = await api()!.getToday()
      set({ todayItems })
    } catch (e) {
      console.error('Failed to fetch today reviews:', e)
      set({ error: '加载今日复习失败' })
    }
  },

  fetchOverdue: async () => {
    if (!api()) return
    try {
      const overdueItems = await api()!.getOverdue()
      set({ overdueItems })
    } catch (e) {
      console.error('Failed to fetch overdue reviews:', e)
      set({ error: '加载逾期复习失败' })
    }
  },

  fetchStats: async () => {
    if (!api()) return
    set({ statsLoading: true })
    try {
      const stats = await api()!.getStats()
      set({ stats, statsLoading: false })
    } catch (e) {
      console.error('Failed to fetch review stats:', e)
      set({ statsLoading: false, error: '加载统计数据失败' })
    }
  },

  fetchAll: async () => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      const [todayItems, overdueItems, stats] = await Promise.all([
        api()!.getToday(),
        api()!.getOverdue(),
        api()!.getStats()
      ])
      set({ todayItems, overdueItems, stats, loading: false })
    } catch (e) {
      console.error('Failed to fetch review data:', e)
      set({ loading: false, error: '加载复习数据失败' })
    }
  },

  rate: async (reviewId: number, quality: number) => {
    if (!api()) return
    try {
      await api()!.rate(reviewId, quality)
      const [todayItems, overdueItems, stats] = await Promise.all([
        api()!.getToday(),
        api()!.getOverdue(),
        api()!.getStats()
      ])
      set({ todayItems, overdueItems, stats })
    } catch (e) {
      console.error('Failed to rate review:', e)
    }
  }
}))
