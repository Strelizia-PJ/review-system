import { useEffect, useRef } from 'react'
import { usePomodoro } from '../../hooks/usePomodoro'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export default function PomodoroPage() {
  const {
    phase, status, focusDuration, breakDuration, totalCycles,
    currentCycle, remainingSeconds,
    init, start, pause, resume, reset, skip, tick,
    setFocusDuration, setBreakDuration, setTotalCycles
  } = usePomodoro()

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

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const totalSeconds = phase === 'focus' ? focusDuration * 60 : breakDuration * 60
  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 100
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const phaseLabel = phase === 'focus' ? '🔥 专注中' : phase === 'break' ? '☕ 休息中' : '准备开始'
  const phaseColor = phase === 'focus' ? 'text-destructive' : phase === 'break' ? 'text-primary' : 'text-muted-foreground'

  return (
    <div className="mx-auto max-w-md space-y-6 py-4">
      {/* Timer circle */}
      <div className="flex flex-col items-center">
        <div className="relative h-64 w-64">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 256 256">
            <circle
              cx="128" cy="128" r="120"
              fill="none" stroke="currentColor"
              className="text-muted"
              strokeWidth="8"
            />
            {phase !== 'idle' && (
              <circle
                cx="128" cy="128" r="120"
                fill="none"
                stroke={phase === 'focus' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-bold tabular-nums text-foreground">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className={`mt-2 text-sm font-medium ${phaseColor}`}>
              {phaseLabel}
            </span>
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
          <Button size="lg" onClick={start}>开始专注</Button>
        )}
        {status === 'running' && (
          <Button size="lg" onClick={pause} className="bg-amber-500 text-white hover:bg-amber-600">暂停</Button>
        )}
        {status === 'paused' && (
          <>
            <Button size="lg" onClick={resume} className="bg-emerald-500 text-white hover:bg-emerald-600">继续</Button>
            <Button size="lg" variant="secondary" onClick={reset}>结束</Button>
          </>
        )}
        {phase !== 'idle' && (
          <Button variant="outline" size="sm" onClick={skip}>
            {phase === 'focus' ? '跳过休息' : '跳过 →'}
          </Button>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 transition-colors">
        <h3 className="text-sm font-medium text-foreground">设置</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">专注时长</label>
            <Input
              type="number" min={1}
              value={focusDuration}
              onChange={e => setFocusDuration(parseInt(e.target.value) || 25)}
              className="text-center text-sm"
            />
            <span className="mt-0.5 block text-center text-xs text-muted-foreground">分钟</span>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">休息时长</label>
            <Input
              type="number" min={1}
              value={breakDuration}
              onChange={e => setBreakDuration(parseInt(e.target.value) || 5)}
              className="text-center text-sm"
            />
            <span className="mt-0.5 block text-center text-xs text-muted-foreground">分钟</span>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">循环次数</label>
            <Input
              type="number" min={1}
              value={totalCycles}
              onChange={e => setTotalCycles(parseInt(e.target.value) || 4)}
              className="text-center text-sm"
            />
            <span className="mt-0.5 block text-center text-xs text-muted-foreground">轮</span>
          </div>
        </div>
      </div>
    </div>
  )
}
