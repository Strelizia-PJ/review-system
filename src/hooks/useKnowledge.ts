import { create } from 'zustand'
import type { KnowledgePoint, NavPage } from '../types'

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
      await api()!.add(content, learnDate)
      await get().fetchList()
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
  }
}))
