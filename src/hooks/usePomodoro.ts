import { create } from 'zustand'
import dayjs from 'dayjs'

const api = () => window.electronAPI
const DEFAULT_FOCUS = 25
const DEFAULT_BREAK = 5
const DEFAULT_CYCLES = 4

export type PomodoroPhase = 'idle' | 'focus' | 'break'
export type PomodoroStatus = 'running' | 'paused' | 'stopped'

interface PomodoroState {
  phase: PomodoroPhase
  status: PomodoroStatus
  focusDuration: number
  breakDuration: number
  totalCycles: number
  currentCycle: number
  remainingSeconds: number
  elapsedFocusSeconds: number
  startTimestamp: number

  // Actions
  init: () => Promise<void>
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  setFocusDuration: (min: number) => void
  setBreakDuration: (min: number) => void
  setTotalCycles: (n: number) => void
}

export const usePomodoro = create<PomodoroState>((set, get) => ({
  phase: 'idle',
  status: 'stopped',
  focusDuration: DEFAULT_FOCUS,
  breakDuration: DEFAULT_BREAK,
  totalCycles: DEFAULT_CYCLES,
  currentCycle: 1,
  remainingSeconds: DEFAULT_FOCUS * 60,
  elapsedFocusSeconds: 0,
  startTimestamp: 0,

  init: async () => {
    try {
      const focus = await api()?.settings.get('pomodoro_focus')
      const brk = await api()?.settings.get('pomodoro_break')
      const cycles = await api()?.settings.get('pomodoro_cycles')
      const fd = focus ? parseInt(focus, 10) : DEFAULT_FOCUS
      const bd = brk ? parseInt(brk, 10) : DEFAULT_BREAK
      const tc = cycles ? parseInt(cycles, 10) : DEFAULT_CYCLES
      set({
        focusDuration: fd,
        breakDuration: bd,
        totalCycles: tc,
        remainingSeconds: fd * 60
      })
    } catch (e) {
      console.error('Failed to load pomodoro settings:', e)
    }
  },

  start: () => {
    const { focusDuration } = get()
    set({
      status: 'running',
      phase: 'focus',
      remainingSeconds: focusDuration * 60,
      currentCycle: 1,
      elapsedFocusSeconds: 0,
      startTimestamp: Date.now()
    })
  },

  pause: () => set({ status: 'paused' }),

  resume: () => {
    const state = get()
    const totalSeconds = state.phase === 'focus' ? state.focusDuration * 60 : state.breakDuration * 60
    const elapsedMs = Math.max(0, totalSeconds - state.remainingSeconds) * 1000
    set({
      status: 'running',
      startTimestamp: Date.now() - elapsedMs
    })
  },

  reset: () => {
    const { focusDuration } = get()
    set({
      phase: 'idle',
      status: 'stopped',
      currentCycle: 1,
      remainingSeconds: focusDuration * 60,
      elapsedFocusSeconds: 0,
      startTimestamp: 0
    })
  },

  skip: () => {
    const { phase, currentCycle, totalCycles, breakDuration, focusDuration, elapsedFocusSeconds } = get()
    if (phase === 'focus') {
      const actualMinutes = Math.round(elapsedFocusSeconds / 60)
      if (actualMinutes > 0) {
        const today = dayjs().format('YYYY-MM-DD')
        api()?.study.addSession(today, actualMinutes)
      }
      set({
        phase: 'break',
        remainingSeconds: breakDuration * 60,
        elapsedFocusSeconds: 0,
        startTimestamp: Date.now()
      })
    } else if (phase === 'break') {
      if (currentCycle >= totalCycles) {
        set({
          phase: 'idle',
          status: 'stopped',
          currentCycle: 1,
          remainingSeconds: focusDuration * 60,
          elapsedFocusSeconds: 0,
          startTimestamp: 0
        })
      } else {
        set({
          phase: 'focus',
          currentCycle: currentCycle + 1,
          remainingSeconds: focusDuration * 60,
          elapsedFocusSeconds: 0,
          startTimestamp: Date.now()
        })
      }
    }
  },

  tick: () => {
    const state = get()
    if (state.status !== 'running') return

    const totalSeconds = state.phase === 'focus' ? state.focusDuration * 60 : state.breakDuration * 60
    const elapsed = Math.max(0, Math.floor((Date.now() - state.startTimestamp) / 1000))
    const newRemaining = Math.max(0, totalSeconds - elapsed)
    const newElapsed =
      state.phase === 'focus' ? Math.min(state.focusDuration * 60, elapsed) : state.elapsedFocusSeconds

    if (newRemaining <= 0) {
      if (state.phase === 'focus') {
        const actualMinutes = Math.round(newElapsed / 60)
        if (actualMinutes > 0) {
          const today = dayjs().format('YYYY-MM-DD')
          api()?.study.addSession(today, actualMinutes)
        }

        // Notify
        try {
          new Notification('专注时间结束', { body: '该休息了 ☕' })
        } catch {}

        set({
          phase: 'break',
          remainingSeconds: state.breakDuration * 60,
          elapsedFocusSeconds: 0,
          startTimestamp: Date.now()
        })
      } else {
        // Break complete
        if (state.currentCycle >= state.totalCycles) {
          try {
            new Notification('🎉 番茄钟全部完成！', { body: '太棒了，休息一下吧' })
          } catch {}
          set({
            phase: 'idle',
            status: 'stopped',
            currentCycle: 1,
            remainingSeconds: state.focusDuration * 60,
            elapsedFocusSeconds: 0,
            startTimestamp: 0
          })
        } else {
          set({
            phase: 'focus',
            currentCycle: state.currentCycle + 1,
            remainingSeconds: state.focusDuration * 60,
            elapsedFocusSeconds: 0,
            startTimestamp: Date.now()
          })
        }
      }
    } else {
      set({ remainingSeconds: newRemaining, elapsedFocusSeconds: newElapsed })
    }
  },

  setFocusDuration: async (min: number) => {
    if (min < 1) min = 1
    set({ focusDuration: min })
    if (get().phase === 'idle') set({ remainingSeconds: min * 60 })
    try {
      await api()?.settings.set('pomodoro_focus', String(min))
    } catch (e) {
      console.error('Failed to save pomodoro focus setting:', e)
    }
  },

  setBreakDuration: async (min: number) => {
    if (min < 1) min = 1
    set({ breakDuration: min })
    try {
      await api()?.settings.set('pomodoro_break', String(min))
    } catch (e) {
      console.error('Failed to save pomodoro break setting:', e)
    }
  },

  setTotalCycles: async (n: number) => {
    if (n < 1) n = 1
    set({ totalCycles: n })
    try {
      await api()?.settings.set('pomodoro_cycles', String(n))
    } catch (e) {
      console.error('Failed to save pomodoro cycles setting:', e)
    }
  }
}))
