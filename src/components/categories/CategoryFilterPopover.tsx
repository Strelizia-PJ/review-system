import { useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'

interface CategoryFilterPopoverProps {
  /** 勾选的分类 id（可含大类和子类） */
  selected: Set<number>
  includeUncategorized: boolean
  onChange: (selected: Set<number>, includeUncategorized: boolean) => void
}

/** 分类多选筛选器：勾选大类即包含其全部子分类，另有「未分类」选项；全不选 = 全部。 */
export default function CategoryFilterPopover({
  selected,
  includeUncategorized,
  onChange
}: CategoryFilterPopoverProps) {
  const { items, fetchList } = useCategories()

  useEffect(() => {
    fetchList()
  }, [])

  if (items.length === 0) return null

  const checkedCount = selected.size + (includeUncategorized ? 1 : 0)

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next, includeUncategorized)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {checkedCount === 0 ? '分类：全部' : `分类：已选 ${checkedCount} 项`}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-1.5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={selected.size === 0 && !includeUncategorized}
            onCheckedChange={() => onChange(new Set(), false)}
          />
          全部
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={includeUncategorized}
            onCheckedChange={() => onChange(selected, !includeUncategorized)}
          />
          未分类
        </label>
        {items
          .filter(cat => cat.parent_id === null)
          .map(parent => {
            const parentChecked = selected.has(parent.id)
            return (
              <div key={parent.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={parentChecked} onCheckedChange={() => toggle(parent.id)} />
                  {parent.name}
                </label>
                {items
                  .filter(cat => cat.parent_id === parent.id)
                  .map(child => (
                    <label key={child.id} className="flex cursor-pointer items-center gap-2 pl-6 text-sm">
                      <Checkbox
                        checked={parentChecked || selected.has(child.id)}
                        disabled={parentChecked}
                        onCheckedChange={() => toggle(child.id)}
                      />
                      {child.name}
                    </label>
                  ))}
              </div>
            )
          })}
      </PopoverContent>
    </Popover>
  )
}
