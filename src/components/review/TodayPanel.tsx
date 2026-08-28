import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ListTodo, Flame, CheckCircle2 } from 'lucide-react'
import { useReview } from '../../hooks/useReview'
import { useStreak } from '../../hooks/useStreak'
import ReviewItem from './ReviewItem'
import CountUp from '../shared/CountUp'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'
import { listItemVariants } from '../../lib/motion'
import { celebrate } from '../../lib/celebrate'
import { cn } from '../../utils/cn'

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
  pulse = false,
  title,
  suffix
}: {
  icon: typeof ListTodo
  label: string
  value: number | string
  tone: 'primary' | 'danger' | 'amber' | 'emerald' | 'muted'
  pulse?: boolean
  title?: string
  /** Small inline annotation after the number, e.g. "(2)" overdue count */
  suffix?: ReactNode
}) {
  const tones: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    danger: 'text-destructive bg-destructive/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/15',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15',
    muted: 'text-muted-foreground bg-muted'
  }
  return (
    <div
      title={title}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-all duration-200 hover:shadow-card-hover',
        pulse && 'border-amber-500/40'
      )}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className={cn('h-4 w-4', pulse && 'motion-safe:animate-pulse')} />
      </span>
      <div className="min-w-0">
        {typeof value === 'number' ? (
          <p className="text-xl font-bold leading-none text-foreground">
            <CountUp value={value} />
            {suffix}
          </p>
        ) : (
          <p className="truncate text-sm font-medium leading-none text-foreground">{value}</p>
        )}
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function TodayPanel() {
  const { todayItems, loading, error, fetchToday, rate } = useReview()
  const streak = useStreak()

  useEffect(() => {
    fetchToday()
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const pendingItems = todayItems.filter(i => i.schedule_date === today)
  const allPending = todayItems
  const overdueCount = todayItems.length - pendingItems.length

  // Fire confetti the moment the queue drains to zero through user actions
  // (skips the initial empty load)
  const prevLen = useRef<number | null>(null)
  useEffect(() => {
    if (loading) return
    const prev = prevLen.current
    prevLen.current = todayItems.length
    if (prev !== null && prev > 0 && todayItems.length === 0) celebrate()
  }, [loading, todayItems.length])

  const streakLabel = streak.activeToday ? '今日已打卡' : '今日待打卡'

  return (
    <div className="space-y-3">
      {error && <ErrorBar className="mb-0">{error}</ErrorBar>}
      {loading ? (
        /* Skeleton placeholders while fetching */
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton motion-safe:animate-shimmer h-[104px] rounded-lg opacity-70" />
          ))}
        </div>
      ) : (
        <>
          <StatChipsRow
            total={allPending.length}
            overdue={overdueCount}
            streakCurrent={streak.current}
            streakLabel={streakLabel}
            streakActive={streak.activeToday}
          />

          {/* AnimatePresence must stay mounted even when the list drains to
              zero — unmounting it with the branch would kill the last card's
              exit animation and its success ripple mid-play */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {allPending.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  variants={listItemVariants}
                  custom={i}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.45, ease: 'easeIn' } }}
                >
                  <ReviewItem item={item} overdue={item.schedule_date < today} onRate={rate} source="today" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {allPending.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.4, duration: 0.3 } }}
            >
              <EmptyState icon="🎉" title="太棒了，今日复习已全部完成！" description="去添加新知识吧" />
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

function StatChipsRow({
  total,
  overdue,
  streakCurrent,
  streakLabel,
  streakActive
}: {
  total: number
  overdue: number
  streakCurrent: number
  streakLabel: string
  streakActive: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatChip
        icon={ListTodo}
        label="条待复习"
        value={total}
        tone="primary"
        title={overdue > 0 ? `含 ${overdue} 条已逾期` : undefined}
        suffix={
          overdue > 0 ? (
            <span className="ml-1 text-sm font-semibold text-destructive">({overdue})</span>
          ) : undefined
        }
      />
      <StatChip
        icon={Flame}
        label="连击天数"
        value={streakCurrent}
        tone={streakActive ? 'amber' : 'muted'}
        pulse={streakActive}
        title={`当天完成任意学习（复习评分 / 番茄钟 / 补登记录）即计入连续天数 · ${streakLabel}`}
      />
      <StatChip
        icon={CheckCircle2}
        label="今日状态"
        value={streakActive ? '已完成' : '进行中'}
        tone={streakActive ? 'emerald' : 'muted'}
      />
    </div>
  )
}
