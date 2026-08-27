import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeKatex from 'rehype-katex'
import { ArrowLeft } from 'lucide-react'
import type { KnowledgePointDetail } from '../../types'
import { useTheme } from '../../hooks/useTheme'

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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const { isDark } = useTheme()

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

  const saveDetail = useCallback(
    async (newDetail: string, newTitle?: string) => {
      const t = newTitle ?? title
      if (savingRef.current) return
      // Clear pending auto-save timer so it doesn't fire after a manual save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      savingRef.current = true
      setSaving(true)
      try {
        await onUpdate(kpId, t, newDetail)
        setKp(prev => (prev ? { ...prev, content: t, detail: newDetail } : null))
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [kpId, title, onUpdate]
  )

  // Keep ref in sync so the auto-save effect always calls the latest saveDetail
  const saveDetailRef = useRef(saveDetail)
  useEffect(() => {
    saveDetailRef.current = saveDetail
  }, [saveDetail])

  // Save then navigate back — no need to wait for auto-save
  const handleSaveAndBack = useCallback(async () => {
    if (title !== (kp?.content || '') || detail !== (kp?.detail || '')) {
      await saveDetail(detail, title)
    }
    onBack()
  }, [title, detail, kp, saveDetail, onBack])

  // ESC → save and exit
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSaveAndBack()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [handleSaveAndBack])

  // Debounced auto-save: 2s after last edit
  useEffect(() => {
    if (!kp) return
    if (detail === (kp?.detail || '') && title === (kp?.content || '')) return
    saveTimerRef.current = setTimeout(() => saveDetailRef.current(detail, title), 2000)
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [detail, title, kp])

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
        } catch {
          /* ignore */
        }
      }
      input.click()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0 transition-colors">
        <button
          onClick={handleSaveAndBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回并保存
        </button>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          onBlur={() => saveDetail(detail, title)}
          className="flex-1 bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="知识点标题"
        />
        <span className="w-16 whitespace-nowrap text-center text-xs text-muted-foreground">
          {loadError ? (
            <span className="text-destructive">加载失败</span>
          ) : kp === null ? (
            <span>加载中...</span>
          ) : saving ? (
            <span>保存中...</span>
          ) : title !== kp.content || detail !== kp.detail ? (
            <span className="text-amber-500">未保存</span>
          ) : (
            <span>已保存</span>
          )}
        </span>
      </div>

      {/* Markdown editor */}
      <div className="flex-1 overflow-hidden" data-color-mode={isDark ? 'dark' : 'light'}>
        {loadError ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            加载失败
          </div>
        ) : (
          <MDEditor
            value={detail}
            onChange={val => setDetail(val || '')}
            height="100%"
            visibleDragbar={false}
            preview="live"
            autoFocus
            previewOptions={{
              remarkPlugins: [remarkMath, remarkBreaks],
              rehypePlugins: [[rehypeKatex, { throwOnError: false }]]
            }}
            commands={[commands.codeEdit, commands.codeLive, commands.codePreview]}
            extraCommands={[
              imageCommand,
              commands.bold,
              commands.italic,
              commands.strikethrough,
              commands.title,
              commands.divider,
              commands.link,
              commands.quote,
              commands.code,
              commands.divider,
              commands.unorderedListCommand,
              commands.orderedListCommand,
              commands.checkedListCommand,
              commands.divider,
              commands.table
            ]}
          />
        )}
      </div>
    </div>
  )
}
