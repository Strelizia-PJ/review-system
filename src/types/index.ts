export interface KnowledgePoint {
  id: number
  content: string
  detail?: string
  learn_date: string
  created_at: string
  updated_at: string
  completed_stages: number
  total_stages: number
  // SM-2 fields
  ef: number
  review_count: number
  next_review_date: string | null
  last_interval: number
}

export interface KnowledgePointDetail {
  id: number
  content: string
  detail: string
  learn_date: string
  created_at: string
  updated_at: string
  completed_stages: number
  total_stages: number
  // SM-2 fields
  ef: number
  review_count: number
  next_review_date: string | null
  last_interval: number
}

export interface ReviewRecord {
  id: number
  knowledge_point_id: number
  schedule_date: string
  status: 'pending' | 'completed' | 'overdue'
  reviewed_at: string | null
  stage: number
  content: string
  quality: number | null
  // SM-2 preview fields (from joined knowledge point)
  ef?: number
  review_count?: number
  last_interval?: number
}

export interface ReviewStats {
  total: number
  todayPending: number
  overdue: number
  completed: number
  mastered: number
}

export type NavPage = 'knowledge' | 'today' | 'overdue' | 'plans' | 'pomodoro' | 'study-stats' | 'import' | 'stats'

export interface DailyPlan {
  id: number
  content: string
  type: 'one-time' | 'daily' | 'weekly' | 'interval'
  config: Record<string, unknown>
  completed: boolean
  dueToday?: boolean
}

export interface WeekDayStat {
  date: string
  dayOfWeek: string
  minutes: number
}

export interface WeekStats {
  days: WeekDayStat[]
  total: number
  avg: number
}

export interface RecentDayStat {
  date: string
  minutes: number
}

export interface Recent7Stats {
  days: RecentDayStat[]
  avg: number
}

export interface MonthDayStat {
  date: string
  minutes: number
}

export interface MonthStats {
  days: MonthDayStat[]
  total: number
  avg: number
}

export interface MonthReviewDayStat {
  date: string
  completedCount: number
}

export interface MonthReviewStats {
  days: MonthReviewDayStat[]
  total: number
}

export interface ScannedGameDay {
  date: string
  gameMinutes: number
  localMinutes: number
}

export interface ScannedGameData {
  days: ScannedGameDay[]
  totalMinutes: number
}
