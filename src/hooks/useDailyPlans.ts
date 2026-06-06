import { create } from 'zustand'
import type { DailyPlan } from '../types'

const api = () => window.electronAPI?.plans

interface DailyPlanState {
  items: DailyPlan[]
  loading: boolean
  error: string | null
  fetchToday: () => Promise<void>
  add: (content: string, type: string, config?: Record<string, unknown>, planDate?: string) => Promise<void>
  toggle: (planId: number) => Promise<void>
  remove: (planId: number) => Promise<void>
}

export const useDailyPlans = create<DailyPlanState>((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchToday: async () => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      const items = await api()!.getToday()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to fetch daily plans:', e)
      set({ loading: false, error: '加载每日计划失败' })
    }
  },

  add: async (content: string, type: string, config?: Record<string, unknown>, planDate?: string) => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      await api()!.add(content, type, config, planDate)
      const items = await api()!.getToday()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to add daily plan:', e)
      set({ loading: false, error: '添加计划失败' })
    }
  },

  toggle: async (planId: number) => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      await api()!.toggle(planId)
      const items = await api()!.getToday()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to toggle plan:', e)
      set({ loading: false, error: '切换计划状态失败' })
    }
  },

  remove: async (planId: number) => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      await api()!.delete(planId)
      const items = await api()!.getToday()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to delete plan:', e)
      set({ loading: false, error: '删除计划失败' })
    }
  }
}))
