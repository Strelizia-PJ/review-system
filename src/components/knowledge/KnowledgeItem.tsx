import { useState, useRef, useEffect } from 'react'
import dayjs from 'dayjs'
import { Pencil, Zap, RotateCcw, X } from 'lucide-react'
import type { KnowledgePoint } from '../../types'
import { getRetrievability } from '../../constants'
import { Input } from '../ui/Input'
import ConfirmDialog from '../shared/ConfirmDialog'
import { cn } from '../../utils/cn'

interface KnowledgeItemProps {
  item: KnowledgePoint
  onDelete: (id: number) => void
  onUpdate: (id: number, content: string) => Promise<void>
  onClick?: () => void
  onForget?: (id: number) => void
  onReviewNow?: (id: number) => void
}

const iconBtn =
  'rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground'

export default function KnowledgeItem({
  item,
  onDelete,
  onUpdate,
  onClick,
  onForget,
  onReviewNow
}: KnowledgeItemProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.content)
  const [forgetConfirm, setForgetConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [reviewNowConfirm, setReviewNowConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const r = getRetrievability(item.card_state)
  const rColor =
    r !== null
      ? r > 0.9
        ? 'text-emerald-600 dark:text-emerald-400'
        : r > 0.7
          ? 'text-amber-600 dark:text-amber-400'
          : r > 0.5
            ? 'text-orange-600 dark:text-orange-400'
            : 'text-red-600 dark:text-red-400'
      : ''
  // Only offer "review now" when the next review is still in the future —
  // today/overdue items are already reachable from the review panels.
  const canReviewNow = !!item.next_review_date && item.next_review_date > dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = async () => {
    const trimmed = editContent.trim()
    if (trimmed && trimmed !== item.content) {
      await onUpdate(item.id, trimmed)
    } else {
      setEditContent(item.content)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setEditContent(item.content)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  const truncated = item.content.length > 30 ? item.content.slice(0, 30) + '...' : item.content

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          'rounded-lg border border-border bg-card p-4 transition-colors',
          onClick && 'cursor-pointer hover:border-primary/40 hover:shadow-sm'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                ref={inputRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleCancel}
                onClick={e => e.stopPropagation()}
                className="h-8 text-sm"
              />
            ) : (
              <p className="break-words text-sm text-foreground">{item.content}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>学习日期 {item.learn_date || item.created_at?.substring(0, 10)}</span>
              <span className="text-border">|</span>
              <span>已复习 {item.completed_stages} 次</span>
              {r !== null && <span className={cn('font-medium', rColor)}>记忆 {Math.round(r * 100)}%</span>}
              {item.next_review_date && (
                <>
                  <span className="text-border">|</span>
                  <span>下次复习 {item.next_review_date}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditContent(item.content)
                setEditing(true)
              }}
              className={iconBtn}
              title="编辑"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canReviewNow && onReviewNow && (
              <button
                onClick={() => setReviewNowConfirm(true)}
                className={cn(iconBtn, 'hover:text-amber-600 dark:hover:text-amber-400')}
                title="提前复习 — 把下次复习拉到今天，正常评分即可（不重置记忆状态）"
              >
                <Zap className="h-4 w-4" />
              </button>
            )}
            {onForget && (
              <button
                onClick={() => setForgetConfirm(true)}
                className={cn(iconBtn, 'hover:text-violet-600 dark:hover:text-violet-400')}
                title="重置记忆"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setDeleteConfirm(true)}
              className={cn(iconBtn, 'hover:text-destructive')}
              title="删除"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={reviewNowConfirm}
        onOpenChange={setReviewNowConfirm}
        title="提前复习"
        description={`把「${truncated}」的下次复习（${item.next_review_date}）拉到今天？记忆状态不变，进入今日复习正常评分即可。`}
        confirmText="拉到今天"
        onConfirm={() => {
          onReviewNow?.(item.id)
          setReviewNowConfirm(false)
        }}
      />

      <ConfirmDialog
        open={forgetConfirm}
        onOpenChange={setForgetConfirm}
        title="重置记忆状态"
        description={`确定重置「${truncated}」的记忆状态吗？复习记录将被清空，该知识点需要重新从第一天开始复习。`}
        confirmText="确认重置"
        onConfirm={() => {
          onForget?.(item.id)
          setForgetConfirm(false)
        }}
      />

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="确认删除"
        description={`确定删除「${truncated}」吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={() => {
          onDelete(item.id)
          setDeleteConfirm(false)
        }}
      />
    </>
  )
}
