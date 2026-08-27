import { create } from 'zustand'

const SIDEBAR_KEY = 'sidebar_collapsed'
const IMMERSIVE_KEY = 'pomodoro_immersive'

interface UiState {
  /** Sidebar collapsed to an icon rail — persisted */
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  /** Pomodoro immersive mode (hides chrome, focuses the timer) */
  pomodoroImmersive: boolean
  setPomodoroImmersive: (on: boolean) => void
}

/** Small persistent UI-state store — sidebar collapse & pomodoro immersion. */
export const useUi = create<UiState>((set, get) => ({
  sidebarCollapsed: typeof localStorage !== 'undefined' && localStorage.getItem(SIDEBAR_KEY) === '1',
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
    } catch {}
    set({ sidebarCollapsed: next })
  },

  pomodoroImmersive: typeof localStorage !== 'undefined' && localStorage.getItem(IMMERSIVE_KEY) === '1',
  setPomodoroImmersive: on => {
    try {
      localStorage.setItem(IMMERSIVE_KEY, on ? '1' : '0')
    } catch {}
    set({ pomodoroImmersive: on })
  }
}))
