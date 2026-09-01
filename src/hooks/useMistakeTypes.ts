import { create } from 'zustand'
import type { MistakePoint } from '../types'

const api = () => window.electronAPI?.mistakeType

interface MistakeTypeState {
  items: MistakePoint[]
  loading: boolean
  error: string | null

  fetchList: () => Promise<void>
  add: (content: string, categoryId?: number | null) => Promise<void>
  increment: (id: number) => Promise<void>
  update: (id: number, content: string, categoryId?: number | null) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useMistakeTypes = create<MistakeTypeState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchList: async () => {
    if (!api()) return
    set({ loading: true, error: null })
    try {
      const items = await api()!.list()
      set({ items, loading: false })
    } catch (e) {
      console.error('Failed to fetch mistake types:', e)
      set({ loading: false, error: '加载错题类型失败' })
    }
  },

  add: async (content: string, categoryId?: number | null) => {
    if (!api()) return
    try {
      await api()!.add(content, categoryId)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to add mistake type:', e)
      set({ error: '添加错题类型失败' })
    }
  },

  increment: async (id: number) => {
    if (!api()) return
    try {
      await api()!.increment(id)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to increment mistake type:', e)
      set({ error: '计数失败' })
    }
  },

  update: async (id: number, content: string, categoryId?: number | null) => {
    if (!api()) return
    try {
      await api()!.update(id, content, categoryId)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to update mistake type:', e)
      set({ error: '更新错题类型失败' })
    }
  },

  remove: async (id: number) => {
    if (!api()) return
    try {
      await api()!.remove(id)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to delete mistake type:', e)
      set({ error: '删除错题类型失败' })
    }
  }
}))
