import dayjs from 'dayjs'
import { getData, saveData, getNextKpId, getNextRrId, getNextPlanId, getNextCompletionId, getNextSessionId } from './connection'
import type { KnowledgePointRow, ReviewRecordRow, DailyPlanRow } from './connection'

// SM-2 algorithm constants (modified for stronger quality differentiation)
const SM2_INITIAL_EF = 2.5
const SM2_MIN_EF = 1.3
const SM2_MAX_EF = 3.0
const SM2_MAX_INTERVAL = 28

/** Quality → interval multiplier for successful recall (reviewCount >= 2) */
function multiplier(q: number): number {
  if (q === 5) return 2.5
  if (q === 4) return 2.0
  return 1.5 // q === 3
}

/** Quality → EF delta for successful recall */
function deltaEf(q: number): number {
  if (q === 5) return 0.15
  if (q === 4) return 0.10
  return 0 // q === 3
}

/**
 * SM-2 spaced repetition with tiered quality differentiation.
 * High quality (4-5): interval grows fast, EF rises.
 * Low quality (3): interval grows slowly, EF stays flat.
 * Failed (<3): interval reset to 1 day, EF penalized.
 *
 * @param ef         Current easiness factor (1.3 ~ 3.0)
 * @param reviewCount  Consecutive successful reviews
 * @param lastInterval  Days of the previous interval
 * @param quality  0-5 rating
 * @returns Updated { ef, interval, reviewCount }
 */
function calculateSM2(
  ef: number,
  reviewCount: number,
  lastInterval: number,
  quality: number
): { ef: number; interval: number; reviewCount: number } {
  if (quality >= 3) {
    // Successful recall
    let interval: number
    if (reviewCount === 0) {
      interval = 1
    } else if (reviewCount === 1) {
      interval = 3
    } else {
      interval = Math.round(lastInterval * multiplier(quality))
    }
    interval = Math.min(SM2_MAX_INTERVAL, interval)

    let newEf = ef + deltaEf(quality)
    newEf = Math.min(SM2_MAX_EF, Math.max(SM2_MIN_EF, newEf))

    return { ef: newEf, interval, reviewCount: reviewCount + 1 }
  } else {
    // Failed recall — reset interval, penalize EF
    let newEf: number
    if (quality === 0) newEf = SM2_INITIAL_EF
    else if (quality === 1) newEf = Math.max(SM2_MIN_EF, ef - 0.3)
    else newEf = Math.max(SM2_MIN_EF, ef - 0.2)
    return { ef: newEf, interval: 1, reviewCount: 0 }
  }
}

// ---- Knowledge Points ----

export function addKnowledgePoint(content: string, learnDate?: string): { id: number } {
  const data = getData()
  const id = getNextKpId()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  // Validate learnDate, fall back to today if invalid
  const baseDate = (learnDate && dayjs(learnDate, 'YYYY-MM-DD').isValid())
    ? dayjs(learnDate).format('YYYY-MM-DD')
    : dayjs().format('YYYY-MM-DD')

  // SM-2: first review scheduled 1 day after learning
  const firstReviewDate = dayjs(baseDate).add(1, 'day').format('YYYY-MM-DD')

  data.knowledge_points.push({
    id,
    content,
    detail: '',
    learn_date: baseDate,
    created_at: now,
    updated_at: now,
    ef: SM2_INITIAL_EF,
    review_count: 0,
    next_review_date: firstReviewDate,
    last_interval: 1
  })

  // Generate exactly ONE initial review record (not 8)
  data.review_records.push({
    id: getNextRrId(),
    knowledge_point_id: id,
    schedule_date: firstReviewDate,
    status: 'pending',
    reviewed_at: null,
    stage: 1,
    quality: null
  })

  saveData()
  return { id }
}

export function listKnowledgePoints(): Array<{
  id: number
  content: string
  learn_date: string
  created_at: string
  updated_at: string
  completed_stages: number
  total_stages: number
  ef: number
  review_count: number
  next_review_date: string | null
  last_interval: number
}> {
  const data = getData()

  return data.knowledge_points
    .map(kp => {
      const records = data.review_records.filter(r => r.knowledge_point_id === kp.id)
      const completed = records.filter(r => r.status === 'completed').length
      return {
        id: kp.id,
        content: kp.content,
        learn_date: kp.learn_date,
        created_at: kp.created_at,
        updated_at: kp.updated_at,
        completed_stages: completed,
        total_stages: records.length,
        ef: kp.ef,
        review_count: kp.review_count,
        next_review_date: kp.next_review_date,
        last_interval: kp.last_interval
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getKnowledgePointById(id: number): {
  id: number
  content: string
  detail: string
  learn_date: string
  created_at: string
  updated_at: string
  completed_stages: number
  total_stages: number
  ef: number
  review_count: number
  next_review_date: string | null
  last_interval: number
} | null {
  const data = getData()
  const kp = data.knowledge_points.find(k => k.id === id)
  if (!kp) return null

  const records = data.review_records.filter(r => r.knowledge_point_id === id)
  const completed = records.filter(r => r.status === 'completed').length
  return {
    id: kp.id,
    content: kp.content,
    detail: kp.detail,
    learn_date: kp.learn_date,
    created_at: kp.created_at,
    updated_at: kp.updated_at,
    completed_stages: completed,
    total_stages: records.length,
    ef: kp.ef,
    review_count: kp.review_count,
    next_review_date: kp.next_review_date,
    last_interval: kp.last_interval
  }
}

export function deleteKnowledgePoint(id: number): void {
  const data = getData()
  data.knowledge_points = data.knowledge_points.filter(k => k.id !== id)
  data.review_records = data.review_records.filter(r => r.knowledge_point_id !== id)
  saveData()
}

export function updateKnowledgePoint(id: number, content?: string, detail?: string): void {
  const data = getData()
  const kp = data.knowledge_points.find(k => k.id === id)
  if (kp) {
    if (content !== undefined) kp.content = content
    if (detail !== undefined) kp.detail = detail
    kp.updated_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
    saveData()
  }
}

export function searchKnowledgePoints(keyword: string): Array<{
  id: number
  content: string
  learn_date: string
  created_at: string
  updated_at: string
  completed_stages: number
  total_stages: number
  ef: number
  review_count: number
  next_review_date: string | null
  last_interval: number
}> {
  const data = getData()
  return data.knowledge_points
    .filter(k => k.content.includes(keyword) || k.detail.includes(keyword))
    .map(kp => {
      const records = data.review_records.filter(r => r.knowledge_point_id === kp.id)
      const completed = records.filter(r => r.status === 'completed').length
      return {
        id: kp.id,
        content: kp.content,
        learn_date: kp.learn_date,
        created_at: kp.created_at,
        updated_at: kp.updated_at,
        completed_stages: completed,
        total_stages: records.length,
        ef: kp.ef,
        review_count: kp.review_count,
        next_review_date: kp.next_review_date,
        last_interval: kp.last_interval
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// ---- Review Records ----

export function getTodayReviews(): Array<
  ReviewRecordRow & { content: string; ef: number; review_count: number; last_interval: number }
> {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  return data.review_records
    .filter(r => r.schedule_date <= today && r.status === 'pending')
    .map(r => {
      const kp = data.knowledge_points.find(k => k.id === r.knowledge_point_id)
      return {
        ...r,
        content: kp?.content || '(已删除)',
        ef: kp?.ef ?? 2.5,
        review_count: kp?.review_count ?? 0,
        last_interval: kp?.last_interval ?? 1
      }
    })
    .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
}

export function getOverdueReviews(): Array<
  ReviewRecordRow & { content: string; ef: number; review_count: number; last_interval: number }
> {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  return data.review_records
    .filter(r => r.schedule_date < today && r.status === 'pending')
    .map(r => {
      const kp = data.knowledge_points.find(k => k.id === r.knowledge_point_id)
      return {
        ...r,
        content: kp?.content || '(已删除)',
        ef: kp?.ef ?? 2.5,
        review_count: kp?.review_count ?? 0,
        last_interval: kp?.last_interval ?? 1
      }
    })
    .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
}

export function rateReview(reviewId: number, quality: number): {
  nextReviewDate: string | null
  nextInterval: number
} {
  // Validate quality range
  if (quality < 0 || quality > 5 || !Number.isInteger(quality)) {
    throw new Error('Quality must be an integer between 0 and 5')
  }

  const data = getData()
  const record = data.review_records.find(r => r.id === reviewId)
  if (!record || record.status !== 'pending') {
    throw new Error('Review record not found or already completed')
  }

  const kp = data.knowledge_points.find(k => k.id === record.knowledge_point_id)

  // Mark current record as completed with quality rating
  record.status = 'completed'
  record.reviewed_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
  record.quality = quality

  // Clean up any other pending records for this KP (safety net)
  data.review_records = data.review_records.filter(r =>
    !(r.knowledge_point_id === record.knowledge_point_id && r.status === 'pending' && r.id !== reviewId)
  )

  if (!kp) {
    // Orphan record (KP was deleted) — just mark completed, no SM-2
    saveData()
    return { nextReviewDate: null, nextInterval: 0 }
  }

  // Calculate next SM-2 interval
  const today = dayjs().format('YYYY-MM-DD')
  const { ef: newEf, interval, reviewCount: newCount } = calculateSM2(
    kp.ef,
    kp.review_count,
    kp.last_interval,
    quality
  )

  // Update KP state
  kp.ef = newEf
  kp.review_count = newCount
  kp.last_interval = interval
  const nextDate = dayjs(today).add(interval, 'day').format('YYYY-MM-DD')
  kp.next_review_date = nextDate

  // Create next review record
  data.review_records.push({
    id: getNextRrId(),
    knowledge_point_id: kp.id,
    schedule_date: nextDate,
    status: 'pending',
    reviewed_at: null,
    stage: newCount + 1,
    quality: null
  })

  saveData()
  return { nextReviewDate: nextDate, nextInterval: interval }
}

export function getPendingReviewCount(): number {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  return data.review_records.filter(
    r => r.schedule_date <= today && r.status === 'pending'
  ).length
}

export function getReviewStats(): {
  total: number
  todayPending: number
  overdue: number
  completed: number
  mastered: number
} {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  const total = data.knowledge_points.length
  const todayPending = data.review_records.filter(
    r => r.schedule_date <= today && r.status === 'pending'
  ).length
  const overdue = data.review_records.filter(
    r => r.schedule_date < today && r.status === 'pending'
  ).length
  const completed = data.review_records.filter(
    r => r.status === 'completed'
  ).length
  const mastered = data.knowledge_points.filter(
    k => k.review_count > 0 &&
      !data.review_records.some(r => r.knowledge_point_id === k.id && r.status === 'pending')
  ).length

  return { total, todayPending, overdue, completed, mastered }
}

// ---- Daily Plans ----

export function addDailyPlan(content: string, type: string, config?: Record<string, unknown>, planDate?: string): { id: number } {
  const data = getData()
  const id = getNextPlanId()

  data.daily_plans.push({
    id,
    content,
    type: type as DailyPlanRow['type'],
    config: config || {},
    plan_date: planDate || dayjs().format('YYYY-MM-DD'),
    created_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
  })

  saveData()
  return { id }
}

export function getTodayPlans(): Array<{
  id: number
  content: string
  type: string
  config: Record<string, unknown>
  completed: boolean
  dueToday: boolean
}> {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')
  const dayOfWeek = dayjs(today).day() // 0=Sun, 1=Mon, ..., 6=Sat

  return data.daily_plans
    .map(plan => {
      const completion = data.daily_plan_completions.find(
        c => c.plan_id === plan.id && c.date === today
      )
      const days = (plan.config as any).daysOfWeek as number[] | undefined
      const dueToday = plan.type === 'weekly'
        ? (days ? days.includes(dayOfWeek) : true)
        : true
      return { ...plan, completed: !!completion, dueToday }
    })
    .filter(plan => {
      // Hide completed one-time tasks
      if (plan.type === 'one-time' && plan.completed) return false

      // Interval: show only on days that are multiples of intervalDays from created_at
      if (plan.type === 'interval') {
        const intervalDays = (plan.config as any).intervalDays as number | undefined
        if (intervalDays && intervalDays > 0) {
          const daysSinceCreation = dayjs(today).diff(dayjs(plan.created_at.substring(0, 10)), 'day')
          if (daysSinceCreation % intervalDays !== 0) return false
        }
      }

      return true
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return b.created_at.localeCompare(a.created_at)
    })
}

export function togglePlanCompletion(planId: number): void {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  const existing = data.daily_plan_completions.find(
    c => c.plan_id === planId && c.date === today
  )

  if (existing) {
    // Undo completion
    data.daily_plan_completions = data.daily_plan_completions.filter(
      c => c.id !== existing.id
    )
  } else {
    // Mark complete
    data.daily_plan_completions.push({
      id: getNextCompletionId(),
      plan_id: planId,
      date: today,
      completed_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    })
  }

  saveData()
}

export function deleteDailyPlan(id: number): void {
  const data = getData()
  data.daily_plans = data.daily_plans.filter(p => p.id !== id)
  data.daily_plan_completions = data.daily_plan_completions.filter(c => c.plan_id !== id)
  saveData()
}

// ---- Study Sessions ----

export function addStudySession(date: string, durationMinutes: number): void {
  const data = getData()
  data.study_sessions.push({
    id: getNextSessionId(),
    date,
    duration_minutes: durationMinutes,
    created_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
  })
  saveData()
}

export function getWeekStats(): {
  days: { date: string; dayOfWeek: string; minutes: number }[]
  total: number
  avg: number
} {
  const data = getData()
  const startOfWeek = dayjs().startOf('week').add(1, 'day') // Monday
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    weekDays.push(startOfWeek.add(i, 'day').format('YYYY-MM-DD'))
  }

  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const days = weekDays.map((date, idx) => {
    const minutes = data.study_sessions
      .filter(s => s.date === date)
      .reduce((sum, s) => sum + s.duration_minutes, 0)
    return { date, dayOfWeek: dayLabels[idx], minutes }
  })

  const total = days.reduce((sum, d) => sum + d.minutes, 0)
  const activeDays = days.filter(d => d.minutes > 0).length
  const avg = activeDays > 0 ? Math.round(total / 7) : 0

  return { days, total, avg }
}

export function getRecent7DaysStats(): {
  days: { date: string; minutes: number }[]
  avg: number
} {
  const data = getData()
  const days: { date: string; minutes: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    const minutes = data.study_sessions
      .filter(s => s.date === date)
      .reduce((sum, s) => sum + s.duration_minutes, 0)
    days.push({ date, minutes })
  }

  const total = days.reduce((sum, d) => sum + d.minutes, 0)
  const avg = Math.round(total / 7)

  return { days, avg }
}

export function getMonthStats(year: number, month: number): {
  days: { date: string; minutes: number }[]
  total: number
  avg: number
} {
  const data = getData()
  const startOfMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const daysInMonth = startOfMonth.daysInMonth()
  const days: { date: string; minutes: number }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = startOfMonth.date(d).format('YYYY-MM-DD')
    const minutes = data.study_sessions
      .filter(s => s.date === date)
      .reduce((sum, s) => sum + s.duration_minutes, 0)
    days.push({ date, minutes })
  }

  const total = days.reduce((sum, d) => sum + d.minutes, 0)
  // For current month, divide by days elapsed so far; for past months, divide by total days
  const now = dayjs()
  const isCurrentMonth = now.year() === year && now.month() + 1 === month
  const dayCount = isCurrentMonth ? Math.min(now.date(), daysInMonth) : daysInMonth
  const avg = dayCount > 0 ? Math.round(total / dayCount) : 0

  return { days, total, avg }
}

// ---- Review Activity per Month (for calendar overlay) ----

export function getMonthReviewStats(year: number, month: number): {
  days: { date: string; completedCount: number }[]
  total: number
} {
  const data = getData()
  const startOfMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const daysInMonth = startOfMonth.daysInMonth()
  const days: { date: string; completedCount: number }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = startOfMonth.date(d).format('YYYY-MM-DD')
    const count = data.review_records.filter(
      r => r.status === 'completed' && r.reviewed_at?.startsWith(date)
    ).length
    days.push({ date, completedCount: count })
  }

  const total = days.reduce((sum, d) => sum + d.completedCount, 0)

  return { days, total }
}
