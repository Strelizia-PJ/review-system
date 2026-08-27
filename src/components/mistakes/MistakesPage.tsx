import { useState, useRef, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeKatex from 'rehype-katex'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Pencil, X } from 'lucide-react'
import { useMistakes } from '../../hooks/useMistakes'
import { useTheme } from '../../hooks/useTheme'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'
import ConfirmDialog from '../shared/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/Dialog'
import { cn } from '../../utils/cn'
import { listItemVariants } from '../../lib/motion'

const iconBtn =
  'rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground'

export default function MistakesPage() {
  const { items, loading, error, fetchList, add, increment, update, remove } = useMistakes()
  const { isDark } = useTheme()
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: number; original: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; content: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchList()
  }, [])

  const handleAdd = async () => {
    const trimmed = content.trim()
    if (!trimmed || adding) return
    setAdding(true)
    try {
      await add(trimmed)
      setContent('')
      inputRef.current?.focus()
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const openEdit = (id: number, current: string) => {
    setEditContent(current)
    setEditTarget({ id, original: current })
  }

  const saveEdit = async () => {
    if (!editTarget) return
    const trimmed = editContent.trim()
    const { id, original } = editTarget
    setEditTarget(null)
    if (trimmed && trimmed !== original.trim()) {
      await update(id, trimmed)
    }
  }

  const plainText = (md: string) =>
    md
      .replace(/[#*`_$\\>\-[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const truncated = (s: string) => {
    const t = plainText(s)
    return t.length > 30 ? t.slice(0, 30) + '...' : t
  }

  const colorMode = isDark ? 'dark' : 'light'

  return (
    <div className="mx-auto max-w-2xl space-y-4" data-color-mode={colorMode}>
      {/* Add form */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={5000}
          placeholder="记录一个易错点（支持 Markdown 与 LaTeX，如 $x^2$），按 Enter 添加..."
          autoFocus
        />
        <Button onClick={handleAdd} disabled={!content.trim() || adding} className="whitespace-nowrap">
          <Plus className="h-4 w-4" />
          添加
        </Button>
      </div>

      {error && <ErrorBar>{error}</ErrorBar>}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton motion-safe:animate-shimmer h-[56px] rounded-lg opacity-70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="🎯" title="暂无易错点" description="遇到容易出错的知识点，记在这里反复提醒自己" />
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                variants={listItemVariants}
                custom={idx}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-card-hover"
              >
                <span className="w-6 shrink-0 text-center text-xs text-muted-foreground/60">{idx + 1}</span>

                <div className="min-w-0 flex-1 break-words">
                  <MDEditor.Markdown
                    source={item.content}
                    remarkPlugins={[remarkMath, remarkBreaks]}
                    rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
                  />
                </div>

                {/* Count badge */}
                <span
                  className={cn(
                    'inline-flex h-7 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold',
                    item.count >= 5
                      ? 'bg-destructive/15 text-destructive'
                      : item.count >= 3
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                  )}
                  title={`已错 ${item.count} 次`}
                >
                  {item.count}
                </span>

                {/* +1 */}
                <Button size="sm" onClick={() => increment(item.id)} title="又错了一次，计数 +1">
                  +1
                </Button>

                <div className="flex shrink-0 items-center">
                  <button onClick={() => openEdit(item.id, item.content)} className={iconBtn} title="编辑">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: item.id, content: item.content })}
                    className={cn(iconBtn, 'hover:text-destructive')}
                    title="删除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit dialog with markdown editor */}
      {editTarget && (
        <Dialog
          open
          onOpenChange={o => {
            if (!o) setEditTarget(null)
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑易错点</DialogTitle>
              <DialogDescription>支持 Markdown 与 LaTeX 公式（$...$ 行内、$$...$$ 块级）。</DialogDescription>
            </DialogHeader>
            <div data-color-mode={colorMode}>
              <MDEditor
                value={editContent}
                onChange={val => setEditContent(val || '')}
                height={260}
                visibleDragbar={false}
                preview="live"
                previewOptions={{
                  remarkPlugins: [remarkMath, remarkBreaks],
                  rehypePlugins: [[rehypeKatex, { throwOnError: false }]]
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
                取消
              </Button>
              <Button size="sm" disabled={!editContent.trim()} onClick={saveEdit}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => {
          if (!o) setDeleteTarget(null)
        }}
        title="确认删除"
        description={`确定删除易错点「${deleteTarget ? truncated(deleteTarget.content) : ''}」吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
