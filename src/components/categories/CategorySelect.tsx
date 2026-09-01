import { useEffect } from 'react'
import { useCategories } from '../../hooks/useCategories'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'

interface CategorySelectProps {
  value: number | null
  onChange: (value: number | null) => void
  className?: string
}

/** 单选分类下拉：「未分类」+ 大类（后跟各自子类，显示全路径）。 */
export default function CategorySelect({ value, onChange, className }: CategorySelectProps) {
  const { items, fetchList } = useCategories()

  useEffect(() => {
    fetchList()
  }, [])

  const options: { id: number; label: string }[] = []
  for (const cat of items) {
    if (cat.parent_id !== null) continue
    options.push({ id: cat.id, label: cat.name })
    for (const child of items) {
      if (child.parent_id === cat.id) {
        options.push({ id: child.id, label: `${cat.name} › ${child.name}` })
      }
    }
  }

  return (
    <Select
      value={value === null ? 'none' : String(value)}
      onValueChange={v => onChange(v === 'none' ? null : Number(v))}
    >
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">未分类</SelectItem>
        {options.map(opt => (
          <SelectItem key={opt.id} value={String(opt.id)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
