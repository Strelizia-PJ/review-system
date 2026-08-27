import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import AddForm from '../knowledge/AddForm'
import KnowledgeList from '../knowledge/KnowledgeList'
import DetailPanel from '../knowledge/DetailPanel'
import TodayPanel from '../review/TodayPanel'
import StatsPanel from '../review/StatsPanel'
import MistakesPage from '../mistakes/MistakesPage'
import ScheduleManagePage from '../manage/ScheduleManagePage'
import DailyPlansPage from '../plans/DailyPlansPage'
import PomodoroPage from '../pomodoro/PomodoroPage'
import StudyStatsPage from '../stats/StudyStatsPage'
import GameImportPage from '../import/GameImportPage'
import SettingsPage from '../settings/SettingsPage'
import { useKnowledge } from '../../hooks/useKnowledge'
import { useReview } from '../../hooks/useReview'
import { useTheme } from '../../hooks/useTheme'
import type { NavPage } from '../../types'

export default function AppLayout() {
  const [currentPage, setCurrentPage] = useState<NavPage>('today')
  const { add, update, fetchList, selectedId, reviewSource, deselect } = useKnowledge()
  const { stats, fetchAll } = useReview()
  const { init: initTheme } = useTheme()

  useEffect(() => {
    initTheme()
    fetchAll()
    fetchList()
  }, [])

  // When detail is selected, show DetailPanel
  if (selectedId !== null) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Sidebar
          currentPage={currentPage}
          onNavigate={page => {
            setCurrentPage(page)
            deselect()
          }}
          onBack={() => {
            if (reviewSource) setCurrentPage(reviewSource)
            deselect()
          }}
          stats={stats}
          inDetail={true}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <DetailPanel
            kpId={selectedId}
            onBack={() => {
              if (reviewSource) setCurrentPage(reviewSource)
              deselect()
            }}
            onUpdate={async (id, content, detail) => {
              await update(id, content, detail)
              fetchAll()
            }}
          />
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'knowledge':
        return <KnowledgeList />
      case 'today':
        return <TodayPanel />
      case 'mistakes':
        return <MistakesPage />
      case 'manage':
        return <ScheduleManagePage />
      case 'stats':
        return <StatsPanel />
      case 'plans':
        return <DailyPlansPage />
      case 'pomodoro':
        return <PomodoroPage />
      case 'study-stats':
        return <StudyStatsPage />
      case 'import':
        return <GameImportPage />
      case 'settings':
        return <SettingsPage />
    }
  }

  const pageTitles: Record<NavPage, string> = {
    knowledge: '全部知识点',
    today: '今日复习',
    mistakes: '易错点',
    manage: '调度管理',
    stats: '统计数据',
    plans: '每日计划',
    pomodoro: '番茄钟',
    'study-stats': '学习统计',
    import: '导入游戏',
    settings: '设置'
  }

  return (
    <div className="flex h-screen bg-background transition-colors">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} stats={stats} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 border-b border-border bg-card px-6 py-4 transition-colors">
          <h2 className="text-lg font-semibold text-foreground">{pageTitles[currentPage]}</h2>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">{renderContent()}</main>

          {/* Add-knowledge aside — only on review/knowledge related pages */}
          {['knowledge', 'today', 'manage'].includes(currentPage) && (
            <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-4 transition-colors lg:block">
              <h3 className="mb-3 text-sm font-medium text-foreground">添加知识点</h3>
              <AddForm
                onAdd={async (content, learnDate) => {
                  await add(content, learnDate)
                  fetchAll()
                }}
              />
              <div className="mt-4 rounded-lg bg-primary/10 p-3 text-xs leading-relaxed text-primary transition-colors">
                提示：添加知识点后，系统使用 FSRS
                算法动态安排复习。每次复习时根据回忆质量(1-4)自动调整下一次复习间隔，科学提升记忆效率。
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
