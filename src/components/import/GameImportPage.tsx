import { useState, useEffect } from 'react'

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

  const api = () => window.electronAPI?.import

  // Load saved path on mount
  useEffect(() => {
    window.electronAPI?.settings.get('game_import_path').then(val => {
      if (val) setDirPath(val)
    }).catch(() => {})
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

  const selectedTotal = days
    .filter(d => selectedDates.has(d.date))
    .reduce((sum, d) => sum + d.gameMinutes, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-3 transition-colors">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">导入 Chill with You 游戏记录</h3>

        <div>
          <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">存档目录</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={dirPath}
              onChange={e => handlePathChange(e.target.value)}
              placeholder="存档路径: .../LocalLow/Nestopi/Chill With You/SaveData/Release/v2/(SteamID)"
              className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100"
            />
            <button
              onClick={handleScan}
              disabled={!dirPath.trim() || scanning}
              className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {scanning ? '扫描中...' : '扫描存档'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            游戏存档通常位于: %LOCALAPPDATA%Low/Nestopi/Chill With You/SaveData/Release/v2/(SteamID)
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
          {result}
        </div>
      )}

      {days.length > 0 && (
        <>
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                扫描结果（{days.length} 天）
              </h3>
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDates.size === days.length}
                  onChange={toggleAll}
                  className="rounded"
                />
                全选
              </label>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 dark:text-gray-500 pb-1 border-b border-gray-100 dark:border-gray-700">
                <span className="col-span-2"></span>
                <span className="col-span-4">日期</span>
                <span className="col-span-3">游戏时长</span>
                <span className="col-span-3">本地已有</span>
              </div>
              {days.map(day => (
                <label
                  key={day.date}
                  className={`grid grid-cols-12 gap-2 items-center text-sm py-1.5 px-1 rounded cursor-pointer transition-colors ${
                    selectedDates.has(day.date)
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="col-span-2">
                    <input
                      type="checkbox"
                      checked={selectedDates.has(day.date)}
                      onChange={() => toggleDate(day.date)}
                      className="rounded"
                    />
                  </span>
                  <span className="col-span-4 text-gray-700 dark:text-gray-200 text-xs">{day.date}</span>
                  <span className="col-span-3 text-xs font-medium text-green-600 dark:text-green-400">
                    {formatHours(day.gameMinutes)}
                  </span>
                  <span className="col-span-3 text-xs text-gray-400 dark:text-gray-500">
                    {formatHours(day.localMinutes)}
                  </span>
                </label>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                已选 {selectedDates.size} 天，共 {formatHours(selectedTotal)}
              </span>
              <span className="text-gray-400 dark:text-gray-500">
                扫描总计 {formatHours(totalMinutes)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => handleImport(false)}
              disabled={selectedDates.size === 0 || importing}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors font-medium"
            >
              {importing ? '导入中...' : '导入选中记录'}
            </button>
            <button
              onClick={() => handleImport(true)}
              disabled={importing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors font-medium"
            >
              全部覆盖
            </button>
          </div>
        </>
      )}
    </div>
  )
}
