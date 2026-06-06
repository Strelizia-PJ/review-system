import { useEffect, useState, useRef, useMemo } from 'react'
import { useKnowledge } from '../../hooks/useKnowledge'
import KnowledgeItem from './KnowledgeItem'

type SortKey = 'learn_date' | 'review_count' | 'next_review'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'learn_date', label: '学习日期' },
  { key: 'review_count', label: '复习次数' },
  { key: 'next_review', label: '下次复习' },
]

export default function KnowledgeList() {
  const { items, loading, error, fetchList, remove, update, search, select } = useKnowledge()
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('learn_date')
  const [asc, setAsc] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { fetchList() }, [])

  const handleSearch = (value: string) => {
    setKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const sortedItems = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => {
      let va: string | number, vb: string | number
      switch (sortBy) {
        case 'learn_date':
          va = a.learn_date || a.created_at.substring(0, 10)
          vb = b.learn_date || b.created_at.substring(0, 10)
          break
        case 'review_count':
          va = a.completed_stages
          vb = b.completed_stages
          break
        case 'next_review':
          va = a.next_review_date || '9999-12-31'
          vb = b.next_review_date || '9999-12-31'
          break
      }
      if (va < vb) return asc ? -1 : 1
      if (va > vb) return asc ? 1 : -1
      return 0
    })
    return copy
  }, [items, sortBy, asc])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={e => handleSearch(e.target.value)}
          placeholder="搜索知识点（含正文）..."
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        <select
          value={`${sortBy}-${asc ? 'asc' : 'desc'}`}
          onChange={e => {
            const [key, dir] = e.target.value.split('-')
            setSortBy(key as SortKey)
            setAsc(dir === 'asc')
          }}
          className="px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={`${opt.key}-desc`} value={`${opt.key}-desc`}>{opt.label} ↓</option>
          ))}
          {SORT_OPTIONS.map(opt => (
            <option key={`${opt.key}-asc`} value={`${opt.key}-asc`}>{opt.label} ↑</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      {loading ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">加载中...</p>
      ) : sortedItems.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
          {keyword ? '未找到匹配的知识点' : '暂无知识点，在右侧添加第一个吧'}
        </p>
      ) : (
        sortedItems.map(item => (
          <KnowledgeItem key={item.id} item={item} onDelete={remove} onUpdate={update} onClick={() => select(item.id)} />
        ))
      )}
    </div>
  )
}
