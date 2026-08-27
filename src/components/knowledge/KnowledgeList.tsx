import { useEffect, useState, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import { Search } from 'lucide-react'
import { useKnowledge } from '../../hooks/useKnowledge'
import KnowledgeItem from './KnowledgeItem'
import { Input } from '../ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select'
import { ErrorBar } from '../shared/Bars'
import EmptyState from '../shared/EmptyState'

type SortKey = 'learn_date' | 'review_count' | 'next_review'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'learn_date', label: '学习日期' },
  { key: 'review_count', label: '复习次数' },
  { key: 'next_review', label: '下次复习' }
]

export default function KnowledgeList() {
  const { items, loading, error, fetchList, remove, update, search, select, forget, reschedule } =
    useKnowledge()
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('learn_date')
  const [asc, setAsc] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchList()
  }, [])

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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={e => handleSearch(e.target.value)}
            placeholder="搜索知识点（含正文）..."
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
              <SelectItem key={`${opt.key}-desc`} value={`${opt.key}-desc`}>
                {opt.label} ↓
              </SelectItem>
            ))}
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={`${opt.key}-asc`} value={`${opt.key}-asc`}>
                {opt.label} ↑
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <ErrorBar>{error}</ErrorBar>}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
      ) : sortedItems.length === 0 ? (
        <EmptyState icon="🌱" title={keyword ? '未找到匹配的知识点' : '暂无知识点，在右侧添加第一个吧'} />
      ) : (
        sortedItems.map(item => (
          <KnowledgeItem
            key={item.id}
            item={item}
            onDelete={remove}
            onUpdate={update}
            onClick={() => select(item.id)}
            onForget={forget}
            onReviewNow={id => reschedule(id, dayjs().format('YYYY-MM-DD'))}
          />
        ))
      )}
    </div>
  )
}
