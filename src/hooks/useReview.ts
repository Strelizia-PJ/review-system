import { create } from 'zustand'
import type { ReviewRecord, ReviewStats } from '../types'

const api = () => window.electronAPI?.review

interface ReviewState {
  todayItems: ReviewRecord[]
  stats: ReviewStats
  loading: boolean
  error: string | null
  statsLoading: boolean
  lastRated: { reviewId: number; kpId: number; content: string; detail: string } | null

  fetchToday: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchAll: () => Promise<void>
  rate: (reviewId: number, quality: number, customDays?: number) => Promise<void>
  rollback: (reviewId: number) => Promise<void>
  clearLastRated: () => void
}

export const useReview = create<ReviewState>((set, get) => ({
  todayItems: [],
  stats: { total: 0, todayPending: 0, overdue: 0, completed: 0 },
  loading: false,
  error: null,
  statsLoading: false,
  lastRated: null,

  fetchToday: async () => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      const todayItems = await api()!.getToday()
      set({ todayItems, loading: false })
    } catch (e) {
      console.error('Failed to fetch today reviews:', e)
      set({ loading: false, error: '加载今日复习失败' })
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
      set({ statsLoading: false })
    }
  },

  fetchAll: async () => {
    await Promise.all([get().fetchToday(), get().fetchStats()])
  },

  rate: async (reviewId: number, quality: number, customDays?: number) => {
    if (!api()) return
    // Capture item info before rating for the verification card / undo
    const item = get().todayItems.find(i => i.id === reviewId)
    try {
      await api()!.rate(reviewId, quality, customDays)
      // Fetch the knowledge point detail for post-rating verification
      let detail = ''
      if (item) {
        try {
          const kp = await window.electronAPI?.knowledge?.getById(item.knowledge_point_id)
          detail = kp?.detail || ''
        } catch {
          // detail unavailable — card falls back to title-only
        }
      }
      const [todayItems, stats] = await Promise.all([
        api()!.getToday(),
        api()!.getStats()
      ])
      set({
        todayItems, stats,
        lastRated: item ? { reviewId, kpId: item.knowledge_point_id, content: item.content, detail } : null
      })
    } catch (e) {
      console.error('Failed to rate review:', e)
      set({ lastRated: null })
    }
  },

  rollback: async (reviewId: number) => {
    if (!api()) return
    try {
      await api()!.rollback(reviewId)
      set({ lastRated: null })
      const [todayItems, stats] = await Promise.all([
        api()!.getToday(),
        api()!.getStats()
      ])
      set({ todayItems, stats })
    } catch (e) {
      console.error('Failed to rollback review:', e)
    }
  },

  clearLastRated: () => set({ lastRated: null })
}))
