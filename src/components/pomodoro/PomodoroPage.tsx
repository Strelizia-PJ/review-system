import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { usePomodoro } from '../../hooks/usePomodoro'
import { useUi } from '../../hooks/useUi'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

/* One seamless wave row: sine bumps repeating every 128px.
   Duplicated far beyond the needed width so animate-wave (-128px) loops forever. */
const WAVE_PATH =
  'M0 18 Q 32 6 64 18 T 128 18 Q 160 6 192 18 T 256 18 Q 288 6 320 18 T 384 18 Q 416 6 448 18 T 512 18 Q 544 6 576 18 T 640 18 V 44 H 0 Z'

function LiquidWave({ level, active }: { level: number; active: boolean }) {
  return (
    /* Clipped to the timer circle — fills bottom-up as the session progresses */
    <div className="pointer-events-none absolute inset-[11%] overflow-hidden rounded-full">
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-linear"
        style={{ height: `${Math.max(Math.min(level, 100), 0)}%` }}
      >
        <svg
          className={cn(
            'absolute -top-7 left-0 min-w-[200%]',
            active && 'motion-safe:animate-wave',
            'text-white/35'
          )}
          width="680"
          height="44"
          viewBox="0 0 680 44"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={WAVE_PATH} fill="currentColor" />
        </svg>
      </div>
    </div>
  )
}

export default function PomodoroPage() {
  const {
    phase,
    status,
    focusDuration,
    breakDuration,
    totalCycles,
    currentCycle,
    remainingSeconds,
    init,
    start,
    pause,
    resume,
    reset,
    skip,
    tick,
    setFocusDuration,
    setBreakDuration,
    setTotalCycles
  } = usePomodoro()

  const immersive = useUi(s => s.pomodoroImmersive)
  const setImmersive = useUi(s => s.setPomodoroImmersive)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(tick, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status])

  // Esc leaves immersive mode
  useEffect(() => {
    if (!immersive) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImmersive(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [immersive, setImmersive])

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const totalSeconds = phase === 'focus' ? focusDuration * 60 : breakDuration * 60
  const remainingPct = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 100
  /* Fill-up semantics: both ring and liquid rise from 0% → 100% as time elapses */
  const elapsedPct = 100 - remainingPct
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = (remainingPct / 100) * circumference

  const running = status === 'running'
  const isFocus = phase === 'focus'

  const phaseLabel = phase === 'focus' ? '🌿 专注中' : phase === 'break' ? '☕ 休息中' : '准备开始'
  const phaseColor =
    phase === 'focus'
      ? 'text-emerald-600 dark:text-emerald-400'
      : phase === 'break'
        ? 'text-primary'
        : 'text-muted-foreground'

  return (
    <div
      className={cn(
        'mx-auto flex flex-col items-center',
        immersive ? 'min-h-[70vh] justify-center gap-10 py-8' : 'max-w-md gap-6 py-4'
      )}
    >
      {/* Timer circle */}
      <div className={cn('relative', immersive ? 'h-[400px] w-[400px]' : 'h-72 w-72')}>
        {/* Breathing halo while running */}
        {running && (
          <div
            className={cn(
              'absolute -inset-4 rounded-full blur-3xl motion-safe:animate-breathe transition-colors duration-700',
              isFocus ? 'bg-emerald-500/25' : 'bg-primary/30'
            )}
          />
        )}

        <svg className="relative h-full w-full -rotate-90" viewBox="0 0 256 256">
          <defs>
            <linearGradient id="pomo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              {isFocus ? (
                <>
                  <stop offset="0%" stopColor="hsl(163 88% 40%)" />
                  <stop offset="100%" stopColor="hsl(160 84% 45%)" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(262 76% 61%)" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            className="text-muted"
            strokeWidth="8"
          />

          {/* Decorative outer dashes — slow spin while running */}
          {running && (
            <g className="origin-center motion-safe:animate-spin" style={{ animationDuration: '14s' }}>
              <circle
                cx="128"
                cy="128"
                r="110"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="2 7"
                strokeLinecap="round"
                className="text-muted-foreground/30"
              />
            </g>
          )}

          {/* Progress — fill-up ring: soft halo stroke beneath main gradient arc */}
          {phase !== 'idle' && (
            <>
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke={isFocus ? 'hsl(160 84% 39%)' : 'hsl(var(--primary))'}
                strokeOpacity="0.22"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="url(#pomo-grad)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </>
          )}
        </svg>

        {/* Liquid fill + center content */}
        <div className="absolute inset-0 rounded-full">
          {phase !== 'idle' && <LiquidWave level={elapsedPct} active={running} />}
          <div className="relative z-10 flex h-full flex-col items-center justify-center">
            <span
              className={cn(
                'font-mono font-bold tabular-nums text-foreground drop-shadow-sm',
                immersive ? 'text-7xl' : 'text-5xl'
              )}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>

            {/* Phase label crossfades between focus / break */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={phaseLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                className={cn('mt-2 text-sm font-medium transition-colors duration-700', phaseColor)}
              >
                {phaseLabel}
              </motion.span>
            </AnimatePresence>

            {phase !== 'idle' && (
              <span className="mt-1 text-xs text-muted-foreground">
                第 {currentCycle} / {totalCycles} 轮
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-3">
        {status === 'stopped' && (
          <Button size={immersive ? 'lg' : 'md'} onClick={start}>
            开始专注
          </Button>
        )}
        {status === 'running' && (
          <Button
            size={immersive ? 'lg' : 'md'}
            onClick={pause}
            className="bg-none bg-amber-500 text-white shadow-sm hover:bg-amber-600"
          >
            暂停
          </Button>
        )}
        {status === 'paused' && (
          <>
            <Button
              size={immersive ? 'lg' : 'md'}
              onClick={resume}
              className="bg-none bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
            >
              继续
            </Button>
            <Button size={immersive ? 'lg' : 'md'} variant="secondary" onClick={reset}>
              结束
            </Button>
          </>
        )}
        {phase !== 'idle' && (
          <Button variant="outline" size="sm" onClick={skip}>
            {phase === 'focus' ? '跳过休息' : '跳过 →'}
          </Button>
        )}

        {/* Immersion toggle */}
        {(status === 'running' || status === 'paused' || immersive) && (
          <Button variant="outline" size="sm" onClick={() => setImmersive(!immersive)}>
            {immersive ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {immersive ? '退出沉浸 (Esc)' : '沉浸模式'}
          </Button>
        )}
      </div>

      {/* Settings — hidden in immersive mode to keep the scene quiet */}
      {!immersive && (
        <div className="w-full space-y-3 rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
          <h3 className="text-sm font-medium text-foreground">设置</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">专注时长</label>
              <Input
                type="number"
                min={1}
                value={focusDuration}
                onChange={e => setFocusDuration(parseInt(e.target.value) || 25)}
                className="text-center text-sm"
              />
              <span className="mt-0.5 block text-center text-xs text-muted-foreground">分钟</span>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">休息时长</label>
              <Input
                type="number"
                min={1}
                value={breakDuration}
                onChange={e => setBreakDuration(parseInt(e.target.value) || 5)}
                className="text-center text-sm"
              />
              <span className="mt-0.5 block text-center text-xs text-muted-foreground">分钟</span>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">循环次数</label>
              <Input
                type="number"
                min={1}
                value={totalCycles}
                onChange={e => setTotalCycles(parseInt(e.target.value) || 4)}
                className="text-center text-sm"
              />
              <span className="mt-0.5 block text-center text-xs text-muted-foreground">轮</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
