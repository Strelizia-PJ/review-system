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
  ArrowLeft
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { Badge } from '../shared/Badge'
import type { NavPage, ReviewStats } from '../../types'

const navItems: { key: NavPage; label: string; icon: typeof BookOpen }[] = [
  { key: 'knowledge', label: '全部知识点', icon: BookOpen },
  { key: 'today', label: '今日复习', icon: CalendarCheck },
  { key: 'mistakes', label: '易错点', icon: AlertCircle },
  { key: 'manage', label: '调度管理', icon: Timer },
  { key: 'plans', label: '每日计划', icon: ClipboardList },
  { key: 'pomodoro', label: '番茄钟', icon: Citrus },
  { key: 'study-stats', label: '学习统计', icon: BarChart3 },
  { key: 'import', label: '导入游戏', icon: Download },
  { key: 'stats', label: '统计数据', icon: Sparkles },
  { key: 'settings', label: '设置', icon: Settings }
]

interface SidebarProps {
  currentPage: NavPage
  onNavigate: (page: NavPage) => void
  stats: ReviewStats
  inDetail?: boolean
  onBack?: () => void
}

export default function Sidebar({ currentPage, onNavigate, stats, inDetail, onBack }: SidebarProps) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card transition-colors">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-bold text-foreground">芝士学爆</h1>
        <p className="mt-1 text-xs text-muted-foreground">FSRS 间隔重复算法</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {inDetail ? (
          <button
            onClick={onBack}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回列表</span>
          </button>
        ) : (
          navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                currentPage === key
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {key === 'today' && stats.todayPending > 0 && (
                <Badge variant="default" className="ml-auto">
                  {stats.todayPending}
                </Badge>
              )}
            </button>
          ))
        )}
      </nav>
    </aside>
  )
}
