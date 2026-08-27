import { useState } from 'react'
import dayjs from 'dayjs'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'

interface AddFormProps {
  onAdd: (content: string, learnDate?: string) => Promise<void>
}

export default function AddForm({ onAdd }: AddFormProps) {
  const [content, setContent] = useState('')
  const [learnDate, setLearnDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [adding, setAdding] = useState(false)

  const today = dayjs().format('YYYY-MM-DD')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || adding) return

    setAdding(true)
    try {
      await onAdd(trimmed, learnDate !== today ? learnDate : undefined)
      setContent('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <DatePicker value={learnDate} max={today} onChange={setLearnDate} className="h-8 text-xs" />
      <div className="flex gap-2">
        <Input
          value={content}
          maxLength={5000}
          onChange={e => setContent(e.target.value)}
          placeholder="输入新知识点，按 Enter 添加..."
          autoFocus
        />
        <Button type="submit" disabled={!content.trim() || adding} className="whitespace-nowrap">
          {adding ? '添加中...' : '添加'}
        </Button>
      </div>
    </form>
  )
}
