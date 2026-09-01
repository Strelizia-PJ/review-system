import { create } from 'zustand'
import type { Category } from '../types'

const api = () => window.electronAPI?.category

interface CategoryState {
  items: Category[]
  loading: boolean
  error: string | null

  fetchList: () => Promise<void>
  add: (name: string, parentId: number | null) => Promise<void>
  update: (id: number, name: string) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useCategories = create<CategoryState>((set, get) => ({
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
      console.error('Failed to fetch categories:', e)
      set({ loading: false, error: '加载分类失败' })
    }
  },

  add: async (name: string, parentId: number | null) => {
    if (!api()) return
    try {
      await api()!.add(name, parentId)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to add category:', e)
      set({ error: '添加分类失败' })
    }
  },

  update: async (id: number, name: string) => {
    if (!api()) return
    try {
      await api()!.update(id, name)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to update category:', e)
      set({ error: '更新分类失败' })
    }
  },

  remove: async (id: number) => {
    if (!api()) return
    try {
      await api()!.remove(id)
      await get().fetchList()
    } catch (e) {
      console.error('Failed to delete category:', e)
      set({ error: '删除分类失败' })
    }
  }
}))
