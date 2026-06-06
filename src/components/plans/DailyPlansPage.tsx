import { useState, useEffect } from 'react'
import { useDailyPlans } from '../../hooks/useDailyPlans'
import PlanItem from './PlanItem'
import dayjs from 'dayjs'

type PlanType = 'one-time' | 'daily' | 'weekly' | 'interval'

import { DAY_LABELS_MONDAY_FIRST as DAY_LABELS, WEEKDAY_ORDER } from '../../constants'

export default function DailyPlansPage() {
  const { items, loading, error, fetchToday, add, toggle, remove } = useDailyPlans()
  const [content, setContent] = useState('')
  const [type, setType] = useState<PlanType>('one-time')
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [intervalDays, setIntervalDays] = useState(3)
  const [planDate, setPlanDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showNotDue, setShowNotDue] = useState(false)

  useEffect(() => { fetchToday() }, [])

  const handleAdd = async () => {
    const trimmed = content.trim()
    if (!trimmed || loading) return

    let config: Record<string, unknown> | undefined
    if (type === 'weekly') {
      if (weeklyDays.length === 0) return
      config = { daysOfWeek: weeklyDays }
    } else if (type === 'interval') {
      config = { intervalDays }
    }

    // Clear form immediately to prevent double-submission during async IPC
    setContent('')
    setWeeklyDays([])
    setIntervalDays(3)
    setType('one-time')
    setPlanDate(dayjs().format('YYYY-MM-DD'))

    await add(trimmed, type, config, planDate !== dayjs().format('YYYY-MM-DD') ? planDate : undefined)
  }

  const toggleWeekday = (day: number) => {
    setWeeklyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleAdd()
  }

  const types: { key: PlanType; label: string }[] = [
    { key: 'one-time', label: '一次性' },
    { key: 'daily', label: '每日' },
    { key: 'weekly', label: '每周' },
    { key: 'interval', label: '间隔' }
  ]

  const pendingItems = items.filter(i => !i.completed)
  const dueItems = pendingItems.filter(i => i.dueToday !== false)
  const notDueItems = pendingItems.filter(i => i.dueToday === false)
  const completedItems = items.filter(i => i.completed)
  const today = dayjs().format('YYYY-MM-DD')
  const hasNotDue = notDueItems.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <p className="text-sm text-gray-400 dark:text-gray-500">
        {dayjs(today).format('YYYY 年 M 月 D 日')}
      </p>

      {/* Input area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3 transition-colors">
        {/* Date picker */}
        <div>
          <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">计划日期</label>
          <input
            type="date"
            value={planDate}
            onChange={e => setPlanDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          />
        </div>

        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加新任务..."
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />

        {/* Type selector */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          {types.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                type === t.key
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Weekly day picker (Mon-Sun order) */}
        {type === 'weekly' && (
          <div className="flex gap-1">
            {WEEKDAY_ORDER.map((day, idx) => (
              <button
                key={day}
                onClick={() => toggleWeekday(day)}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors font-medium ${
                  weeklyDays.includes(day)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {DAY_LABELS[idx]}
              </button>
            ))}
          </div>
        )}

        {/* Interval input */}
        {type === 'interval' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400 text-xs">每隔</span>
            <input
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={e => setIntervalDays(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-center text-gray-800 dark:text-gray-100"
            />
            <span className="text-gray-500 dark:text-gray-400 text-xs">天</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!content.trim() || loading || (type === 'weekly' && weeklyDays.length === 0)}
            className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {/* Task list */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">加载中...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">暂无计划</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">添加今天的待办事项吧</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Today's pending items */}
          {dueItems.map(item => (
            <PlanItem key={item.id} item={item} onToggle={toggle} onDelete={remove} />
          ))}

          {/* Non-today collapsible section */}
          {hasNotDue && (
            <>
              <button
                onClick={() => setShowNotDue(!showNotDue)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
              >
                <span className="text-[10px]">{showNotDue ? '▾' : '▸'}</span>
                <span>非今日计划 ({notDueItems.length})</span>
              </button>
              {showNotDue && notDueItems.map(item => (
                <PlanItem key={item.id} item={item} onToggle={toggle} onDelete={remove} />
              ))}
            </>
          )}

          {/* Completed section */}
          {completedItems.length > 0 && (
            <>
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 pb-1">
                已完成 ({completedItems.length})
              </p>
              {completedItems.map(item => (
                <PlanItem key={item.id} item={item} onToggle={toggle} onDelete={remove} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
