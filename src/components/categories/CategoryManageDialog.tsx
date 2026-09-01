import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import { useMistakes } from '../../hooks/useMistakes'
import { useMistakeTypes } from '../../hooks/useMistakeTypes'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../shared/Badge'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'
import ConfirmDialog from '../shared/ConfirmDialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { cn } from '../../utils/cn'
import type { Category } from '../../types'

const iconBtn =
  'rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground'

interface CategoryManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 两级分类管理：添加 / 改名 / 删除，显示各分类直接挂靠的词条数。 */
export default function CategoryManageDialog({ open, onOpenChange }: CategoryManageDialogProps) {
  const { items, error, fetchList, add, update, remove } = useCategories()
  const { items: mistakes, fetchList: fetchMistakes } = useMistakes()
  const { items: mistakeTypes, fetchList: fetchMistakeTypes } = useMistakeTypes()
  const [newName, setNewName] = useState('')
  const [newParentId, setNewParentId] = useState<number | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    if (open) {
      fetchList()
      fetchMistakes()
      fetchMistakeTypes()
    }
  }, [open])

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setLocalError(null)
      setEditingId(null)
    }
    onOpenChange(o)
  }

  const parents = items.filter(cat => cat.parent_id === null)

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (items.some(cat => cat.parent_id === newParentId && cat.name === trimmed)) {
      setLocalError('同级已存在同名分类')
      return
    }
    setLocalError(null)
    await add(trimmed, newParentId)
    setNewName('')
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setLocalError(null)
  }

  const handleRename = async () => {
    if (editingId === null) return
    const trimmed = editName.trim()
    const target = items.find(cat => cat.id === editingId)
    if (!trimmed || !target) {
      setEditingId(null)
      return
    }
    if (
      trimmed !== target.name &&
      items.some(cat => cat.id !== editingId && cat.parent_id === target.parent_id && cat.name === trimmed)
    ) {
      setLocalError('同级已存在同名分类')
      return
    }
    setLocalError(null)
    if (trimmed !== target.name) {
      await update(editingId, trimmed)
    }
    setEditingId(null)
  }

  const deleteChildCount = deleteTarget ? items.filter(cat => cat.parent_id === deleteTarget.id).length : 0
  const deleteEntryCount = deleteTarget
    ? mistakes.filter(m => m.category_id === deleteTarget.id).length +
      mistakeTypes.filter(m => m.category_id === deleteTarget.id).length
    : 0

  const rowCls = 'flex items-center gap-2 rounded-lg border border-border bg-card p-2.5'

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>管理分类</DialogTitle>
            <DialogDescription>两级分类：易错点和错题类型都可以归入大类或子类。</DialogDescription>
          </DialogHeader>

          {/* Add form */}
          <div className="mb-3 flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
              }}
              maxLength={50}
              placeholder="新分类名"
            />
            <Select
              value={newParentId === null ? 'none' : String(newParentId)}
              onValueChange={v => setNewParentId(v === 'none' ? null : Number(v))}
            >
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">作为大类</SelectItem>
                {parents.map(parent => (
                  <SelectItem key={parent.id} value={String(parent.id)}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newName.trim()} className="whitespace-nowrap">
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </div>

          {localError && <ErrorBar className="mb-3">{localError}</ErrorBar>}
          {error && <ErrorBar className="mb-3">{error}</ErrorBar>}

          {/* Tree list */}
          {items.length === 0 ? (
            <EmptyState
              icon="🗂️"
              title="暂无分类"
              description="先创建一个分类，就能在易错点和错题类型里归档了"
            />
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {parents.map(parent => (
                <div key={parent.id} className="space-y-2">
                  <div className={rowCls}>
                    {editingId === parent.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          maxLength={50}
                          autoFocus
                          className="flex-1"
                        />
                        <button onClick={handleRename} className={iconBtn} title="保存">
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className={cn(iconBtn, 'hover:text-destructive')}
                          title="取消"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm">{parent.name}</span>
                        <Badge variant="neutral" className="shrink-0 text-xs">
                          易错点 {mistakes.filter(m => m.category_id === parent.id).length}
                        </Badge>
                        <Badge variant="neutral" className="shrink-0 text-xs">
                          错题类型 {mistakeTypes.filter(m => m.category_id === parent.id).length}
                        </Badge>
                        <button onClick={() => startEdit(parent)} className={iconBtn} title="编辑">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(parent)}
                          className={cn(iconBtn, 'hover:text-destructive')}
                          title="删除"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {items
                    .filter(cat => cat.parent_id === parent.id)
                    .map(child => (
                      <div key={child.id} className={cn(rowCls, 'ml-6')}>
                        {editingId === child.id ? (
                          <>
                            <Input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRename()
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              maxLength={50}
                              autoFocus
                              className="flex-1"
                            />
                            <button onClick={handleRename} className={iconBtn} title="保存">
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={cn(iconBtn, 'hover:text-destructive')}
                              title="取消"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 truncate text-sm">{child.name}</span>
                            <Badge variant="neutral" className="shrink-0 text-xs">
                              易错点 {mistakes.filter(m => m.category_id === child.id).length}
                            </Badge>
                            <Badge variant="neutral" className="shrink-0 text-xs">
                              错题类型 {mistakeTypes.filter(m => m.category_id === child.id).length}
                            </Badge>
                            <button onClick={() => startEdit(child)} className={iconBtn} title="编辑">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(child)}
                              className={cn(iconBtn, 'hover:text-destructive')}
                              title="删除"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => {
          if (!o) setDeleteTarget(null)
        }}
        title="确认删除"
        description={`确定删除分类「${deleteTarget?.name ?? ''}」吗？${deleteChildCount > 0 ? `${deleteChildCount} 个子分类将上移为顶级分类。` : ''}${deleteEntryCount > 0 ? `${deleteEntryCount} 个词条将变为未分类。` : ''}`}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
