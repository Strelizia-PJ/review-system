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
  ScannedGameData,
  MistakePoint
} from './types'

declare global {
  /** Auto-update status pushed from the main process via IPC. */
  type UpdateStatus =
    | { event: 'checking' }
    | { event: 'available'; version: string }
    | { event: 'not-available'; version: string }
    | { event: 'downloading'; percent: number }
    | { event: 'downloaded'; version: string }
    | { event: 'error'; message: string }

  interface Window {
    electronAPI: {
      knowledge: {
        add: (content: string, learnDate?: string) => Promise<{ id: number }>
        list: () => Promise<KnowledgePoint[]>
        delete: (id: number) => Promise<void>
        search: (keyword: string) => Promise<KnowledgePoint[]>
        update: (id: number, content?: string, detail?: string) => Promise<void>
        getById: (id: number) => Promise<KnowledgePointDetail | null>
        setMaxInterval: (id: number, days: number | null) => Promise<{ effectiveMaxIntervalDays: number }>
        reschedule: (id: number, date: string) => Promise<{ scheduleDate: string }>
      }
      review: {
        getToday: () => Promise<ReviewRecord[]>
        rate: (
          reviewId: number,
          quality: number,
          customDays?: number
        ) => Promise<{ nextReviewDate: string | null; nextInterval: number }>
        rollback: (reviewId: number) => Promise<{ content: string }>
        forget: (kpId: number) => Promise<{ nextReviewDate: string }>
        getStats: () => Promise<ReviewStats>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
      }
      plans: {
        add: (
          content: string,
          type: string,
          config?: Record<string, unknown>,
          planDate?: string
        ) => Promise<{ id: number }>
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
      mistake: {
        add: (content: string) => Promise<{ id: number }>
        list: () => Promise<MistakePoint[]>
        increment: (id: number) => Promise<void>
        update: (id: number, content: string) => Promise<void>
        remove: (id: number) => Promise<void>
      }
      mistakeType: {
        add: (content: string) => Promise<{ id: number }>
        list: () => Promise<MistakePoint[]>
        increment: (id: number) => Promise<void>
        update: (id: number, content: string) => Promise<void>
        remove: (id: number) => Promise<void>
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
      update: {
        getVersion: () => Promise<string>
        getPlatform: () => Promise<string>
        check: () => Promise<void>
        install: () => Promise<void>
        openRelease: () => Promise<void>
        /** 'off' = direct connection, otherwise the active mirror prefix */
        getMirror: () => Promise<string>
        setMirror: (value: string) => Promise<void>
        onStatus: (callback: (status: UpdateStatus) => void) => () => void
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
