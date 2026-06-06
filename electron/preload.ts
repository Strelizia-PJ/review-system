import { contextBridge, ipcRenderer } from 'electron'

const api = {
  knowledge: {
    add: (content: string, learnDate?: string) => ipcRenderer.invoke('knowledge:add', content, learnDate),
    list: () => ipcRenderer.invoke('knowledge:list'),
    delete: (id: number) => ipcRenderer.invoke('knowledge:delete', id),
    search: (keyword: string) => ipcRenderer.invoke('knowledge:search', keyword),
    update: (id: number, content?: string, detail?: string) => ipcRenderer.invoke('knowledge:update', id, content, detail),
    getById: (id: number) => ipcRenderer.invoke('knowledge:get-by-id', id)
  },
  review: {
    getToday: () => ipcRenderer.invoke('review:get-today'),
    getOverdue: () => ipcRenderer.invoke('review:get-overdue'),
    rate: (reviewId: number, quality: number) => ipcRenderer.invoke('review:rate', reviewId, quality),
    getStats: () => ipcRenderer.invoke('review:get-stats')
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  plans: {
    add: (content: string, type: string, config?: Record<string, unknown>, planDate?: string) => ipcRenderer.invoke('plans:add', content, type, config, planDate),
    getToday: () => ipcRenderer.invoke('plans:get-today'),
    toggle: (planId: number) => ipcRenderer.invoke('plans:toggle', planId),
    delete: (planId: number) => ipcRenderer.invoke('plans:delete', planId)
  },
  study: {
    addSession: (date: string, durationMinutes: number) => ipcRenderer.invoke('study:add-session', date, durationMinutes),
    getWeekStats: () => ipcRenderer.invoke('study:get-week-stats'),
    getRecent7: () => ipcRenderer.invoke('study:get-recent-7'),
    getMonthStats: (year: number, month: number) => ipcRenderer.invoke('study:get-month-stats', year, month),
    getMonthReviewStats: (year: number, month: number) => ipcRenderer.invoke('study:get-month-review-stats', year, month)
  },
  image: {
    save: (kpId: number, fileData: Uint8Array, originalName: string) => ipcRenderer.invoke('image:save', kpId, fileData, originalName)
  },
  import: {
    scan: (dirPath: string) => ipcRenderer.invoke('import:scan', dirPath),
    apply: (dirPath: string, selectedDates: string[]) => ipcRenderer.invoke('import:apply', dirPath, selectedDates)
  },
  app: {
    minimizeToTray: () => ipcRenderer.invoke('app:minimize-to-tray')
  },
  autoStart: {
    isEnabled: () => ipcRenderer.invoke('auto-start:is-enabled'),
    set: (enabled: boolean) => ipcRenderer.invoke('auto-start:set', enabled)
  },
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: () => ipcRenderer.invoke('data:import')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
