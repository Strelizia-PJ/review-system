import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface DailyPlanRow {
  id: number
  content: string
  type: 'one-time' | 'daily' | 'weekly' | 'interval'
  config: Record<string, unknown>
  plan_date: string
  created_at: string
}

export interface DailyPlanCompletionRow {
  id: number
  plan_id: number
  date: string
  completed_at: string
}

export interface StudySessionRow {
  id: number
  date: string
  duration_minutes: number
  created_at: string
}

export interface MistakePointRow {
  id: number
  content: string
  count: number
  created_at: string
  updated_at: string
}

/** Mistake-type catalog entries share the exact shape of mistake points. */
export type MistakeTypeRow = MistakePointRow

export interface AppData {
  schema_version: number
  knowledge_points: KnowledgePointRow[]
  review_records: ReviewRecordRow[]
  daily_plans: DailyPlanRow[]
  daily_plan_completions: DailyPlanCompletionRow[]
  study_sessions: StudySessionRow[]
  mistake_points: MistakePointRow[]
  mistake_types: MistakeTypeRow[]
  settings: Record<string, string>
}

export interface KnowledgePointRow {
  id: number
  content: string
  detail: string
  learn_date: string
  created_at: string
  updated_at: string
  // FSRS card state (serialized ts-fsrs Card, added in schema v8)
  card_state: string | null
  // Per-KP cap on review interval in days, null = follow the global cap (added in schema v12)
  max_interval_days: number | null
}

export interface ReviewRecordRow {
  id: number
  knowledge_point_id: number
  schedule_date: string
  status: 'pending' | 'completed' | 'overdue'
  reviewed_at: string | null
  stage: number
  quality: number | null // 1-4 FSRS recall quality, null = unrated
  rollback_log: string | null // serialized ts-fsrs ReviewLog, set on rating for undo support
}

/** Bump when adding a migration in migrations.ts; migrations run up to this version. */
export const CURRENT_SCHEMA_VERSION = 14

const DEFAULT_DATA: AppData = {
  schema_version: CURRENT_SCHEMA_VERSION,
  knowledge_points: [],
  review_records: [],
  daily_plans: [],
  daily_plan_completions: [],
  study_sessions: [],
  mistake_points: [],
  mistake_types: [],
  settings: {}
}

let data: AppData | null = null
let dbPath: string = ''
let nextKpId = 1
let nextRrId = 1
let nextPlanId = 1
let nextCompletionId = 1
let nextSessionId = 1
let nextMistakeId = 1
let nextMistakeTypeId = 1

export function getDbPath(): string {
  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'data.json')
  }
  return dbPath
}

function tryReadJSON(filePath: string): AppData | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    // Validate top-level shape to avoid runtime crashes
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray(parsed.knowledge_points) ||
      !Array.isArray(parsed.review_records) ||
      !Array.isArray(parsed.daily_plans) ||
      !Array.isArray(parsed.daily_plan_completions) ||
      !Array.isArray(parsed.study_sessions) ||
      typeof parsed.settings !== 'object' ||
      parsed.settings === null
    ) {
      console.error('Data file has invalid shape, treating as corrupt')
      return null
    }
    return parsed as AppData
  } catch (e) {
    console.error('Failed to read data file:', e)
    return null
  }
}

export function loadData(): AppData {
  const filePath = getDbPath()
  const bakPath = filePath + '.bak'

  data = tryReadJSON(filePath)

  if (!data) {
    // Try backup
    data = tryReadJSON(bakPath)
  }

  if (!data) {
    data = JSON.parse(JSON.stringify(DEFAULT_DATA))
    saveData()
  }

  // Normalize collections added after the strict shape validation (old data
  // files won't have them — they must not be treated as corrupt)
  if (!Array.isArray(data.mistake_points)) {
    data.mistake_points = []
  }
  if (!Array.isArray(data.mistake_types)) {
    data.mistake_types = []
  }

  // Initialize ID counters (filter out NaN/corrupted IDs)
  const validNum = (n: unknown): n is number => typeof n === 'number' && !isNaN(n)
  const maxId = (arr: { id: number }[]) => {
    const ids = arr.map(x => x.id).filter(validNum)
    return ids.length > 0 ? Math.max(...ids) + 1 : undefined
  }

  const kpNext = maxId(data!.knowledge_points)
  if (kpNext !== undefined) nextKpId = kpNext
  const rrNext = maxId(data!.review_records)
  if (rrNext !== undefined) nextRrId = rrNext
  if (data!.daily_plans) {
    const pNext = maxId(data!.daily_plans)
    if (pNext !== undefined) nextPlanId = pNext
  }
  if (data!.daily_plan_completions) {
    const cNext = maxId(data!.daily_plan_completions)
    if (cNext !== undefined) nextCompletionId = cNext
  }
  if (data!.study_sessions) {
    const sNext = maxId(data!.study_sessions)
    if (sNext !== undefined) nextSessionId = sNext
  }
  if (data!.mistake_points) {
    const mNext = maxId(data!.mistake_points)
    if (mNext !== undefined) nextMistakeId = mNext
  }
  if (data!.mistake_types) {
    const mtNext = maxId(data!.mistake_types)
    if (mtNext !== undefined) nextMistakeTypeId = mtNext
  }

  return data!
}

export function getData(): AppData {
  if (!data) {
    return loadData()
  }
  return data!
}

export function saveData(): void {
  if (!data) return

  const filePath = getDbPath()
  const tmpPath = filePath + '.tmp'
  const bakPath = filePath + '.bak'

  // Atomic write: tmp → rename to real
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')

  try {
    if (fs.existsSync(bakPath)) {
      fs.unlinkSync(bakPath)
    }
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, bakPath)
    }
    fs.renameSync(tmpPath, filePath)
  } catch {
    // If rename chain fails, try direct rename of tmp
    try {
      if (fs.existsSync(tmpPath)) {
        fs.renameSync(tmpPath, filePath)
      }
    } catch {
      // Best effort — tmp may remain but data was written
      console.error('Failed to rename temp data file — data may be lost on next restart')
    }
  }
}

export function getNextKpId(): number {
  return nextKpId++
}

export function getNextRrId(): number {
  return nextRrId++
}

export function getNextPlanId(): number {
  return nextPlanId++
}

export function getNextCompletionId(): number {
  return nextCompletionId++
}

export function getNextSessionId(): number {
  return nextSessionId++
}

export function getNextMistakeId(): number {
  return nextMistakeId++
}

export function getNextMistakeTypeId(): number {
  return nextMistakeTypeId++
}
