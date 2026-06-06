import { useEffect, useRef } from 'react'
import { usePomodoro } from '../../hooks/usePomodoro'

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
  const phaseColor = phase === 'focus' ? 'text-red-500' : phase === 'break' ? 'text-blue-500' : 'text-gray-400'

  return (
    <div className="max-w-md mx-auto space-y-6 py-4">
      {/* Timer circle */}
      <div className="flex flex-col items-center">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
            <circle
              cx="128" cy="128" r="120"
              fill="none" stroke="currentColor"
              className="text-gray-100 dark:text-gray-700"
              strokeWidth="8"
            />
            {phase !== 'idle' && (
              <circle
                cx="128" cy="128" r="120"
                fill="none"
                stroke={phase === 'focus' ? '#ef4444' : '#3b82f6'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-gray-800 dark:text-gray-100 tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className={`text-sm mt-2 font-medium ${phaseColor}`}>
              {phaseLabel}
            </span>
            {phase !== 'idle' && (
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                第 {currentCycle} / {totalCycles} 轮
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-3">
        {status === 'stopped' && (
          <button onClick={start} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
            开始专注
          </button>
        )}
        {status === 'running' && (
          <button onClick={pause} className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">
            暂停
          </button>
        )}
        {status === 'paused' && (
          <>
            <button onClick={resume} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
              继续
            </button>
            <button onClick={reset} className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium">
              结束
            </button>
          </>
        )}
        {phase !== 'idle' && (
          <button onClick={skip} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
            {phase === 'focus' ? '跳过休息' : '跳过 →'}
          </button>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3 transition-colors">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">设置</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">专注时长</label>
            <input
              type="number" min={1}
              value={focusDuration}
              onChange={e => setFocusDuration(parseInt(e.target.value) || 25)}
              className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center text-gray-800 dark:text-gray-100"
            />
            <span className="text-xs text-gray-400 block text-center mt-0.5">分钟</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">休息时长</label>
            <input
              type="number" min={1}
              value={breakDuration}
              onChange={e => setBreakDuration(parseInt(e.target.value) || 5)}
              className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center text-gray-800 dark:text-gray-100"
            />
            <span className="text-xs text-gray-400 block text-center mt-0.5">分钟</span>
          </div>
          <div>
            <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">循环次数</label>
            <input
              type="number" min={1}
              value={totalCycles}
              onChange={e => setTotalCycles(parseInt(e.target.value) || 4)}
              className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center text-gray-800 dark:text-gray-100"
            />
            <span className="text-xs text-gray-400 block text-center mt-0.5">轮</span>
          </div>
        </div>
      </div>
    </div>
  )
}
