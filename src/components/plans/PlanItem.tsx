import type { DailyPlan } from '../../types'
import { DAY_LABELS_SUNDAY_FIRST, DAY_LABELS_MONDAY_FIRST, WEEKDAY_ORDER } from '../../constants'

// Map dayjs day values (0=Sun..6=Sat) to Mon-first display order for weekly labels
const DAYJS_TO_MONFIRST: Record<number, string> = {}
WEEKDAY_ORDER.forEach((dayjsVal, idx) => { DAYJS_TO_MONFIRST[dayjsVal] = DAY_LABELS_MONDAY_FIRST[idx] })

function getTypeLabel(item: DailyPlan): string {
  switch (item.type) {
    case 'one-time': return '一次性'
    case 'daily': return '每日'
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
    default: return item.type
  }
}

function getTypeColor(item: DailyPlan): string {
  switch (item.type) {
    case 'one-time': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    case 'daily': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    case 'weekly': return 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
    case 'interval': return 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
    default: return 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
  }
}

interface PlanItemProps {
  item: DailyPlan
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

export default function PlanItem({ item, onToggle, onDelete }: PlanItemProps) {
  const notDue = item.type === 'weekly' && item.dueToday === false

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      item.completed
        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
        : notDue
          ? 'bg-white/50 dark:bg-gray-800/50 border-gray-100/50 dark:border-gray-700/50'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        disabled={notDue}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          notDue
            ? 'border-gray-200 dark:border-gray-600 cursor-not-allowed opacity-40'
            : item.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-500 hover:border-green-400'
        }`}
      >
        {item.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <span className={`flex-1 text-sm transition-colors ${
        notDue
          ? 'text-gray-300 dark:text-gray-600'
          : item.completed
            ? 'text-gray-400 dark:text-gray-500 line-through'
            : 'text-gray-800 dark:text-gray-100'
      }`}>
        {item.content}
        {notDue && <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500 align-middle">非今日</span>}
      </span>

      {/* Type badge */}
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getTypeColor(item)}`}>
        {getTypeLabel(item)}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
        title="删除"
      >
        ×
      </button>
    </div>
  )
}
