import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  init: () => Promise<void>
}

let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

function getSystemIsDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getActualIsDark(mode: ThemeMode): boolean {
  return mode === 'system' ? getSystemIsDark() : mode === 'dark'
}

function applyDarkClass(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark)
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: getSystemIsDark(),

  setMode: async (mode: ThemeMode) => {
    const isDark = getActualIsDark(mode)
    applyDarkClass(isDark)
    set({ mode, isDark })

    // Persist preference
    try {
      await window.electronAPI?.settings.set('theme_mode', mode)
    } catch {}
  },

  init: async () => {
    // Load saved preference
    let savedMode: ThemeMode = 'system'
    try {
      const saved = await window.electronAPI?.settings.get('theme_mode')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        savedMode = saved
      }
    } catch {}

    const isDark = getActualIsDark(savedMode)
    applyDarkClass(isDark)
    set({ mode: savedMode, isDark })

    // Remove old listener before adding new one
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (mediaListener) {
      mediaQuery.removeEventListener('change', mediaListener)
    }
    mediaListener = (e: MediaQueryListEvent) => {
      const { mode } = get()
      if (mode === 'system') {
        applyDarkClass(e.matches)
        set({ isDark: e.matches })
      }
    }
    mediaQuery.addEventListener('change', mediaListener)
  }
}))
