import { useEffect } from 'react'
import { useReview } from '../../hooks/useReview'
import ReviewItem from './ReviewItem'

export default function TodayPanel() {
  const { todayItems, loading, error, fetchToday, rate } = useReview()

  useEffect(() => {
    fetchToday()
  }, [])

  const pendingItems = todayItems.filter(i => i.schedule_date === new Date().toISOString().slice(0, 10))
  const allPending = todayItems

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 mb-3">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">加载中...</p>
      ) : allPending.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">今日没有需要复习的知识点</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">去添加新知识吧</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {allPending.length} 条待复习
            {pendingItems.length !== allPending.length && (
              <span className="text-red-400 dark:text-red-400 ml-2">
                (含 {allPending.length - pendingItems.length} 条逾期)
              </span>
            )}
          </p>
          {allPending.map(item => (
            <ReviewItem
              key={item.id}
              item={item}
              overdue={item.schedule_date < new Date().toISOString().slice(0, 10)}
              onRate={rate}
              source="today"
            />
          ))}
        </>
      )}
    </div>
  )
}
