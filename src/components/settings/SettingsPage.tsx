import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Download, Upload, RefreshCw, ExternalLink } from 'lucide-react'
import { useTheme, type ThemeMode } from '../../hooks/useTheme'
import { Switch } from '../ui/Switch'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select'
import { ErrorBar, SuccessBar } from '../shared/Bars'
import ConfirmDialog from '../shared/ConfirmDialog'
import { cn } from '../../utils/cn'

const themeOptions: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
  { key: 'system', label: '跟随系统', icon: Monitor }
]

/** Preset GitHub acceleration mirrors for update downloads */
const MIRROR_PRESETS = [
  { label: 'ghfast.top', value: 'https://ghfast.top/' },
  { label: 'gh-proxy.com', value: 'https://gh-proxy.com/' },
  { label: 'mirror.ghproxy.com', value: 'https://mirror.ghproxy.com/' },
  { label: 'ghproxy.net', value: 'https://ghproxy.net/' }
]
const DEFAULT_MIRROR = MIRROR_PRESETS[0].value

export default function SettingsPage() {
  const { mode, setMode } = useTheme()
  const [autoStartEnabled, setAutoStartEnabled] = useState(false)
  const [dataMsg, setDataMsg] = useState<string | null>(null)
  const [dataErr, setDataErr] = useState<string | null>(null)
  const [importConfirm, setImportConfirm] = useState(false)

  // About & update state
  const [version, setVersion] = useState('')
  const [platform, setPlatform] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const isMac = platform === 'darwin'
  // Update download acceleration: 'off' or a mirror prefix URL
  const [mirror, setMirror] = useState(DEFAULT_MIRROR)
  const [mirrorChoice, setMirrorChoice] = useState<string>(DEFAULT_MIRROR)
  const [customMirror, setCustomMirror] = useState('')

  useEffect(() => {
    window.electronAPI?.update
      .getVersion()
      .then(setVersion)
      .catch(() => {})
    window.electronAPI?.update
      .getPlatform()
      .then(setPlatform)
      .catch(() => {})
    window.electronAPI?.update
      .getMirror()
      .then(value => {
        if (value === 'off') {
          setMirror('off')
          return
        }
        setMirror(value)
        if (MIRROR_PRESETS.some(p => p.value === value)) {
          setMirrorChoice(value)
        } else {
          setMirrorChoice('custom')
          setCustomMirror(value)
        }
      })
      .catch(() => {})
    const off = window.electronAPI?.update.onStatus(setUpdateStatus)
    return () => off?.()
  }, [])

  const applyMirror = (value: string) => {
    setMirror(value)
    window.electronAPI?.update.setMirror(value).catch(() => {})
  }

  const handleMirrorToggle = (on: boolean) => {
    applyMirror(on ? DEFAULT_MIRROR : 'off')
    if (on) setMirrorChoice(DEFAULT_MIRROR)
  }

  const handleMirrorChoice = (value: string) => {
    setMirrorChoice(value)
    if (value !== 'custom') applyMirror(value)
  }

  const applyCustomMirror = () => {
    const trimmed = customMirror.trim()
    if (!trimmed) return
    const normalized = /\/$/.test(trimmed) ? trimmed : trimmed + '/'
    applyMirror(normalized)
  }

  const handleImport = async () => {
    const r = await window.electronAPI?.data.import()
    setDataErr(r?.error ? '导入失败' : null)
    setDataMsg(r?.success ? '已导入，重启应用后生效' : null)
    setTimeout(() => {
      setDataMsg(null)
      setDataErr(null)
    }, 3000)
  }

  useEffect(() => {
    window.electronAPI?.autoStart
      .isEnabled()
      .then(setAutoStartEnabled)
      .catch(() => {})
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
      <section className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
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
      <section className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
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
      <section className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
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
          <Button variant="outline" size="sm" onClick={() => setImportConfirm(true)}>
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

      {/* About & update */}
      <section className="rounded-lg border border-border bg-card p-4 shadow-card transition-colors">
        <h3 className="mb-3 text-sm font-medium text-foreground">关于与更新</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-foreground">芝士学爆 {version || '…'}</span>
          {isMac ? (
            <Button variant="outline" size="sm" onClick={() => window.electronAPI?.update.openRelease()}>
              <ExternalLink className="h-4 w-4" />
              到下载页检查更新
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={updateStatus?.event === 'checking' || updateStatus?.event === 'downloading'}
              onClick={() => window.electronAPI?.update.check()}
            >
              <RefreshCw className="h-4 w-4" />
              {updateStatus?.event === 'checking' ? '检查中...' : '检查更新'}
            </Button>
          )}
        </div>

        {/* Download acceleration — Windows only (mac has no in-app update) */}
        {!isMac && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-foreground">下载加速</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  通过镜像节点下载更新包；安装包经 SHA512 校验，镜像无法篡改内容
                </p>
              </div>
              <Switch checked={mirror !== 'off'} onCheckedChange={handleMirrorToggle} />
            </div>

            {mirror !== 'off' && (
              <div className="mt-2 space-y-2">
                <Select value={mirrorChoice} onValueChange={handleMirrorChoice}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MIRROR_PRESETS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">自定义镜像</SelectItem>
                  </SelectContent>
                </Select>
                {mirrorChoice === 'custom' && (
                  <div className="flex gap-2">
                    <Input
                      value={customMirror}
                      onChange={e => setCustomMirror(e.target.value)}
                      onBlur={applyCustomMirror}
                      onKeyDown={e => {
                        if (e.key === 'Enter') applyCustomMirror()
                      }}
                      placeholder="自定义镜像前缀，如 https://your-mirror.example/"
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={applyCustomMirror}
                      disabled={!customMirror.trim()}
                    >
                      应用
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isMac && updateStatus && (
          <div className="mt-3 text-sm">
            {updateStatus.event === 'available' && (
              <p className="text-primary">发现新版本 v{updateStatus.version}，正在下载...</p>
            )}
            {updateStatus.event === 'downloading' && (
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${updateStatus.percent}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{updateStatus.percent}%</span>
              </div>
            )}
            {updateStatus.event === 'downloaded' && (
              <div className="flex items-center gap-3">
                <span className="text-primary">v{updateStatus.version} 已就绪</span>
                <Button size="sm" onClick={() => window.electronAPI?.update.install()}>
                  重启并安装
                </Button>
              </div>
            )}
            {updateStatus.event === 'not-available' && <p className="text-muted-foreground">已是最新版本</p>}
            {updateStatus.event === 'error' && (
              <p className="text-destructive">更新检查失败：{updateStatus.message}</p>
            )}
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          {isMac
            ? 'macOS 版本未签名，无法在线自动更新；新版本请到下载页手动获取（首次打开需右键→打开）。'
            : 'Windows 版本在后台自动检查更新，下载完成后可一键安装。'}
        </p>
      </section>

      <ConfirmDialog
        open={importConfirm}
        onOpenChange={setImportConfirm}
        title="导入数据"
        description="导入将覆盖当前的全部数据（知识点、复习记录、计划、统计），此操作不可撤销。确定继续吗？"
        confirmText="覆盖导入"
        variant="destructive"
        onConfirm={() => {
          setImportConfirm(false)
          handleImport()
        }}
      />
    </div>
  )
}
