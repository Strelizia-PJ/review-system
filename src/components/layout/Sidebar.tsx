import { motion } from 'motion/react'
import {
  BookOpen,
  CalendarCheck,
  AlertCircle,
  Timer,
  ClipboardList,
  Citrus,
  BarChart3,
  Download,
  Sparkles,
  Settings,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { Badge } from '../shared/Badge'
import { SPRING_BOUNCY } from '../../lib/motion'
import { NAV_ORDER } from '../../lib/nav'
import { useUi } from '../../hooks/useUi'
import type { NavPage, ReviewStats } from '../../types'

const ICONS: Record<NavPage, typeof BookOpen> = {
  knowledge: BookOpen,
  today: CalendarCheck,
  mistakes: AlertCircle,
  manage: Timer,
  plans: ClipboardList,
  pomodoro: Citrus,
  'study-stats': BarChart3,
  import: Download,
  stats: Sparkles,
  settings: Settings
}

const LABELS: Record<NavPage, string> = {
  knowledge: '全部知识点',
  today: '今日复习',
  mistakes: '易错点',
  manage: '调度管理',
  plans: '每日计划',
  pomodoro: '番茄钟',
  'study-stats': '学习统计',
  import: '导入游戏',
  stats: '统计数据',
  settings: '设置'
}

interface SidebarProps {
  currentPage: NavPage
  onNavigate: (page: NavPage) => void
  stats: ReviewStats
  inDetail?: boolean
  onBack?: () => void
}

export default function Sidebar({ currentPage, onNavigate, stats, inDetail, onBack }: SidebarProps) {
  const collapsed = useUi(s => s.sidebarCollapsed)
  const toggleSidebar = useUi(s => s.toggleSidebar)

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-card transition-colors',
        // Animated width swap between full rail and icon-only mode
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Brand block */}
      <div className={cn('relative border-b border-border', collapsed ? 'p-2 pb-1' : 'p-4')}>
        {collapsed ? (
          <>
            <div className="flex h-10 items-center justify-center">
              <span className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 p-1.5 text-white shadow-card">
                <Citrus className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-1 flex justify-center">
              <button
                onClick={toggleSidebar}
                title="展开侧栏"
                className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold tracking-wide">
                <span className="text-gradient">芝士学爆</span>
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">FSRS 间隔重复算法</p>
            </div>
            <button
              onClick={toggleSidebar}
              title="收起侧栏"
              className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <nav className={cn('flex-1 space-y-1 overflow-y-auto', collapsed ? 'p-2' : 'p-3')}>
        {inDetail ? (
          <button
            onClick={onBack}
            title="返回列表"
            className={cn(
              'flex w-full items-center rounded-lg text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              collapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2'
            )}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed && <span>返回列表</span>}
          </button>
        ) : (
          NAV_ORDER.map(key => {
            const Icon = ICONS[key]
            const active = currentPage === key
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                title={LABELS[key]}
                className={cn(
                  'relative flex w-full items-center rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  collapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2',
                  active
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {/* Sliding active pill — shared layout animation across items */}
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={SPRING_BOUNCY}
                    className="absolute inset-0 rounded-lg bg-primary/10"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                {!collapsed && <span className="relative z-10 truncate">{LABELS[key]}</span>}
                {!collapsed && key === 'today' && stats.todayPending > 0 && (
                  <Badge
                    variant="default"
                    className={cn('relative z-10 ml-auto', stats.overdue > 0 && 'animate-pulse')}
                  >
                    {stats.todayPending}
                  </Badge>
                )}
              </button>
            )
          })
        )}
      </nav>
    </aside>
  )
}
