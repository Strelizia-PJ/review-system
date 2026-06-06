import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import JSON5 from 'json5'
import { getData, saveData, getNextSessionId } from './connection'
import dayjs from 'dayjs'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file
const MAX_FILES = 500

interface ScannedDay {
  date: string
  gameMinutes: number
  localMinutes: number
}

export function scanGameSaves(dirPath: string): {
  days: ScannedDay[]
  totalMinutes: number
} {
  // Validate path
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('存档路径无效')
  }

  const resolvedPath = path.resolve(dirPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error('存档目录不存在: ' + resolvedPath)
  }

  const stat = fs.statSync(resolvedPath)
  if (!stat.isDirectory()) {
    throw new Error('路径不是一个目录: ' + resolvedPath)
  }

  let files: string[]
  try {
    files = fs.readdirSync(resolvedPath).filter(f => f.startsWith('1597634371_') && f.endsWith('.es3'))
  } catch {
    throw new Error('无法读取存档目录: ' + resolvedPath)
  }

  if (files.length === 0) {
    throw new Error('未找到游戏存档文件（1597634371_*.es3）')
  }

  if (files.length > MAX_FILES) {
    throw new Error(`存档文件过多（${files.length}），最多支持 ${MAX_FILES} 个`)
  }

  const allDays: Map<string, number> = new Map()

  for (const file of files) {
    try {
      const filePath = path.join(resolvedPath, file)
      const fileStat = fs.statSync(filePath)
      if (fileStat.size > MAX_FILE_SIZE) {
        continue // Skip oversized files
      }

      const compressed = fs.readFileSync(filePath)
      const decompressed = zlib.gunzipSync(compressed)
      // Fix ES3 unquoted numeric keys: {1:{...} and },2:{...} → {"1":{...} and },"2":{...}
      let raw = decompressed.toString('utf-8')
      raw = raw.replace(/([{,])\s*(\d+)\s*:/g, '$1"$2":')
      const json = JSON5.parse(raw)

      const monthlyData = json['1597634371']
      if (!monthlyData?.value?.DiaryList) continue

      const { Year, Month } = monthlyData.value
      const diary = monthlyData.value.DiaryList

      for (const [dayStr, entry] of Object.entries(diary)) {
        const day = parseInt(dayStr, 10)
        const seconds = (entry as any).WorkTimeSeconds || 0
        if (seconds <= 0) continue

        const minutes = Math.round(seconds / 60)
        const date = `${Year}-${String(Month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        allDays.set(date, (allDays.get(date) || 0) + minutes)
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Build result with local comparison
  const data = getData()
  const sortedDays = Array.from(allDays.entries())
    .sort(([a], [b]) => a.localeCompare(b))

  const days: ScannedDay[] = sortedDays.map(([date, gameMinutes]) => {
    const localMinutes = data.study_sessions
      .filter(s => s.date === date)
      .reduce((sum, s) => sum + s.duration_minutes, 0)
    return { date, gameMinutes, localMinutes }
  })

  const totalMinutes = days.reduce((sum, d) => sum + d.gameMinutes, 0)

  return { days, totalMinutes }
}

export function applyGameData(
  dirPath: string,
  selectedDates: string[]
): { imported: number; overwritten: number } {
  const { days } = scanGameSaves(dirPath)

  const selectedSet = new Set(selectedDates)
  const toImport = days.filter(d => selectedSet.has(d.date))

  if (toImport.length === 0) {
    throw new Error('没有可导入的记录')
  }

  const data = getData()

  // Count and remove existing records for selected dates
  const overwrittenCount = data.study_sessions.filter(
    s => selectedSet.has(s.date)
  ).length
  data.study_sessions = data.study_sessions.filter(
    s => !selectedSet.has(s.date)
  )

  // Insert game data
  for (const day of toImport) {
    data.study_sessions.push({
      id: getNextSessionId(),
      date: day.date,
      duration_minutes: day.gameMinutes,
      created_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    })
  }

  saveData()
  return { imported: toImport.length, overwritten: overwrittenCount }
}
