import { useEffect } from 'react'
import { motion } from 'motion/react'
import { BookOpen, CalendarCheck, AlarmClock, CheckCircle2, Flame } from 'lucide-react'
import { useReview } from '../../hooks/useReview'
import { useStreak } from '../../hooks/useStreak'
import CountUp from '../shared/CountUp'
import { ErrorBar } from '../shared/Bars'
import { cn } from '../../utils/cn'

/* Fixed tile heights so the loading skeleton occupies exactly the same
   space as the loaded content — swapping between them never shifts layout */
const TILE_H = 'h-[92px]'
const BANNER_H = 'h-[76px]'

function FsrsCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
      <h3 className="mb-3 text-sm font-medium text-foreground">FSRS 算法说明</h3>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p>基于 ts-fsrs (Free Spaced Repetition Scheduler) 动态安排复习间隔:</p>
        <ul className="ml-1 mt-1 list-inside list-disc space-y-0.5">
          <li>通过 Stability(稳定性) 和 Difficulty(难度) 两个参数建模记忆状态</li>
          <li>每次复习后,根据评分自动更新稳定性与难度,计算下一次复习时机</li>
          <li>间隔由算法动态确定,非固定天数,适应个人记忆曲线</li>
        </ul>
        <div className="mt-2 space-y-0.5">
          <p className="font-medium text-foreground">评分含义 (四档):</p>
          <p>
            4 = 易 — 完美回忆 <span className="mx-1">|</span> 3 = 过 — 基本正确
          </p>
          <p>
            2 = 难 — 勉强想起 <span className="mx-1">|</span> 1 = 忘 — 完全忘记
          </p>
        </div>
      </div>
    </div>
  )
}

function StreakBanner() {
  const streak = useStreak()
  return (
    <motion.div
      className={cn(
        'col-span-2 flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover',
        BANNER_H
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          streak.activeToday && !streak.loading
            ? 'bg-gradient-primary text-white'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Flame className="h-5 w-5" />
      </span>
      <div className="flex flex-1 items-center gap-6">
        <div>
          <p className="text-2xl font-bold leading-none text-foreground">
            {streak.loading ? '—' : <CountUp value={streak.current} />}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">当前连续学习（天）</p>
        </div>
        <div className="h-9 w-px bg-border" />
        <div>
          <p className="text-2xl font-bold leading-none text-foreground">
            {streak.loading ? '—' : <CountUp value={streak.longest} />}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">最长连续（天）</p>
        </div>
        <span
          className={cn(
            'ml-auto hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block',
            streak.activeToday
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {streak.loading ? '' : streak.activeToday ? '今日已打卡 ✓' : '今日待打卡'}
        </span>
      </div>
    </motion.div>
  )
}

export default function StatsPanel() {
  const { stats, statsLoading, error, fetchStats } = useReview()

  useEffect(() => {
    fetchStats()
  }, [])

  const cards: {
    key: string
    icon: typeof BookOpen
    label: string
    value: number
    tone: string
    cardClass: string
    hero?: boolean
  }[] = [
    {
      key: 'total',
      icon: BookOpen,
      label: '总知识点',
      value: stats.total,
      hero: true,
      tone: 'bg-white/20 text-white',
      cardClass: 'bg-gradient-primary text-primary-foreground shadow-card'
    },
    {
      key: 'pending',
      icon: CalendarCheck,
      label: '今日待复习',
      value: stats.todayPending,
      tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/15',
      cardClass: 'border border-border bg-card shadow-card hover:shadow-card-hover'
    },
    {
      key: 'overdue',
      icon: AlarmClock,
      label: '已逾期',
      value: stats.overdue,
      tone: 'text-destructive bg-destructive/10',
      cardClass: 'border border-border bg-card shadow-card hover:shadow-card-hover'
    },
    {
      key: 'completed',
      icon: CheckCircle2,
      label: '已完成复习',
      value: stats.completed,
      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15',
      cardClass: 'border border-border bg-card shadow-card hover:shadow-card-hover'
    }
  ]

  return (
    <div className="space-y-4">
      {error && <ErrorBar>{error}</ErrorBar>}
      {statsLoading ? (
        /* Skeleton mirrors the loaded layout 1:1 — no jump when data arrives */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={cn('skeleton motion-safe:animate-shimmer rounded-lg opacity-70', TILE_H)}
              />
            ))}
            <div
              className={cn(
                'skeleton motion-safe:animate-shimmer col-span-2 rounded-lg opacity-70',
                BANNER_H
              )}
            />
          </div>
          <FsrsCard />
        </div>
      ) : (
        <>
          {/* Single quiet fade-in for the whole block — no per-card movement */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25 } }}
            className="grid grid-cols-2 gap-3"
          >
            {cards.map(card => (
              <div
                key={card.key}
                className={cn('rounded-lg p-4 transition-all duration-200', TILE_H, card.cardClass)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold leading-none">
                    <CountUp value={card.value} />
                  </p>
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', card.tone)}>
                    <card.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className={cn('mt-2 text-xs', card.hero ? 'opacity-85' : 'text-muted-foreground')}>
                  {card.label}
                </p>
              </div>
            ))}
            <StreakBanner />
          </motion.div>
          <FsrsCard />
        </>
      )}
    </div>
  )
}
