import { useEffect, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeKatex from 'rehype-katex'
import { Undo2 } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

const DURATION_MS = 5000
const TICK_MS = 100

interface VerificationCardProps {
  content: string
  detail: string
  onUndo: () => void
  onExpire: () => void
}

/**
 * Post-rating verification card — floating at the bottom-right corner so it
 * never shifts the review list. Shows the rated knowledge point's markdown
 * detail for 5s; hovering pauses the countdown. Rating another item remounts
 * the card (keyed by reviewId), undoing dismisses it instantly.
 */
export default function VerificationCard({ content, detail, onUndo, onExpire }: VerificationCardProps) {
  const { isDark } = useTheme()
  const [remaining, setRemaining] = useState(DURATION_MS)
  const [hovered, setHovered] = useState(false)

  // Countdown only runs while not hovered
  useEffect(() => {
    if (hovered || remaining <= 0) return
    const timer = setInterval(() => {
      setRemaining(r => Math.max(0, r - TICK_MS))
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [hovered, remaining])

  useEffect(() => {
    if (remaining > 0) return
    // Defer past the render/commit phase — updating the parent store here
    // directly triggers React's "setState during render" warning
    const id = setTimeout(onExpire, 0)
    return () => clearTimeout(id)
  }, [remaining, onExpire])

  const truncated = content.length > 20 ? content.slice(0, 20) + '...' : content

  return (
    <div
      className="fixed bottom-4 right-2 z-40 w-[304px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 bg-primary/10 px-3 py-2">
        <span className="truncate text-sm text-primary" title={content}>
          已评分「{truncated}」— 核对详情（悬停可暂停）
        </span>
        <button
          onClick={onUndo}
          className="ml-3 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-75"
        >
          <Undo2 className="h-3.5 w-3.5" />
          撤销
        </button>
      </div>

      {/* Markdown detail */}
      <div className="max-h-[50vh] overflow-y-auto px-4 py-3" data-color-mode={isDark ? 'dark' : 'light'}>
        {detail ? (
          <MDEditor.Markdown
            source={detail}
            remarkPlugins={[remarkMath, remarkBreaks]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
          />
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">
            （该知识点没有详情内容，仅凭标题核对）
          </p>
        )}
      </div>

      {/* Countdown progress bar */}
      <div
        className="h-1 bg-primary/60 transition-[width] duration-100 ease-linear"
        style={{ width: `${(remaining / DURATION_MS) * 100}%` }}
      />
    </div>
  )
}
