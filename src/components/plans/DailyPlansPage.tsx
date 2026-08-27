import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useDailyPlans } from '../../hooks/useDailyPlans'
import PlanItem from './PlanItem'
import dayjs from 'dayjs'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'
import { cn } from '../../utils/cn'
import { DAY_LABELS_MONDAY_FIRST as DAY_LABELS, WEEKDAY_ORDER } from '../../constants'
import { listItemVariants } from '../../lib/motion'
import { celebrate } from '../../lib/celebrate'

type PlanType = 'one-time' | 'daily' | 'weekly' | 'interval'

export default function DailyPlansPage() {
  const { items, loading, error, fetchToday, add, toggle, remove } = useDailyPlans()
  const [content, setContent] = useState('')
  const [type, setType] = useState<PlanType>('one-time')
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [intervalDays, setIntervalDays] = useState(3)
  const [planDate, setPlanDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showNotDue, setShowNotDue] = useState(false)

  useEffect(() => {
    fetchToday()
  }, [])

  const handleAdd = async () => {
    const trimmed = content.trim()
    if (!trimmed || loading) return

    let config: Record<string, unknown> | undefined
    if (type === 'weekly') {
      if (weeklyDays.length === 0) return
      config = { daysOfWeek: weeklyDays }
    } else if (type === 'interval') {
      config = { intervalDays }
    }

    // Clear form immediately to prevent double-submission during async IPC
    setContent('')
    setWeeklyDays([])
    setIntervalDays(3)
    setType('one-time')
    setPlanDate(dayjs().format('YYYY-MM-DD'))

    await add(trimmed, type, config, planDate !== dayjs().format('YYYY-MM-DD') ? planDate : undefined)
  }

  const toggleWeekday = (day: number) => {
    setWeeklyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleAdd()
  }

  const types: { key: PlanType; label: string }[] = [
    { key: 'one-time', label: '一次性' },
    { key: 'daily', label: '每日' },
    { key: 'weekly', label: '每周' },
    { key: 'interval', label: '间隔' }
  ]

  const pendingItems = items.filter(i => !i.completed)
  const dueItems = pendingItems.filter(i => i.dueToday !== false)
  const notDueItems = pendingItems.filter(i => i.dueToday === false)
  const completedItems = items.filter(i => i.completed)
  const today = dayjs().format('YYYY-MM-DD')
  const hasNotDue = notDueItems.length > 0

  // Celebrate when the last due plan of the day is checked off
  // (skips the initial load / genuinely empty lists)
  const prevDueCount = useRef<number | null>(null)
  useEffect(() => {
    if (loading) return
    const prev = prevDueCount.current
    prevDueCount.current = dueItems.length
    if (prev !== null && prev > 0 && dueItems.length === 0 && items.length > 0 && completedItems.length > 0) {
      celebrate()
    }
  }, [loading, dueItems.length, items.length, completedItems.length])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">{dayjs(today).format('YYYY 年 M 月 D 日')}</p>

      {/* Input area */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
        {/* Date picker */}
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">计划日期</label>
          <DatePicker value={planDate} max={today} onChange={setPlanDate} className="h-8 w-44 text-sm" />
        </div>

        <Input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加新任务..."
        />

        {/* Type selector */}
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {types.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={cn(
                'flex-1 rounded-md px-2 py-1 text-xs transition-colors',
                type === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Weekly day picker (Mon-Sun order) */}
        {type === 'weekly' && (
          <div className="flex gap-1">
            {WEEKDAY_ORDER.map((day, idx) => (
              <button
                key={day}
                onClick={() => toggleWeekday(day)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  weeklyDays.includes(day)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
              >
                {DAY_LABELS[idx]}
              </button>
            ))}
          </div>
        )}

        {/* Interval input */}
        {type === 'interval' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">每隔</span>
            <Input
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={e => setIntervalDays(parseInt(e.target.value) || 1)}
              className="h-8 w-16 text-center text-sm"
            />
            <span className="text-xs text-muted-foreground">天</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!content.trim() || loading || (type === 'weekly' && weeklyDays.length === 0)}
          >
            添加
          </Button>
        </div>
      </div>

      {/* Task list */}
      {error && <ErrorBar>{error}</ErrorBar>}
      {loading ? (
        <div className="space-y-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton motion-safe:animate-shimmer h-[54px] rounded-lg opacity-70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="📋" title="暂无计划" description="添加今天的待办事项吧" />
      ) : (
        <div className="space-y-1.5">
          {/* Flattened keyed children so AnimatePresence tracks every row */}
          <AnimatePresence mode="popLayout" initial={false}>
            {[
              ...dueItems.map((item, i) => (
                <motion.div
                  key={`due-${item.id}`}
                  layout
                  variants={listItemVariants}
                  custom={i}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <PlanItem item={item} onToggle={toggle} onDelete={remove} />
                </motion.div>
              )),
              hasNotDue ? (
                <button
                  key="not-due-toggle"
                  onClick={() => setShowNotDue(!showNotDue)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                >
                  {showNotDue ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <span>非今日计划 ({notDueItems.length})</span>
                </button>
              ) : null,
              ...(showNotDue
                ? notDueItems.map((item, i) => (
                    <motion.div
                      key={`nd-${item.id}`}
                      layout
                      variants={listItemVariants}
                      custom={i}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <PlanItem item={item} onToggle={toggle} onDelete={remove} />
                    </motion.div>
                  ))
                : []),
              completedItems.length > 0 ? (
                <p key="completed-label" className="pb-1 pt-2 text-xs text-muted-foreground">
                  已完成 ({completedItems.length})
                </p>
              ) : null,
              ...completedItems.map((item, i) => (
                <motion.div
                  key={`done-${item.id}`}
                  layout
                  variants={listItemVariants}
                  custom={Math.min(i, 8)}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <PlanItem item={item} onToggle={toggle} onDelete={remove} />
                </motion.div>
              ))
            ]}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
