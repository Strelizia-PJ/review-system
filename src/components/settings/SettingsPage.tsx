import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Download, Upload } from 'lucide-react'
import { useTheme, type ThemeMode } from '../../hooks/useTheme'
import { Switch } from '../ui/Switch'
import { Button } from '../ui/Button'
import { ErrorBar, SuccessBar } from '../shared/Bars'
import ConfirmDialog from '../shared/ConfirmDialog'
import { cn } from '../../utils/cn'

const themeOptions: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
  { key: 'system', label: '跟随系统', icon: Monitor }
]

export default function SettingsPage() {
  const { mode, setMode } = useTheme()
  const [autoStartEnabled, setAutoStartEnabled] = useState(false)
  const [dataMsg, setDataMsg] = useState<string | null>(null)
  const [dataErr, setDataErr] = useState<string | null>(null)
  const [importConfirm, setImportConfirm] = useState(false)

  const handleImport = async () => {
    const r = await window.electronAPI?.data.import()
    setDataErr(r?.error ? '导入失败' : null)
    setDataMsg(r?.success ? '已导入，重启应用后生效' : null)
    setTimeout(() => { setDataMsg(null); setDataErr(null) }, 3000)
  }

  useEffect(() => {
    window.electronAPI?.autoStart.isEnabled().then(setAutoStartEnabled).catch(() => {})
  }, [])

  const handleAutoStartToggle = async (next: boolean) => {
    setAutoStartEnabled(next)
    try {
      await window.electronAPI?.autoStart.set(next)
    } catch {
      setAutoStartEnabled(!next)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Appearance */}
      <section className="rounded-lg border border-border bg-card p-4 transition-colors">
        <h3 className="mb-3 text-sm font-medium text-foreground">外观</h3>
        <div className="flex gap-1.5">
          {themeOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
                mode === key
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'border border-input text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* General */}
      <section className="rounded-lg border border-border bg-card p-4 transition-colors">
        <h3 className="mb-3 text-sm font-medium text-foreground">通用</h3>
        <label className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1.5">
          <div>
            <p className="text-sm text-foreground">开机自启</p>
            <p className="mt-0.5 text-xs text-muted-foreground">登录 Windows 后自动启动并最小化到托盘</p>
          </div>
          <Switch checked={autoStartEnabled} onCheckedChange={handleAutoStartToggle} />
        </label>
      </section>

      {/* Data */}
      <section className="rounded-lg border border-border bg-card p-4 transition-colors">
        <h3 className="mb-3 text-sm font-medium text-foreground">数据管理</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const r = await window.electronAPI?.data.export()
              setDataErr(null)
              setDataMsg(r?.success ? '已导出' : null)
              setTimeout(() => setDataMsg(null), 2000)
            }}
          >
            <Upload className="h-4 w-4" />
            导出数据
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportConfirm(true)}
          >
            <Download className="h-4 w-4" />
            导入数据
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          所有数据保存在本地（%APPDATA%/forgetting-curve-reminder/data.json），建议定期导出备份。
        </p>
        {dataMsg && <SuccessBar className="mt-3">{dataMsg}</SuccessBar>}
        {dataErr && <ErrorBar className="mt-3">{dataErr}</ErrorBar>}
      </section>

      <ConfirmDialog
        open={importConfirm}
        onOpenChange={setImportConfirm}
        title="导入数据"
        description="导入将覆盖当前的全部数据（知识点、复习记录、计划、统计），此操作不可撤销。确定继续吗？"
        confirmText="覆盖导入"
        variant="destructive"
        onConfirm={() => { setImportConfirm(false); handleImport() }}
      />
    </div>
  )
}
