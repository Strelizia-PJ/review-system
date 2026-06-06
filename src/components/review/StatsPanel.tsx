import { useEffect } from 'react'
import { useReview } from '../../hooks/useReview'

export default function StatsPanel() {
  const { stats, statsLoading, error, fetchStats } = useReview()

  useEffect(() => {
    fetchStats()
  }, [])

  if (statsLoading) {
    return <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">加载中...</p>
  }

  const cards = [
    { label: '总知识点', value: stats.total, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { label: '今日待复习', value: stats.todayPending, color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    { label: '已逾期', value: stats.overdue, color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    { label: '已完成复习', value: stats.completed, color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    { label: '已掌握', value: stats.mastered, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' }
  ]

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <div key={card.label} className={`${card.color} rounded-lg p-4 text-center transition-colors`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs mt-1 opacity-75">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 transition-colors">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">SM-2 算法说明</h3>
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <p>每次复习后根据回忆质量(0-5)动态调整间隔:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1 mt-1">
            <li>评分 ≥ 3：间隔逐次增大，EF 因子微调</li>
            <li>评分 &lt; 3：重置为 1 天间隔</li>
            <li>首次复习：1 天后</li>
            <li>二次复习：6 天后</li>
            <li>之后：上次间隔 × EF</li>
          </ul>
          <p className="mt-2">EF 初始值 2.5，最低 1.3</p>
          <div className="mt-2 space-y-0.5">
            <p className="font-medium text-gray-600 dark:text-gray-300">评分含义:</p>
            <p>5 = 完美回忆 <span className="mx-1">|</span> 4 = 基本正确</p>
            <p>3 = 困难回忆 <span className="mx-1">|</span> 2 = 勉强</p>
            <p>1 = 错误回忆 <span className="mx-1">|</span> 0 = 完全忘记</p>
          </div>
        </div>
      </div>
    </div>
  )
}
