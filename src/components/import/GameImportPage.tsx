import { useState, useEffect } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { ErrorBar, SuccessBar } from '../shared/Bars'
import ConfirmDialog from '../shared/ConfirmDialog'
import { cn } from '../../utils/cn'

interface ScannedDay {
  date: string
  gameMinutes: number
  localMinutes: number
}

export default function GameImportPage() {
  const [dirPath, setDirPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [days, setDays] = useState<ScannedDay[]>([])
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [overwriteConfirm, setOverwriteConfirm] = useState(false)

  const api = () => window.electronAPI?.import

  // Load saved path on mount
  useEffect(() => {
    window.electronAPI?.settings
      .get('game_import_path')
      .then(val => {
        if (val) setDirPath(val)
      })
      .catch(() => {})
  }, [])

  const handlePathChange = (value: string) => {
    setDirPath(value)
    // Persist path
    window.electronAPI?.settings.set('game_import_path', value).catch(() => {})
  }

  const handleScan = async () => {
    setError('')
    setResult('')
    setDays([])
    setSelectedDates(new Set())
    setScanning(true)
    try {
      if (!api()) return
      const data = await api()!.scan(dirPath)
      setDays(data.days)
      setTotalMinutes(data.totalMinutes)
      // Default: select only the last (most recent) day
      const lastDay = data.days.length > 0 ? [data.days[data.days.length - 1].date] : []
      setSelectedDates(new Set(lastDay))
    } catch (e: any) {
      setError(e.message || '扫描失败')
    } finally {
      setScanning(false)
    }
  }

  const toggleDate = (date: string) => {
    const next = new Set(selectedDates)
    if (next.has(date)) next.delete(date)
    else next.add(date)
    setSelectedDates(next)
  }

  const toggleAll = () => {
    if (selectedDates.size === days.length) {
      setSelectedDates(new Set())
    } else {
      setSelectedDates(new Set(days.map(d => d.date)))
    }
  }

  const handleImport = async (allDates: boolean) => {
    setError('')
    setResult('')
    try {
      if (!api()) return
      const dates = allDates ? days.map(d => d.date) : Array.from(selectedDates)
      if (dates.length === 0) {
        setError('请至少选择一个日期')
        return
      }
      setImporting(true)
      const res = await api()!.apply(dirPath, dates)
      setResult(`成功导入 ${res.imported} 天的学习记录`)
    } catch (e: any) {
      setError(e.message || '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const formatHours = (min: number) => {
    if (min === 0) return '0h'
    return (min / 60).toFixed(1) + 'h'
  }

  const selectedTotal = days.filter(d => selectedDates.has(d.date)).reduce((sum, d) => sum + d.gameMinutes, 0)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 transition-colors">
        <h3 className="text-sm font-medium text-foreground">导入 Chill with You 游戏记录</h3>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">存档目录</label>
          <div className="flex gap-2">
            <Input
              value={dirPath}
              onChange={e => handlePathChange(e.target.value)}
              placeholder="存档路径: .../LocalLow/Nestopi/Chill With You/SaveData/Release/v2/(SteamID)"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              onClick={handleScan}
              disabled={!dirPath.trim() || scanning}
              className="whitespace-nowrap"
            >
              {scanning ? '扫描中...' : '扫描存档'}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            游戏存档通常位于: %LOCALAPPDATA%Low/Nestopi/Chill With You/SaveData/Release/v2/(SteamID)
          </p>
        </div>
      </div>

      {error && <ErrorBar>{error}</ErrorBar>}
      {result && <SuccessBar>{result}</SuccessBar>}

      {days.length > 0 && (
        <>
          <div className="space-y-2 rounded-lg border border-border bg-card p-4 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">扫描结果（{days.length} 天）</h3>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={selectedDates.size === days.length} onCheckedChange={toggleAll} />
                全选
              </label>
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 border-b border-border pb-1 text-xs text-muted-foreground">
                <span className="col-span-2"></span>
                <span className="col-span-4">日期</span>
                <span className="col-span-3">游戏时长</span>
                <span className="col-span-3">本地已有</span>
              </div>
              {days.map(day => (
                <label
                  key={day.date}
                  className={cn(
                    'grid cursor-pointer grid-cols-12 items-center gap-2 rounded-md px-1 py-1.5 text-sm transition-colors',
                    selectedDates.has(day.date) ? 'bg-primary/10' : 'hover:bg-accent'
                  )}
                >
                  <span className="col-span-2">
                    <Checkbox
                      checked={selectedDates.has(day.date)}
                      onCheckedChange={() => toggleDate(day.date)}
                    />
                  </span>
                  <span className="col-span-4 text-xs text-foreground">{day.date}</span>
                  <span className="col-span-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {formatHours(day.gameMinutes)}
                  </span>
                  <span className="col-span-3 text-xs text-muted-foreground">
                    {formatHours(day.localMinutes)}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">
                已选 {selectedDates.size} 天，共 {formatHours(selectedTotal)}
              </span>
              <span className="text-muted-foreground">扫描总计 {formatHours(totalMinutes)}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={() => handleImport(false)} disabled={selectedDates.size === 0 || importing}>
              {importing ? '导入中...' : '导入选中记录'}
            </Button>
            <Button
              onClick={() => setOverwriteConfirm(true)}
              disabled={importing}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              全部覆盖
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={overwriteConfirm}
        onOpenChange={setOverwriteConfirm}
        title="全部覆盖"
        description={`将用游戏存档记录覆盖全部 ${days.length} 天的本地学习时长，此操作不可撤销。确定继续吗？`}
        confirmText="覆盖导入"
        variant="destructive"
        onConfirm={() => {
          setOverwriteConfirm(false)
          handleImport(true)
        }}
      />
    </div>
  )
}
