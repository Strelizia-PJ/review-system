import { useState, useRef, useEffect } from 'react'
import type { KnowledgePoint } from '../../types'

interface KnowledgeItemProps {
  item: KnowledgePoint
  onDelete: (id: number) => void
  onUpdate: (id: number, content: string) => Promise<void>
  onClick?: () => void
}

export default function KnowledgeItem({ item, onDelete, onUpdate, onClick }: KnowledgeItemProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.content)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const progress = item.total_stages > 0
    ? Math.round((item.completed_stages / item.total_stages) * 100)
    : 0

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-colors ${onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={editContent}
              maxLength={5000}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCancel}
              className="w-full px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-sm text-gray-800 dark:text-gray-100 break-words">{item.content}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>学习日期 {item.learn_date || item.created_at?.substring(0, 10)}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>已复习 {item.completed_stages} 次</span>
            {item.next_review_date && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-blue-500 dark:text-blue-400">
                  下次复习 {item.next_review_date}
                </span>
              </>
            )}
            {!item.next_review_date && item.completed_stages > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-purple-500 dark:text-purple-400">已掌握</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditContent(item.content)
              setEditing(true)
            }}
            className="text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 text-sm leading-none transition-colors p-1"
            title="编辑"
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
            className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-lg leading-none transition-colors p-1"
            title="删除"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
