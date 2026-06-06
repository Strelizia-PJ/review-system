import type { ReviewRecord, NavPage } from '../../types'
import { QUALITY_LABELS, QUALITY_COLORS, previewInterval } from '../../constants'
import { useKnowledge } from '../../hooks/useKnowledge'

interface ReviewItemProps {
  item: ReviewRecord
  overdue: boolean
  onRate: (reviewId: number, quality: number) => Promise<void>
  source: NavPage
}

export default function ReviewItem({ item, overdue, onRate, source }: ReviewItemProps) {
  const select = useKnowledge(state => state.select)
  const ef = item.ef ?? 2.5
  const rc = item.review_count ?? 0
  const li = item.last_interval ?? 1

  return (
    <div className={`border rounded-lg p-4 hover:shadow-sm transition-colors ${
      overdue
        ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20'
        : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-gray-800 dark:text-gray-100 break-words cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={() => select(item.knowledge_point_id, source)}
          title="点击查看详情"
        >{item.content}</p>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={overdue ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}>
            计划复习: {item.schedule_date}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-gray-400 dark:text-gray-500">
            第{item.stage}次复习
          </span>
          {overdue && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-red-500 font-medium">已逾期</span>
            </>
          )}
        </div>
      </div>

      {/* SM-2 quality rating buttons */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">评价回忆质量:</p>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(q => (
            <button
              key={q}
              onClick={() => onRate(item.id, q)}
              className={`flex-1 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${QUALITY_COLORS[q]}`}
              title={`${q} — ${QUALITY_LABELS[q]} · ${previewInterval(ef, rc, li, q)}天后`}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2, 3, 4, 5].map(q => (
            <span key={q} className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
              {QUALITY_LABELS[q].charAt(0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
