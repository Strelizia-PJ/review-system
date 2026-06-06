import { useState } from 'react'
import dayjs from 'dayjs'

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
      <input
        type="date"
        value={learnDate}
        max={today}
        onChange={e => setLearnDate(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          maxLength={5000}
          onChange={e => setContent(e.target.value)}
          placeholder="输入新知识点，按 Enter 添加..."
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          autoFocus
        />
        <button
          type="submit"
          disabled={!content.trim() || adding}
          className="px-5 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {adding ? '添加中...' : '添加'}
        </button>
      </div>
    </form>
  )
}
