import { useState, useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import type { NavPage, ReviewStats } from '../../types'
import type { ThemeMode } from '../../hooks/useTheme'

const navItems: { key: NavPage; label: string; icon: string }[] = [
  { key: 'knowledge', label: '全部知识点', icon: '📚' },
  { key: 'today', label: '今日复习', icon: '📅' },
  { key: 'overdue', label: '逾期复习', icon: '⚠️' },
  { key: 'plans', label: '每日计划', icon: '📋' },
  { key: 'pomodoro', label: '番茄钟', icon: '🍅' },
  { key: 'study-stats', label: '学习统计', icon: '📈' },
  { key: 'import', label: '导入游戏', icon: '📥' },
  { key: 'stats', label: '统计数据', icon: '📊' }
]

const themeLabels: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统'
}

const themeIcons: Record<ThemeMode, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻'
}

const themeCycle: ThemeMode[] = ['light', 'dark', 'system']

interface SidebarProps {
  currentPage: NavPage
  onNavigate: (page: NavPage) => void
  stats: ReviewStats
  inDetail?: boolean
  onBack?: () => void
}

export default function Sidebar({ currentPage, onNavigate, stats, inDetail, onBack }: SidebarProps) {
  const { mode, setMode } = useTheme()
  const [autoStartEnabled, setAutoStartEnabled] = useState(false)
  const [dataMsg, setDataMsg] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI?.autoStart.isEnabled().then(setAutoStartEnabled).catch(() => {})
  }, [])

  const handleThemeToggle = () => {
    const idx = themeCycle.indexOf(mode)
    const next = themeCycle[(idx + 1) % themeCycle.length]
    setMode(next)
  }

  const handleAutoStartToggle = async () => {
    const next = !autoStartEnabled
    setAutoStartEnabled(next)
    try {
      await window.electronAPI?.autoStart.set(next)
    } catch {
      setAutoStartEnabled(!next)
    }
  }

  return (
    <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shrink-0 transition-colors">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">忆芽</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">SM-2 间隔重复算法</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {inDetail ? (
          <button
            onClick={onBack}
            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="text-base">←</span>
            <span>返回列表</span>
          </button>
        ) : (
          navItems.map(item => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                currentPage === item.key
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.key === 'today' && stats.todayPending > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {stats.todayPending}
                </span>
              )}
              {item.key === 'overdue' && stats.overdue > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {stats.overdue}
                </span>
              )}
            </button>
          ))
        )}
      </nav>

      {!inDetail && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
        <button
          onClick={handleThemeToggle}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={`当前: ${themeLabels[mode]}`}
        >
          <span>{themeIcons[mode]}</span>
          <span>{themeLabels[mode]}</span>
        </button>

        <button
          onClick={handleAutoStartToggle}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <span>开机自启</span>
          <span className={`w-8 h-4 rounded-full flex items-center transition-colors ${autoStartEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`w-3 h-3 bg-white rounded-full transform transition-transform ${autoStartEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </span>
        </button>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              const r = await window.electronAPI?.data.export()
              setDataMsg(r?.success ? '已导出' : null)
              setTimeout(() => setDataMsg(null), 2000)
            }}
            className="flex-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
            title="导出数据"
          >
            📤 导出
          </button>
          <button
            onClick={async () => {
              const r = await window.electronAPI?.data.import()
              setDataMsg(r?.success ? '已导入，请重启' : r?.error ? '导入失败' : null)
              setTimeout(() => setDataMsg(null), 3000)
            }}
            className="flex-1 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
            title="导入数据"
          >
            📥 导入
          </button>
        </div>

        {dataMsg && (
          <div className="text-xs text-center text-blue-600 dark:text-blue-400">{dataMsg}</div>
        )}

          <div className="text-xs text-gray-400 dark:text-gray-500">
            总知识点: {stats.total} | 已完成: {stats.completed}
          </div>
        </div>
      )}
    </aside>
  )
}
