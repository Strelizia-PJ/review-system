import { create } from 'zustand'
import type { KnowledgePoint, NavPage } from '../types'
import { useReview } from './useReview'

const api = () => window.electronAPI?.knowledge

interface KnowledgeState {
  items: KnowledgePoint[]
  loading: boolean
  error: string | null
  keyword: string
  selectedId: number | null
  reviewSource: NavPage | null
  fetchList: () => Promise<void>
  add: (content: string, learnDate?: string) => Promise<void>
  remove: (id: number) => Promise<void>
  update: (id: number, content?: string, detail?: string) => Promise<void>
  search: (keyword: string) => Promise<void>
  setKeyword: (keyword: string) => void
  select: (id: number, source?: NavPage) => void
  deselect: () => void
  forget: (id: number) => Promise<void>
  setMaxInterval: (id: number, days: number | null) => Promise<void>
  reschedule: (id: number, date: string) => Promise<void>
}

export const useKnowledge = create<KnowledgeState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  keyword: '',
  selectedId: null,
  reviewSource: null,

  fetchList: async () => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      const items = await api()!.list()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to fetch knowledge list:', e)
      set({ loading: false, error: '加载知识点失败' })
    }
  },

  add: async (content: string, learnDate?: string) => {
    if (!api()) return
    try {
      const result = await api()!.add(content, learnDate)
      await get().fetchList()
      if (result?.id) {
        set({ selectedId: result.id })
      }
    } catch (e) {
      console.error('Failed to add knowledge point:', e)
      set({ error: '添加知识点失败' })
    }
  },

  remove: async (id: number) => {
    if (!api()) return
    try {
      await api()!.delete(id)
      // If deleting the currently selected item, deselect
      if (get().selectedId === id) {
        set({ selectedId: null })
      }
      await get().fetchList()
    } catch (e) {
      console.error('Failed to delete knowledge point:', e)
      set({ error: '删除知识点失败' })
    }
  },

  update: async (id: number, content?: string, detail?: string) => {
    if (!api()) return
    try {
      await api()!.update(id, content, detail)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to update knowledge point:', e)
      set({ error: '更新知识点失败' })
    }
  },

  search: async (keyword: string) => {
    if (!api()) return
    set({ keyword, loading: true, error: null })
    try {
      const items = keyword
        ? await api()!.search(keyword)
        : await api()!.list()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to search knowledge points:', e)
      set({ items: [], loading: false, error: '搜索失败' })
    }
  },

  setKeyword: (keyword: string) => {
    set({ keyword })
  },

  select: (id: number, source?: NavPage) => {
    set({ selectedId: id, reviewSource: source || null })
  },

  deselect: () => {
    set({ selectedId: null, reviewSource: null })
  },

  forget: async (id: number) => {
    if (!window.electronAPI?.review) return
    try {
      await window.electronAPI.review.forget(id)
      await get().fetchList()
      // Also refresh review stats so sidebar counters update immediately
      useReview.getState().fetchAll()
    } catch (e) {
      console.error('Failed to forget knowledge point:', e)
      set({ error: '重置知识点失败' })
    }
  },

  setMaxInterval: async (id: number, days: number | null) => {
    if (!api()) return
    try {
      await api()!.setMaxInterval(id, days)
      await get().fetchList()
      useReview.getState().fetchAll()
    } catch (e) {
      console.error('Failed to set knowledge point max interval:', e)
      set({ error: '设置间隔上限失败' })
    }
  },

  reschedule: async (id: number, date: string) => {
    if (!api()) return
    try {
      await api()!.reschedule(id, date)
      await get().fetchList()
      // Moved review date may change today/overdue panels and sidebar counters
      useReview.getState().fetchAll()
    } catch (e) {
      console.error('Failed to reschedule pending review:', e)
      set({ error: '修改复习时间失败' })
    }
  }
}))
