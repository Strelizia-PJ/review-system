export interface KnowledgePoint {
  id: number
  content: string
  detail?: string
  learn_date: string
  created_at: string
  updated_at: string
  completed_stages: number
  total_stages: number
  card_state: string | null
  max_interval_days: number | null
  effective_max_interval_days: number
  next_review_date: string | null
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
  card_state: string | null
  max_interval_days: number | null
  effective_max_interval_days: number
  next_review_date: string | null
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
  card_state?: string | null
  effective_max_interval_days?: number | null
}

export interface ReviewStats {
  total: number
  todayPending: number
  overdue: number
  completed: number
}

export type NavPage =
  | 'knowledge'
  | 'today'
  | 'mistakes'
  | 'manage'
  | 'plans'
  | 'pomodoro'
  | 'study-stats'
  | 'import'
  | 'stats'
  | 'settings'

export interface MistakePoint {
  id: number
  content: string
  count: number
  created_at: string
  updated_at: string
}

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
