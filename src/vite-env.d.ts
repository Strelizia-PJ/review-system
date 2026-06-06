/// <reference types="vite/client" />

import type {
  KnowledgePoint,
  KnowledgePointDetail,
  ReviewRecord,
  ReviewStats,
  DailyPlan,
  WeekStats,
  Recent7Stats,
  MonthStats,
  MonthReviewStats,
  ScannedGameData
} from './types'

declare global {
  interface Window {
    electronAPI: {
      knowledge: {
        add: (content: string, learnDate?: string) => Promise<{ id: number }>
        list: () => Promise<KnowledgePoint[]>
        delete: (id: number) => Promise<void>
        search: (keyword: string) => Promise<KnowledgePoint[]>
        update: (id: number, content?: string, detail?: string) => Promise<void>
        getById: (id: number) => Promise<KnowledgePointDetail | null>
      }
      review: {
        getToday: () => Promise<ReviewRecord[]>
        getOverdue: () => Promise<ReviewRecord[]>
        rate: (reviewId: number, quality: number) => Promise<{ nextReviewDate: string | null; nextInterval: number }>
        getStats: () => Promise<ReviewStats>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
      }
      plans: {
        add: (content: string, type: string, config?: Record<string, unknown>, planDate?: string) => Promise<{ id: number }>
        getToday: () => Promise<DailyPlan[]>
        toggle: (planId: number) => Promise<void>
        delete: (planId: number) => Promise<void>
      }
      study: {
        addSession: (date: string, durationMinutes: number) => Promise<void>
        getWeekStats: () => Promise<WeekStats>
        getRecent7: () => Promise<Recent7Stats>
        getMonthStats: (year: number, month: number) => Promise<MonthStats>
        getMonthReviewStats: (year: number, month: number) => Promise<MonthReviewStats>
      }
      image: {
        save: (kpId: number, fileData: Uint8Array, originalName: string) => Promise<string>
      }
      import: {
        scan: (dirPath: string) => Promise<ScannedGameData>
        apply: (dirPath: string, selectedDates: string[]) => Promise<{ imported: number }>
      }
      app: {
        minimizeToTray: () => Promise<void>
      }
      autoStart: {
        isEnabled: () => Promise<boolean>
        set: (enabled: boolean) => Promise<void>
      }
      data: {
        export: () => Promise<{ success: boolean; path?: string; error?: string }>
        import: () => Promise<{ success: boolean; imported?: { kp: number; rr: number }; error?: string }>
      }
    }
  }
}
