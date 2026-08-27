import { create } from 'zustand'
import type { MistakePoint } from '../types'

const api = () => window.electronAPI?.mistake

interface MistakeState {
  items: MistakePoint[]
  loading: boolean
  error: string | null

  fetchList: () => Promise<void>
  add: (content: string) => Promise<void>
  increment: (id: number) => Promise<void>
  update: (id: number, content: string) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useMistakes = create<MistakeState>((set, get) => ({
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
      console.error('Failed to fetch mistake points:', e)
      set({ loading: false, error: '加载易错点失败' })
    }
  },

  add: async (content: string) => {
    if (!api()) return
    try {
      await api()!.add(content)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to add mistake point:', e)
      set({ error: '添加易错点失败' })
    }
  },

  increment: async (id: number) => {
    if (!api()) return
    try {
      await api()!.increment(id)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to increment mistake point:', e)
      set({ error: '计数失败' })
    }
  },

  update: async (id: number, content: string) => {
    if (!api()) return
    try {
      await api()!.update(id, content)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to update mistake point:', e)
      set({ error: '更新易错点失败' })
    }
  },

  remove: async (id: number) => {
    if (!api()) return
    try {
      await api()!.remove(id)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to delete mistake point:', e)
      set({ error: '删除易错点失败' })
    }
  }
}))
