import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { KnowledgePointDetail } from '../../types'

interface DetailPanelProps {
  kpId: number
  onBack: () => void
  onUpdate: (id: number, content?: string, detail?: string) => Promise<void>
}

export default function DetailPanel({ kpId, onBack, onUpdate }: DetailPanelProps) {
  const [kp, setKp] = useState<KnowledgePointDetail | null>(null)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDetailRef = useRef<string | null>(null)
  const composingRef = useRef(false)

  // Throttle MDEditor onChange to 300ms with IME composition support
  const handleDetailChange = useCallback((val: string | undefined) => {
    const value = val || ''
    pendingDetailRef.current = value
    if (composingRef.current) {
      setDetail(value)
      return
    }
    if (throttleRef.current) return
    setDetail(value)
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null
      if (pendingDetailRef.current !== null && pendingDetailRef.current !== value) {
        setDetail(pendingDetailRef.current)
        pendingDetailRef.current = null
      }
    }, 300)
  }, [])

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const data = await window.electronAPI.knowledge.getById(kpId)
        if (data) {
          setKp(data)
          setTitle(data.content)
          setDetail(data.detail || '')
          setLoadError(false)
        }
      } catch {
        setLoadError(true)
      }
    }
    loadDetail()
  }, [kpId])

  const saveDetail = useCallback(async (newDetail: string, newTitle?: string) => {
    const t = newTitle ?? title
    if (saving) return
    setSaving(true)
    try {
      await onUpdate(kpId, t, newDetail)
    } finally {
      setSaving(false)
    }
  }, [kpId, title, saving, onUpdate])

  useEffect(() => {
    return () => {
      if (throttleRef.current) clearTimeout(throttleRef.current)
    }
  }, [])

  // Debounced auto-save: 2s after last edit
  useEffect(() => {
    if (detail === (kp?.detail || '') && title === (kp?.content || '')) return
    if (!kp) return
    const timer = setTimeout(() => saveDetail(detail, title), 2000)
    return () => clearTimeout(timer)
  }, [detail, title])

  // Custom image command — copies file to userData/images/ via IPC
  const imageCommand = {
    ...commands.image,
    execute: async (_state: any, api: any) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        try {
          const buffer = await file.arrayBuffer()
          const fileName = await window.electronAPI.image.save(kpId, new Uint8Array(buffer), file.name)
          api.replaceSelection(`![${file.name.replace(/\.[^.]+$/, '')}](kcimg://${kpId}/${fileName})`)
        } catch { /* ignore */ }
      }
      input.click()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button onClick={onBack} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm">← 返回</button>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
          onBlur={() => saveDetail(detail, title)}
          className="flex-1 text-lg font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-none outline-none"
          placeholder="知识点标题"
        />
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{saving ? '保存中...' : '已保存'}</span>
      </div>

      {/* Markdown editor */}
      <div
        className="flex-1 overflow-hidden"
        data-color-mode="light"
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={() => {
          composingRef.current = false
          if (throttleRef.current) { clearTimeout(throttleRef.current); throttleRef.current = null }
          if (pendingDetailRef.current !== null) { setDetail(pendingDetailRef.current); pendingDetailRef.current = null }
        }}
      >
        {loadError ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">加载失败</div>
        ) : (
        <MDEditor
          value={detail}
          onChange={handleDetailChange}
          height="100%"
          visibleDragbar={false}
          preview="live"
          previewOptions={{
            remarkPlugins: [remarkMath],
            rehypePlugins: [[rehypeKatex, { throwOnError: false }]],
          }}
          commands={[commands.codeEdit, commands.codeLive, commands.codePreview]}
          extraCommands={[
            imageCommand,
            commands.bold, commands.italic, commands.strikethrough, commands.title,
            commands.divider,
            commands.link, commands.quote, commands.code,
            commands.divider,
            commands.unorderedListCommand, commands.orderedListCommand, commands.checkedListCommand,
            commands.divider,
            commands.table
          ]}
        />
        )}
      </div>
    </div>
  )
}
