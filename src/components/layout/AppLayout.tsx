import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '../../utils/cn'
import Sidebar from './Sidebar'
import AddForm from '../knowledge/AddForm'
import KnowledgeList from '../knowledge/KnowledgeList'
import DetailPanel from '../knowledge/DetailPanel'
import TodayPanel from '../review/TodayPanel'
import StatsPanel from '../review/StatsPanel'
import MistakesPage from '../mistakes/MistakesPage'
import MistakeTypesPage from '../mistakes/MistakeTypesPage'
import ScheduleManagePage from '../manage/ScheduleManagePage'
import DailyPlansPage from '../plans/DailyPlansPage'
import PomodoroPage from '../pomodoro/PomodoroPage'
import StudyStatsPage from '../stats/StudyStatsPage'
import GameImportPage from '../import/GameImportPage'
import SettingsPage from '../settings/SettingsPage'
import VerificationCard from '../review/VerificationCard'
import { useKnowledge } from '../../hooks/useKnowledge'
import { useReview } from '../../hooks/useReview'
import { useTheme } from '../../hooks/useTheme'
import { useUi } from '../../hooks/useUi'
import { pageVariants } from '../../lib/motion'
import { NAV_ORDER } from '../../lib/nav'
import type { NavPage } from '../../types'

const ASIDE_PAGES = ['knowledge', 'today', 'manage']

export default function AppLayout() {
  const [currentPage, setCurrentPage] = useState<NavPage>('today')
  const [direction, setDirection] = useState(1)
  const { add, update, fetchList, selectedId, reviewSource, deselect } = useKnowledge()
  const { stats, fetchAll, lastRated, rollback, clearLastRated } = useReview()
  const { init: initTheme } = useTheme()
  const pomodoroImmersive = useUi(s => s.pomodoroImmersive)

  useEffect(() => {
    initTheme()
    fetchAll()
    fetchList()
  }, [])

  // Entering a detail view always plays the "forward" transition,
  // regardless of which component triggered it
  const prevSelected = useRef<number | null>(null)
  useEffect(() => {
    const prev = prevSelected.current
    prevSelected.current = selectedId
    if (selectedId !== null && prev === null) setDirection(1)
  }, [selectedId])

  const handleNavigate = (page: NavPage) => {
    if (page === currentPage) return
    setDirection(Math.sign(NAV_ORDER.indexOf(page) - NAV_ORDER.indexOf(currentPage)) || 1)
    setCurrentPage(page)
    if (selectedId !== null) deselect()
  }

  const handleBack = () => {
    setDirection(-1)
    if (reviewSource) setCurrentPage(reviewSource)
    deselect()
  }

  // Immersive pomodoro hides all chrome (sidebar) on its own page
  const chromeHidden = pomodoroImmersive && currentPage === 'pomodoro' && selectedId === null

  const renderContent = () => {
    if (selectedId !== null) {
      return (
        <DetailPanel
          kpId={selectedId}
          onBack={handleBack}
          onUpdate={async (id, content, detail) => {
            await update(id, content, detail)
            fetchAll()
          }}
        />
      )
    }
    switch (currentPage) {
      case 'knowledge':
        return <KnowledgeList />
      case 'today':
        return <TodayPanel />
      case 'mistakes':
        return <MistakesPage />
      case 'mistake-types':
        return <MistakeTypesPage />
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

  const contentKey = selectedId !== null ? `detail-${selectedId}` : currentPage
  const showAside = selectedId === null && ASIDE_PAGES.includes(currentPage)
  // Virtualized pages own their internal scroll — main must not scroll them
  const pageScrollsInternally =
    selectedId === null && (currentPage === 'knowledge' || currentPage === 'manage')

  return (
    <div className="flex h-screen bg-background transition-colors">
      {/* Slide-away when entering immersive pomodoro */}
      <AnimatePresence initial={false}>
        {!chromeHidden && (
          <motion.div
            key="sidebar"
            initial={{ x: 0 }}
            exit={{ x: -224, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
            className="h-full shrink-0"
          >
            <Sidebar
              currentPage={selectedId !== null ? (reviewSource ?? currentPage) : currentPage}
              onNavigate={handleNavigate}
              onBack={handleBack}
              stats={stats}
              inDetail={selectedId !== null}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex flex-1 overflow-hidden">
          <main
            className={cn(
              'relative flex-1',
              selectedId !== null || pageScrollsInternally
                ? 'overflow-hidden'
                : chromeHidden
                  ? 'overflow-y-auto'
                  : 'overflow-y-auto p-6',
              pageScrollsInternally && 'p-6'
            )}
          >
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={contentKey}
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={selectedId !== null || pageScrollsInternally ? 'h-full' : undefined}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Add-knowledge aside — slides in on knowledge/today/manage pages */}
          <AnimatePresence initial={false}>
            {showAside && !chromeHidden && (
              <motion.aside
                key="aside"
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: 320,
                  opacity: 1,
                  transition: { width: { duration: 0.25 }, opacity: { duration: 0.2, delay: 0.08 } }
                }}
                exit={{ width: 0, opacity: 0, transition: { duration: 0.2 } }}
                className="hidden shrink-0 overflow-y-auto border-l border-border bg-card p-4 transition-colors lg:block"
              >
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
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Post-rating verification card — global fixed overlay so it survives
          page transitions and never shifts the review list */}
      <AnimatePresence>
        {lastRated && (
          <motion.div
            key={lastRated.reviewId}
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
            className="fixed bottom-4 right-2 z-40"
          >
            <VerificationCard
              content={lastRated.content}
              detail={lastRated.detail}
              onUndo={() => rollback(lastRated.reviewId)}
              onExpire={clearLastRated}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
