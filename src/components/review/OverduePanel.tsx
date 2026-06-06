import { useEffect } from 'react'
import { useReview } from '../../hooks/useReview'
import ReviewItem from './ReviewItem'

export default function OverduePanel() {
  const { overdueItems, loading, error, fetchOverdue, rate } = useReview()

  useEffect(() => {
    fetchOverdue()
  }, [])

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 mb-3">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">加载中...</p>
      ) : overdueItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">没有逾期的复习</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">继续保持</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-red-500 font-medium">
            ⚠️ {overdueItems.length} 条复习已逾期，请尽快复习
          </p>
          {overdueItems.map(item => (
            <ReviewItem
              key={item.id}
              item={item}
              overdue={true}
              onRate={rate}
              source="overdue"
            />
          ))}
        </>
      )}
    </div>
  )
}
