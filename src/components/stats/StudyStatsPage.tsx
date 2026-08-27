import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStudyStats } from '../../hooks/useStudyStats'
import dayjs from 'dayjs'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { ErrorBar } from '../shared/Bars'
import { cn } from '../../utils/cn'
import { DAY_LABELS_MONDAY_FIRST as DAY_LABELS } from '../../constants'

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
  0: 'bg-muted',
  1: 'bg-emerald-200 dark:bg-emerald-900',
  2: 'bg-emerald-300 dark:bg-emerald-800',
  3: 'bg-emerald-400 dark:bg-emerald-700',
  4: 'bg-emerald-500 dark:bg-emerald-600',
  5: 'bg-emerald-600 dark:bg-emerald-500',
  6: 'bg-emerald-700 dark:bg-emerald-400'
}

export default function StudyStatsPage() {
  const {
    monthStats,
    monthReviewStats,
    recent7Stats,
    monthYear,
    monthMonth,
    loading,
    error,
    fetchAll,
    prevMonth,
    nextMonth,
    addBackfill
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

  useEffect(() => {
    fetchAll()
  }, [])

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
    ? (monthStats?.days.find(d => d.date === selectedDate)?.minutes ?? 0)
    : 0

  const maxBarMinutes = recent7Stats ? Math.max(...recent7Stats.days.map(d => d.minutes), 1) : 1

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {error && <ErrorBar>{error}</ErrorBar>}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : (
        <>
          {/* Calendar heatmap */}
          <div className="rounded-lg border border-border bg-card p-4 transition-colors">
            <h3 className="mb-3 text-sm font-medium text-foreground">学习日历</h3>

            {/* Month nav */}
            <div className="mb-4 flex items-center justify-center gap-4">
              <button
                onClick={prevMonth}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {monthYear} 年 {monthMonth} 月
              </span>
              <button
                onClick={nextMonth}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_LABELS.map(label => (
                <div key={label} className="py-1 text-center text-xs text-muted-foreground">
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
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center rounded-md text-xs font-medium transition-colors hover:opacity-80',
                      levelColors[level],
                      isToday && 'ring-2 ring-primary',
                      isSelected && 'ring-2 ring-muted-foreground',
                      'text-foreground'
                    )}
                  >
                    <span>{day.dayNum}</span>
                    {reviewMap[day.date] > 0 && (
                      <span className="text-[8px] leading-none text-primary">●</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected day detail */}
            {selectedDate && (
              <div className="mt-3 text-center text-sm text-foreground">
                {selectedDate} — <span className="font-medium">{formatHours(selectedMinutes)}</span>
                {(reviewMap[selectedDate] ?? 0) > 0 && (
                  <span className="ml-2">
                    · 完成 <span className="font-medium text-primary">{reviewMap[selectedDate]} 条</span>复习
                  </span>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>● 有复习活动</span>
              <span>色深 = 专注时长</span>
            </div>

            {/* Totals */}
            {monthStats && (
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">
                  本月总计:{' '}
                  <span className="font-medium text-foreground">{formatTime(monthStats.total)}</span>
                </span>
                <span className="text-muted-foreground">
                  复习: <span className="font-medium text-primary">{monthReviewStats?.total ?? 0} 条</span>
                </span>
                <span className="text-muted-foreground">
                  日均: <span className="font-medium text-foreground">{formatTime(monthStats.avg)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Recent 7 days */}
          <div className="rounded-lg border border-border bg-card p-4 transition-colors">
            <h3 className="mb-3 text-sm font-medium text-foreground">近7天</h3>
            {recent7Stats && (
              <div className="space-y-2">
                {recent7Stats.days.map(day => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">
                      {dayjs(day.date).format('M/D')}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-emerald-500 transition-all"
                        style={{ width: `${maxBarMinutes > 0 ? (day.minutes / maxBarMinutes) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">
                      {formatTime(day.minutes)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 border-t border-border pt-2">
                  <span className="text-sm text-muted-foreground">
                    近7天平均:{' '}
                    <span className="font-medium text-foreground">{formatTime(recent7Stats.avg)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Backfill */}
          <div className="rounded-lg border border-border bg-card p-4 transition-colors">
            <h3 className="mb-3 text-sm font-medium text-foreground">补登学习时长</h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">日期</label>
                <DatePicker
                  value={backfillDate}
                  max={today}
                  onChange={setBackfillDate}
                  className="h-8 w-36 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">时长</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={backfillMinutes}
                    onChange={e => setBackfillMinutes(parseInt(e.target.value) || 30)}
                    className="h-8 w-20 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground">分钟</span>
                </div>
              </div>
              <Button size="sm" onClick={() => addBackfill(backfillDate, backfillMinutes)}>
                确认补登
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
