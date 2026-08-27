import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Search, Zap, CalendarClock, Gauge } from 'lucide-react'
import { useKnowledge } from '../../hooks/useKnowledge'
import { DEFAULT_MAX_REVIEW_INTERVAL_DAYS, ABSOLUTE_MAX_INTERVAL_DAYS } from '../../constants'
import type { KnowledgePoint } from '../../types'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/Dialog'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'
import ConfirmDialog from '../shared/ConfirmDialog'
import { cn } from '../../utils/cn'

/** Settings key — mirrors electron/database/queries.ts. */
const GLOBAL_MAX_INTERVAL_KEY = 'max_review_interval_days'

type SortKey = 'next_review' | 'learn_date'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'next_review', label: '下次复习' },
  { key: 'learn_date', label: '学习日期' }
]

const actionBtn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors'

export default function ScheduleManagePage() {
  const { items, loading, error, fetchList, setMaxInterval, reschedule, select } = useKnowledge()
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('next_review')
  const [asc, setAsc] = useState(true)

  // Global cap setting
  const [globalInput, setGlobalInput] = useState(String(DEFAULT_MAX_REVIEW_INTERVAL_DAYS))
  const [globalSaving, setGlobalSaving] = useState(false)
  const [globalMsg, setGlobalMsg] = useState('')

  // Per-KP dialogs
  const [capDialogFor, setCapDialogFor] = useState<KnowledgePoint | null>(null)
  const [capInput, setCapInput] = useState('')
  const [dateDialogFor, setDateDialogFor] = useState<KnowledgePoint | null>(null)
  const [dateInput, setDateInput] = useState('')
  const [reviewNowFor, setReviewNowFor] = useState<KnowledgePoint | null>(null)

  useEffect(() => {
    fetchList()
    // Guard for non-Electron (browser preview) environments
    const settingsApi = window.electronAPI?.settings
    if (settingsApi) {
      settingsApi.get(GLOBAL_MAX_INTERVAL_KEY)
        .then(v => { if (v) setGlobalInput(v) })
        .catch(() => {})
    }
  }, [])

  const saveGlobalCap = async () => {
    const parsed = parseInt(globalInput, 10)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > ABSOLUTE_MAX_INTERVAL_DAYS) {
      setGlobalMsg(`请输入 1-${ABSOLUTE_MAX_INTERVAL_DAYS} 之间的天数`)
      return
    }
    setGlobalSaving(true)
    try {
      await window.electronAPI?.settings?.set(GLOBAL_MAX_INTERVAL_KEY, String(parsed))
      setGlobalMsg('已保存')
      // Effective caps shown in the list depend on the global value
      await fetchList()
    } finally {
      setGlobalSaving(false)
      setTimeout(() => setGlobalMsg(''), 2000)
    }
  }

  const openCapDialog = (kp: KnowledgePoint) => {
    setCapInput(kp.max_interval_days !== null ? String(kp.max_interval_days) : '')
    setCapDialogFor(kp)
  }

  const confirmCap = async () => {
    if (!capDialogFor) return
    const trimmed = capInput.trim()
    const days = trimmed === '' ? null : parseInt(trimmed, 10)
    if (days !== null && (!Number.isFinite(days) || days < 1 || days > ABSOLUTE_MAX_INTERVAL_DAYS)) {
      return
    }
    setCapDialogFor(null)
    await setMaxInterval(capDialogFor.id, days)
  }

  const openDateDialog = (kp: KnowledgePoint) => {
    setDateInput(kp.next_review_date || dayjs().add(1, 'day').format('YYYY-MM-DD'))
    setDateDialogFor(kp)
  }

  const confirmReschedule = async () => {
    if (!dateDialogFor || !dateInput) return
    setDateDialogFor(null)
    await reschedule(dateDialogFor.id, dateInput)
  }

  const today = dayjs().format('YYYY-MM-DD')
  const filtered = items.filter(kp =>
    !keyword || kp.content.toLowerCase().includes(keyword.toLowerCase())
  )
  const sorted = [...filtered].sort((a, b) => {
    const va = sortBy === 'next_review'
      ? (a.next_review_date || '9999-12-31')
      : (a.learn_date || a.created_at.substring(0, 10))
    const vb = sortBy === 'next_review'
      ? (b.next_review_date || '9999-12-31')
      : (b.learn_date || b.created_at.substring(0, 10))
    if (va < vb) return asc ? -1 : 1
    if (va > vb) return asc ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-4">
      {/* Global settings */}
      <div className="rounded-lg border border-border bg-card p-4 transition-colors">
        <h3 className="mb-3 text-sm font-medium text-foreground">全局间隔上限</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-foreground">所有知识点的复习间隔不超过</label>
          <Input
            type="number"
            min={1}
            max={ABSOLUTE_MAX_INTERVAL_DAYS}
            value={globalInput}
            onChange={e => setGlobalInput(e.target.value)}
            className="h-8 w-24"
          />
          <span className="text-sm text-muted-foreground">天</span>
          <Button size="sm" onClick={saveGlobalCap} disabled={globalSaving}>
            {globalSaving ? '保存中...' : '保存'}
          </Button>
          {globalMsg && <span className="text-xs text-primary">{globalMsg}</span>}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          全局上限对所有知识点生效（默认 {DEFAULT_MAX_REVIEW_INTERVAL_DAYS} 天）；列表中可给个别知识点设更小的单点上限，实际生效取两者较小值。
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索知识点..."
            className="pl-9"
          />
        </div>
        <Select
          value={`${sortBy}-${asc ? 'asc' : 'desc'}`}
          onValueChange={v => {
            const [key, dir] = v.split('-')
            setSortBy(key as SortKey)
            setAsc(dir === 'asc')
          }}
        >
          <SelectTrigger className="w-32 shrink-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={`${opt.key}-asc`} value={`${opt.key}-asc`}>{opt.label} ↑</SelectItem>
            ))}
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={`${opt.key}-desc`} value={`${opt.key}-desc`}>{opt.label} ↓</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <ErrorBar>{error}</ErrorBar>}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : sorted.length === 0 ? (
        <EmptyState icon="⏱️" title={keyword ? '未找到匹配的知识点' : '暂无知识点'} />
      ) : (
        <div className="space-y-2">
          {sorted.map(kp => (
            <div
              key={kp.id}
              className="rounded-lg border border-border bg-card p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="cursor-pointer truncate text-sm text-foreground transition-colors hover:text-primary"
                    onClick={() => select(kp.id)}
                    title="点击查看详情"
                  >{kp.content}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className={kp.next_review_date && kp.next_review_date < today ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                      下次复习: {kp.next_review_date || '无排期'}
                    </span>
                    <span className="text-border">|</span>
                    <span className="text-muted-foreground">
                      上限: {kp.max_interval_days !== null ? `${kp.max_interval_days} 天` : `全局 ${kp.effective_max_interval_days} 天`}
                      {kp.max_interval_days !== null && kp.max_interval_days > kp.effective_max_interval_days && '（受全局约束）'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {kp.next_review_date && kp.next_review_date > today && (
                    <button
                      onClick={() => setReviewNowFor(kp)}
                      className={cn(actionBtn, 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10')}
                      title="把下次复习拉到今天，正常评分即可（不重置记忆状态）"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      提前复习
                    </button>
                  )}
                  <button
                    onClick={() => openDateDialog(kp)}
                    className={cn(actionBtn, 'text-primary hover:bg-primary/10')}
                    title="修改下次复习日期（不改记忆状态）"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    改期
                  </button>
                  <button
                    onClick={() => openCapDialog(kp)}
                    className={cn(actionBtn, 'text-violet-600 dark:text-violet-400 hover:bg-violet-500/10')}
                    title="设置单个知识点的间隔上限"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    上限
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review-now confirm dialog */}
      {reviewNowFor && (
        <ConfirmDialog
          open
          onOpenChange={o => { if (!o) setReviewNowFor(null) }}
          title="提前复习"
          description={`把「${reviewNowFor.content.length > 20 ? reviewNowFor.content.slice(0, 20) + '...' : reviewNowFor.content}」的下次复习（${reviewNowFor.next_review_date}）拉到今天？记忆状态不变，进入今日复习正常评分即可。`}
          confirmText="拉到今天"
          onConfirm={() => { reschedule(reviewNowFor.id, today); setReviewNowFor(null) }}
        />
      )}

      {/* Per-KP max interval dialog — mounted only while open */}
      {capDialogFor && (
        <Dialog open onOpenChange={open => { if (!open) setCapDialogFor(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>单点间隔上限</DialogTitle>
              <DialogDescription>
                「{capDialogFor.content.length > 20 ? capDialogFor.content.slice(0, 20) + '...' : capDialogFor.content}」单独的间隔上限（当前全局上限 {capDialogFor.effective_max_interval_days} 天）。留空 = 跟随全局。
              </DialogDescription>
            </DialogHeader>
            <Input
              type="number"
              min={1}
              max={ABSOLUTE_MAX_INTERVAL_DAYS}
              value={capInput}
              onChange={e => setCapInput(e.target.value)}
              placeholder={`默认跟随全局（${DEFAULT_MAX_REVIEW_INTERVAL_DAYS} 天）`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              单点上限只能比全局更严格：实际生效取两者较小值；已排期超出新上限的复习会自动前移。
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCapDialogFor(null)}>取消</Button>
              <Button size="sm" onClick={confirmCap}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reschedule dialog — mounted only while open */}
      {dateDialogFor && (
        <Dialog open onOpenChange={open => { if (!open) setDateDialogFor(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>修改下次复习</DialogTitle>
              <DialogDescription>
                「{dateDialogFor.content.length > 20 ? dateDialogFor.content.slice(0, 20) + '...' : dateDialogFor.content}」下次复习日期（当前 {dateDialogFor.next_review_date || '无排期'}）。只移动日期，不改记忆状态。
              </DialogDescription>
            </DialogHeader>
            <div className="mb-2 flex gap-1.5">
              <button
                onClick={() => setDateInput(today)}
                className="flex-1 rounded-lg border border-input py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                今天（提前复习）
              </button>
              <button
                onClick={() => setDateInput(dayjs().add(3, 'day').format('YYYY-MM-DD'))}
                className="flex-1 rounded-lg border border-input py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                3 天后
              </button>
              <button
                onClick={() => setDateInput(dayjs().add(7, 'day').format('YYYY-MM-DD'))}
                className="flex-1 rounded-lg border border-input py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                7 天后
              </button>
            </div>
            <DatePicker value={dateInput} min={today} onChange={setDateInput} />
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDateDialogFor(null)}>取消</Button>
              <Button size="sm" disabled={!dateInput} onClick={confirmReschedule}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
