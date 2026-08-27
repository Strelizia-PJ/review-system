import { useState } from 'react'
import { X } from 'lucide-react'
import type { DailyPlan } from '../../types'
import { Checkbox } from '../ui/Checkbox'
import { Badge, type BadgeProps } from '../shared/Badge'
import ConfirmDialog from '../shared/ConfirmDialog'
import { cn } from '../../utils/cn'
import { DAY_LABELS_SUNDAY_FIRST, DAY_LABELS_MONDAY_FIRST, WEEKDAY_ORDER } from '../../constants'

// Map dayjs day values (0=Sun..6=Sat) to Mon-first display order for weekly labels
const DAYJS_TO_MONFIRST: Record<number, string> = {}
WEEKDAY_ORDER.forEach((dayjsVal, idx) => {
  DAYJS_TO_MONFIRST[dayjsVal] = DAY_LABELS_MONDAY_FIRST[idx]
})

function getTypeLabel(item: DailyPlan): string {
  switch (item.type) {
    case 'one-time':
      return '一次性'
    case 'daily':
      return '每日'
    case 'weekly': {
      const days = (item.config as any)?.daysOfWeek as number[] | undefined
      if (days && days.length > 0) {
        return '每' + days.map(d => DAYJS_TO_MONFIRST[d] || DAY_LABELS_SUNDAY_FIRST[d]).join('')
      }
      return '每周'
    }
    case 'interval': {
      const n = (item.config as any)?.intervalDays
      return n ? `每${n}天` : '间隔'
    }
    default:
      return item.type
  }
}

function getTypeVariant(item: DailyPlan): BadgeProps['variant'] {
  switch (item.type) {
    case 'one-time':
      return 'warning'
    case 'daily':
      return 'default'
    case 'weekly':
      return 'neutral'
    case 'interval':
      return 'success'
    default:
      return 'neutral'
  }
}

interface PlanItemProps {
  item: DailyPlan
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

export default function PlanItem({ item, onToggle, onDelete }: PlanItemProps) {
  const notDue = item.type === 'weekly' && item.dueToday === false
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        item.completed
          ? 'border-border bg-muted/50'
          : notDue
            ? 'border-border/50 bg-card/50'
            : 'border-border bg-card'
      )}
    >
      {/* Checkbox */}
      {notDue ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-input opacity-40" />
      ) : (
        <Checkbox
          checked={item.completed}
          onCheckedChange={() => onToggle(item.id)}
          className={cn(
            'shrink-0 rounded-full',
            item.completed &&
              'border-emerald-500 bg-emerald-500 text-white data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500'
          )}
          id={`plan-${item.id}`}
        />
      )}

      {/* Content */}
      <label
        htmlFor={`plan-${item.id}`}
        className={cn(
          'flex-1 cursor-pointer text-sm transition-colors',
          notDue
            ? 'text-muted-foreground/50'
            : item.completed
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
        )}
      >
        {item.content}
        {notDue && <span className="ml-2 align-middle text-[10px] text-muted-foreground">非今日</span>}
      </label>

      {/* Type badge */}
      <Badge variant={getTypeVariant(item)} className="shrink-0">
        {getTypeLabel(item)}
      </Badge>

      {/* Delete */}
      <button
        onClick={() => setDeleteConfirm(true)}
        className="shrink-0 rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="删除"
      >
        <X className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="确认删除"
        description={`确定删除计划「${item.content.length > 20 ? item.content.slice(0, 20) + '...' : item.content}」吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={() => {
          onDelete(item.id)
          setDeleteConfirm(false)
        }}
      />
    </div>
  )
}
