import { useState, useEffect } from 'react'
import { useStudyStats } from '../../hooks/useStudyStats'
import dayjs from 'dayjs'

function hourLevel(minutes: number): number {
  const h = minutes / 60
  if (h <= 0) return 0
  if (h <= 1) return 1
  if (h <= 2) return 2
  if (h <= 3) return 3
  if (h <= 4) return 4
  if (h <= 5) return 5
  return 6
}

const levelColors: Record<number, string> = {
  0: 'bg-gray-100 dark:bg-gray-700',
  1: 'bg-green-200 dark:bg-green-900',
  2: 'bg-green-300 dark:bg-green-800',
  3: 'bg-green-400 dark:bg-green-700',
  4: 'bg-green-500 dark:bg-green-600',
  5: 'bg-green-600 dark:bg-green-500',
  6: 'bg-green-700 dark:bg-green-400'
}

import { DAY_LABELS_MONDAY_FIRST as DAY_LABELS } from '../../constants'

export default function StudyStatsPage() {
  const {
    monthStats, monthReviewStats, recent7Stats, monthYear, monthMonth, loading, error,
    fetchAll, prevMonth, nextMonth, addBackfill
  } = useStudyStats()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build review lookup map: date -> completedCount
  const reviewMap: Record<string, number> = {}
  if (monthReviewStats) {
    for (const d of monthReviewStats.days) {
      reviewMap[d.date] = d.completedCount
    }
  }
  const [backfillDate, setBackfillDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [backfillMinutes, setBackfillMinutes] = useState(30)

  useEffect(() => { fetchAll() }, [])

  const formatTime = (min: number) => {
    if (min === 0) return '0min'
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  const formatHours = (min: number) => {
    if (min === 0) return '0h'
    return (min / 60).toFixed(1) + 'h'
  }

  // Build calendar grid
  const calendarDays: (null | { date: string; minutes: number; dayNum: number })[] = []
  if (monthStats) {
    const firstDay = dayjs(monthStats.days[0]?.date)
    const startDayOfWeek = firstDay.day() === 0 ? 6 : firstDay.day() - 1 // Mon=0, Sun=6
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null) // padding
    }
    for (const day of monthStats.days) {
      calendarDays.push({
        date: day.date,
        minutes: day.minutes,
        dayNum: parseInt(dayjs(day.date).format('D'), 10)
      })
    }
  }

  const today = dayjs().format('YYYY-MM-DD')
  const selectedMinutes = selectedDate
    ? monthStats?.days.find(d => d.date === selectedDate)?.minutes ?? 0
    : 0

  const maxBarMinutes = recent7Stats ? Math.max(...recent7Stats.days.map(d => d.minutes), 1) : 1

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-center text-gray-400 text-sm py-8">加载中...</p>
      ) : (
        <>
          {/* Calendar heatmap */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 transition-colors">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">学习日历</h3>

            {/* Month nav */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">◀</button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {monthYear} 年 {monthMonth} 月
              </span>
              <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">▶</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map(label => (
                <div key={label} className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />

                const isToday = day.date === today
                const isSelected = day.date === selectedDate
                const level = hourLevel(day.minutes)

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(isSelected ? null : day.date)}
                    title={`${day.date}: 专注 ${formatHours(day.minutes)}${reviewMap[day.date] ? ` · 完成 ${reviewMap[day.date]} 条复习` : ''}`}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-medium transition-colors relative ${
                      levelColors[level]
                    } ${
                      isToday ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''
                    } ${
                      isSelected ? 'ring-2 ring-gray-400 dark:ring-gray-300' : ''
                    } text-gray-700 dark:text-gray-200 hover:opacity-80`}
                  >
                    <span>{day.dayNum}</span>
                    {reviewMap[day.date] > 0 && (
                      <span className="text-[8px] text-blue-500 dark:text-blue-400 leading-none">●</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day detail */}
            {selectedDate && (
              <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
                {selectedDate} — <span className="font-medium">{formatHours(selectedMinutes)}</span>
                {(reviewMap[selectedDate] ?? 0) > 0 && (
                  <span className="ml-2">· 完成 <span className="font-medium text-blue-600 dark:text-blue-400">{reviewMap[selectedDate]} 条</span>复习</span>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-3">
              <span>● 有复习活动</span>
              <span>色深 = 专注时长</span>
            </div>

            {/* Totals */}
            {monthStats && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  本月总计: <span className="font-medium text-gray-700 dark:text-gray-200">{formatTime(monthStats.total)}</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  复习: <span className="font-medium text-blue-600 dark:text-blue-400">{monthReviewStats?.total ?? 0} 条</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  日均: <span className="font-medium text-gray-700 dark:text-gray-200">{formatTime(monthStats.avg)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Recent 7 days */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 transition-colors">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">近7天</h3>
            {recent7Stats && (
              <div className="space-y-2">
                {recent7Stats.days.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-14 shrink-0">
                      {dayjs(day.date).format('M/D')}
                    </span>
                    <div className="flex-1 h-6 bg-gray-50 dark:bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded transition-all"
                        style={{ width: `${maxBarMinutes > 0 ? (day.minutes / maxBarMinutes) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-14 shrink-0">
                      {formatTime(day.minutes)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    近7天平均: <span className="font-medium text-gray-700 dark:text-gray-200">{formatTime(recent7Stats.avg)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Backfill */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 transition-colors">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">补登学习时长</h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">日期</label>
                <input
                  type="date"
                  value={backfillDate}
                  max={dayjs().format('YYYY-MM-DD')}
                  onChange={e => setBackfillDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">时长</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={1} max={1440}
                    value={backfillMinutes}
                    onChange={e => setBackfillMinutes(parseInt(e.target.value) || 30)}
                    className="w-20 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center text-gray-800 dark:text-gray-100"
                  />
                  <span className="text-xs text-gray-400">分钟</span>
                </div>
              </div>
              <button
                onClick={() => addBackfill(backfillDate, backfillMinutes)}
                className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                确认补登
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
