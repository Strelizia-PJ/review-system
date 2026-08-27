import { useEffect, useState, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import { motion, AnimatePresence } from 'motion/react'
import { useVirtualizer } from '@tanstack/react-virtual'
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

/** Card body ~96px + 24px row gap (pb-6) */
const ESTIMATED_ROW_HEIGHT = 120

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

  // Virtualized, internally-scrolling list — only visible rows are mounted,
  // keeping long lists jank-free on load, filter and delete
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: index => sortedItems[index].id,
    overscan: 6
  })

  // Jump back to top whenever the filter/sort changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [keyword, sortBy, asc])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 gap-2">
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

      {error && <ErrorBar className="shrink-0">{error}</ErrorBar>}
      {loading ? (
        <div className="shrink-0 space-y-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton motion-safe:animate-shimmer h-[96px] rounded-lg opacity-70" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="🌱" title={keyword ? '未找到匹配的知识点' : '暂无知识点，在右侧添加第一个吧'} />
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-2">
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            <AnimatePresence initial={false}>
              {virtualizer.getVirtualItems().map(vi => {
                const item = sortedItems[vi.index]
                return (
                  /* Outer div owns virtual positioning + row gap; inner motion
                     div owns the entrance/exit animation */
                  <div
                    key={vi.key}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    className="absolute left-0 top-0 w-full pb-6"
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.2, delay: Math.min(vi.index * 0.02, 0.12) }
                      }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    >
                      <KnowledgeItem
                        item={item}
                        onDelete={remove}
                        onUpdate={update}
                        onClick={() => select(item.id)}
                        onForget={forget}
                        onReviewNow={id => reschedule(id, dayjs().format('YYYY-MM-DD'))}
                      />
                    </motion.div>
                  </div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
