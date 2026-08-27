import { useEffect } from 'react'
import { useReview } from '../../hooks/useReview'
import ReviewItem from './ReviewItem'
import VerificationCard from './VerificationCard'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'

export default function TodayPanel() {
  const { todayItems, loading, error, fetchToday, rate, lastRated, rollback, clearLastRated } = useReview()

  useEffect(() => {
    fetchToday()
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const pendingItems = todayItems.filter(i => i.schedule_date === today)
  const allPending = todayItems

  return (
    <div className="space-y-3">
      {/* Post-rating verification card — lifetime handled inside (5s / pause on hover) */}
      {lastRated && (
        <VerificationCard
          key={lastRated.reviewId}
          content={lastRated.content}
          detail={lastRated.detail}
          onUndo={() => rollback(lastRated.reviewId)}
          onExpire={clearLastRated}
        />
      )}
      {error && <ErrorBar className="mb-0">{error}</ErrorBar>}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : allPending.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="今日没有需要复习的知识点"
          description="去添加新知识吧"
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            共 {allPending.length} 条待复习
            {pendingItems.length !== allPending.length && (
              <span className="ml-2 text-destructive">
                (含 {allPending.length - pendingItems.length} 条逾期)
              </span>
            )}
          </p>
          {allPending.map(item => (
            <ReviewItem
              key={item.id}
              item={item}
              overdue={item.schedule_date < today}
              onRate={rate}
              source="today"
            />
          ))}
        </>
      )}
    </div>
  )
}
