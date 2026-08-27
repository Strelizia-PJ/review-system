import { useState } from 'react'
import dayjs from 'dayjs'
import { CalendarClock } from 'lucide-react'
import type { ReviewRecord, NavPage } from '../../types'
import {
  QUALITY_LABELS,
  QUALITY_COLORS,
  previewInterval,
  getRetrievability,
  DEFAULT_MAX_REVIEW_INTERVAL_DAYS
} from '../../constants'
import { useKnowledge } from '../../hooks/useKnowledge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/Dialog'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { cn } from '../../utils/cn'

interface ReviewItemProps {
  item: ReviewRecord
  overdue: boolean
  onRate: (reviewId: number, quality: number, customDays?: number) => Promise<void>
  source: NavPage
}

const QUICK_CUSTOM_DAYS = [1, 3, 7, 14]

export default function ReviewItem({ item, overdue, onRate, source }: ReviewItemProps) {
  const select = useKnowledge(state => state.select)
  const r = getRetrievability(item.card_state)
  const rColor =
    r !== null
      ? r > 0.9
        ? 'text-emerald-600 dark:text-emerald-400'
        : r > 0.7
          ? 'text-amber-600 dark:text-amber-400'
          : r > 0.5
            ? 'text-orange-600 dark:text-orange-400'
            : 'text-red-600 dark:text-red-400'
      : ''
  const effectiveCap = item.effective_max_interval_days ?? DEFAULT_MAX_REVIEW_INTERVAL_DAYS

  // Custom-interval dialog state
  const [customOpen, setCustomOpen] = useState(false)
  const [customQuality, setCustomQuality] = useState(3)
  const [customDays, setCustomDays] = useState<number | null>(3)
  const [customDate, setCustomDate] = useState('')
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

  const customDateDays = customDate
    ? dayjs(customDate).startOf('day').diff(dayjs().startOf('day'), 'day')
    : null
  // Manual date wins over quick chips; must be at least tomorrow
  const effectiveCustomDays = customDateDays !== null ? customDateDays : customDays
  const customValid = effectiveCustomDays !== null && effectiveCustomDays >= 1

  const openCustom = () => {
    setCustomQuality(3)
    setCustomDays(3)
    setCustomDate('')
    setCustomOpen(true)
  }

  const confirmCustom = () => {
    if (!customValid) return
    setCustomOpen(false)
    onRate(item.id, customQuality, effectiveCustomDays!)
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors hover:shadow-sm',
        overdue ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className="cursor-pointer break-words text-sm text-foreground transition-colors hover:text-primary"
          onClick={() => select(item.knowledge_point_id, source)}
          title="点击查看详情"
        >
          {item.content}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
            计划复习: {item.schedule_date}
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">第{item.stage}次复习</span>
          {r !== null && (
            <>
              <span className="text-border">|</span>
              <span className={cn('font-medium', rColor)}>记忆 {Math.round(r * 100)}%</span>
            </>
          )}
          {overdue && (
            <>
              <span className="text-border">|</span>
              <span className="font-medium text-destructive">已逾期</span>
            </>
          )}
        </div>
      </div>

      {/* FSRS quality rating buttons */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-xs text-muted-foreground">评价:</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              onClick={() => onRate(item.id, q)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-85',
                QUALITY_COLORS[q]
              )}
              title={`${QUALITY_LABELS[q]} · ${previewInterval(item.card_state, q, effectiveCap)}天后`}
            >
              {QUALITY_LABELS[q]}
            </button>
          ))}
          <button
            onClick={openCustom}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-input py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="自定义下次复习时间（评分照常更新记忆状态，仅覆盖间隔）"
          >
            <CalendarClock className="h-4 w-4" />
            自定
          </button>
        </div>
      </div>

      {/* Custom next-review-time dialog — mounted only while open */}
      {customOpen && (
        <Dialog open onOpenChange={setCustomOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>自定义下次复习</DialogTitle>
              <DialogDescription>记忆状态仍按所选评分更新，仅本次复习时间用你指定的值。</DialogDescription>
            </DialogHeader>

            <p className="mb-1.5 text-xs font-medium text-foreground">评分</p>
            <div className="mb-3 flex gap-1.5">
              {[1, 2, 3, 4].map(q => (
                <button
                  key={q}
                  onClick={() => setCustomQuality(q)}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors',
                    customQuality === q
                      ? cn(QUALITY_COLORS[q], 'text-white')
                      : 'border border-input text-muted-foreground hover:bg-accent'
                  )}
                >
                  {QUALITY_LABELS[q]}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-medium text-foreground">下次复习时间</p>
            <div className="mb-2 flex gap-1.5">
              {QUICK_CUSTOM_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setCustomDays(d)
                    setCustomDate('')
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors',
                    !customDate && customDays === d
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-input text-muted-foreground hover:bg-accent'
                  )}
                >
                  {d === 1 ? '明天' : `${d}天后`}
                </button>
              ))}
            </div>
            <DatePicker value={customDate} min={tomorrow} onChange={setCustomDate} placeholder="或选择日期" />

            {customDateDays !== null && customDateDays < 1 && (
              <p className="mt-1.5 text-xs text-destructive">下次复习时间至少是明天</p>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCustomOpen(false)}>
                取消
              </Button>
              <Button size="sm" disabled={!customValid} onClick={confirmCustom}>
                确认
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
