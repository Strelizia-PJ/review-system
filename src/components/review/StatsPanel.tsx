import { useEffect } from 'react'
import { useReview } from '../../hooks/useReview'
import { ErrorBar } from '../shared/Bars'

export default function StatsPanel() {
  const { stats, statsLoading, error, fetchStats } = useReview()

  useEffect(() => {
    fetchStats()
  }, [])

  if (statsLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
  }

  const cards = [
    { label: '总知识点', value: stats.total, color: 'bg-primary/10 text-primary' },
    { label: '今日待复习', value: stats.todayPending, color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    { label: '已逾期', value: stats.overdue, color: 'bg-destructive/10 text-destructive' },
    { label: '已完成复习', value: stats.completed, color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' }
  ]

  return (
    <div className="space-y-4">
      {error && <ErrorBar>{error}</ErrorBar>}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <div key={card.label} className={`${card.color} rounded-lg p-4 text-center transition-colors`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs opacity-75">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 transition-colors">
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
            <p>4 = 易 — 完美回忆 <span className="mx-1">|</span> 3 = 过 — 基本正确</p>
            <p>2 = 难 — 勉强想起 <span className="mx-1">|</span> 1 = 忘 — 完全忘记</p>
          </div>
        </div>
      </div>
    </div>
  )
}
