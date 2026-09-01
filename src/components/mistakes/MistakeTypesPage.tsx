import { useState, useRef, useEffect, useMemo } from 'react'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeKatex from 'rehype-katex'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Pencil, X, FolderTree } from 'lucide-react'
import { useMistakeTypes } from '../../hooks/useMistakeTypes'
import { useCategories } from '../../hooks/useCategories'
import { useTheme } from '../../hooks/useTheme'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../shared/Badge'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'
import ConfirmDialog from '../shared/ConfirmDialog'
import CategorySelect from '../categories/CategorySelect'
import CategoryFilterPopover from '../categories/CategoryFilterPopover'
import CategoryManageDialog from '../categories/CategoryManageDialog'
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

export default function MistakeTypesPage() {
  const { items, loading, error, fetchList, add, increment, update, remove } = useMistakeTypes()
  const { items: categories } = useCategories()
  const { isDark } = useTheme()
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [addCategoryId, setAddCategoryId] = useState<number | null>(null)
  const [filterIds, setFilterIds] = useState<Set<number>>(new Set())
  const [filterUncategorized, setFilterUncategorized] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
  const [editTarget, setEditTarget] = useState<{
    id: number
    original: string
    originalCategory: number | null
  } | null>(null)
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
      await add(trimmed, addCategoryId)
      setContent('')
      inputRef.current?.focus()
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const openEdit = (id: number, current: string, categoryId: number | null) => {
    setEditContent(current)
    setEditCategoryId(categoryId)
    setEditTarget({ id, original: current, originalCategory: categoryId })
  }

  const saveEdit = async () => {
    if (!editTarget) return
    const trimmed = editContent.trim()
    const { id, original, originalCategory } = editTarget
    setEditTarget(null)
    if (trimmed && (trimmed !== original.trim() || editCategoryId !== originalCategory)) {
      await update(id, trimmed, editCategoryId)
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

  const visibleItems = useMemo(() => {
    if (filterIds.size === 0 && !filterUncategorized) return items
    const ids = new Set(filterIds)
    for (const c of categories) {
      if (c.parent_id !== null && filterIds.has(c.parent_id)) ids.add(c.id)
    }
    return items.filter(it => (it.category_id === null ? filterUncategorized : ids.has(it.category_id)))
  }, [items, categories, filterIds, filterUncategorized])

  const categoryLabel = (id: number | null): string | null => {
    if (id === null) return null
    const cat = categories.find(c => c.id === id)
    if (!cat) return null
    if (cat.parent_id !== null) {
      const parent = categories.find(c => c.id === cat.parent_id)
      return parent ? `${parent.name} / ${cat.name}` : cat.name
    }
    return cat.name
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
          placeholder="记录一个错题类型（如：概念不清、计算失误、审题偏差），按 Enter 添加..."
          autoFocus
          className="flex-1"
        />
        <CategorySelect value={addCategoryId} onChange={setAddCategoryId} className="w-44 shrink-0" />
        <Button onClick={handleAdd} disabled={!content.trim() || adding} className="whitespace-nowrap">
          <Plus className="h-4 w-4" />
          添加
        </Button>
      </div>

      {/* Category tools */}
      <div className="flex items-center gap-2">
        {categories.length > 0 && (
          <CategoryFilterPopover
            selected={filterIds}
            includeUncategorized={filterUncategorized}
            onChange={(ids, unc) => {
              setFilterIds(ids)
              setFilterUncategorized(unc)
            }}
          />
        )}
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <FolderTree className="h-4 w-4" />
          管理分类
        </Button>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {visibleItems.length} / {items.length} 条
          </span>
        )}
      </div>

      {error && <ErrorBar>{error}</ErrorBar>}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton motion-safe:animate-shimmer h-[56px] rounded-lg opacity-70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="暂无错题类型"
          description="把错题按原因分类（概念不清 / 计算失误 / 审题偏差…），找准薄弱环节"
        />
      ) : visibleItems.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">当前筛选下没有词条</div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleItems.map((item, idx) => (
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

                {/* Category badge */}
                {categoryLabel(item.category_id) && (
                  <Badge
                    className="max-w-[8rem] shrink-0 truncate"
                    title={categoryLabel(item.category_id) ?? undefined}
                  >
                    {categoryLabel(item.category_id)}
                  </Badge>
                )}

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
                  title={`该类型已错 ${item.count} 次`}
                >
                  {item.count}
                </span>

                {/* +1 */}
                <Button size="sm" onClick={() => increment(item.id)} title="该类型又错了一次，计数 +1">
                  +1
                </Button>

                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => openEdit(item.id, item.content, item.category_id)}
                    className={iconBtn}
                    title="编辑"
                  >
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
              <DialogTitle>编辑错题类型</DialogTitle>
              <DialogDescription>支持 Markdown 与 LaTeX 公式（$...$ 行内、$$...$$ 块级）。</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">分类</span>
              <CategorySelect value={editCategoryId} onChange={setEditCategoryId} />
            </div>
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
        description={`确定删除错题类型「${deleteTarget ? truncated(deleteTarget.content) : ''}」吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />

      <CategoryManageDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  )
}
