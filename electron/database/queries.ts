import dayjs from 'dayjs'
import {
  getData,
  saveData,
  getNextKpId,
  getNextRrId,
  getNextPlanId,
  getNextCompletionId,
  getNextSessionId,
  getNextMistakeId
} from './connection'
import type { KnowledgePointRow, ReviewRecordRow, DailyPlanRow, MistakePointRow } from './connection'
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

/** Default global cap on FSRS review interval (days), used when settings has no override. */
export const DEFAULT_MAX_REVIEW_INTERVAL_DAYS = 28
/** Absolute upper bound for any configurable interval cap (global or per-KP). */
export const ABSOLUTE_MAX_INTERVAL_DAYS = 365

// Shared FSRS scheduler instance — maximum_interval is the loosest bound here;
// the effective cap (global/per-KP setting) is enforced in rateReview.
const scheduler = fsrs({ maximum_interval: ABSOLUTE_MAX_INTERVAL_DAYS })

/** Settings key holding the user-configurable global interval cap. */
const GLOBAL_MAX_INTERVAL_KEY = 'max_review_interval_days'

/** Global interval cap from settings, clamped to [1, ABSOLUTE_MAX_INTERVAL_DAYS]. */
function getGlobalMaxInterval(data: ReturnType<typeof getData>): number {
  const raw = parseInt(data.settings[GLOBAL_MAX_INTERVAL_KEY] ?? '', 10)
  if (!Number.isFinite(raw)) return DEFAULT_MAX_REVIEW_INTERVAL_DAYS
  return Math.min(Math.max(raw, 1), ABSOLUTE_MAX_INTERVAL_DAYS)
}

/** Effective cap for a KP = min(global cap, per-KP cap). Null per-KP cap → global only. */
function getEffectiveMaxInterval(data: ReturnType<typeof getData>, kp: KnowledgePointRow): number {
  const global = getGlobalMaxInterval(data)
  const per = kp.max_interval_days
  if (per !== null && per !== undefined && Number.isFinite(per) && per >= 1) {
    return Math.min(global, Math.floor(per))
  }
  return global
}

/** Map 4-button rating → ts-fsrs Rating enum */
function toFSRSRating(q: number): Rating {
  if (q <= 1) return Rating.Again // 忘 (0/1)
  if (q === 2) return Rating.Hard // 难 (2)
  if (q === 3) return Rating.Good // 过 (3)
  return Rating.Easy // 易 (4)
}

/** Deserialize card_state, falling back to empty card */
function parseCard(kp: KnowledgePointRow): ReturnType<typeof createEmptyCard> {
  if (kp.card_state) {
    try {
      return { ...createEmptyCard(), ...JSON.parse(kp.card_state) }
    } catch {}
  }
  return createEmptyCard()
}

/** Get next_review_date from card's due field */
function cardNextReviewDate(card: ReturnType<typeof createEmptyCard>): string | null {
  if (!card.due) return null
  return dayjs(card.due).format('YYYY-MM-DD')
}

// ---- Knowledge Points ----

export function addKnowledgePoint(content: string, learnDate?: string): { id: number } {
  const data = getData()
  const id = getNextKpId()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  // Validate learnDate, fall back to today if invalid
  const baseDate =
    learnDate && dayjs(learnDate, 'YYYY-MM-DD').isValid()
      ? dayjs(learnDate).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD')

  // FSRS: create fresh card, schedule first review 1 day after learning
  const card = createEmptyCard()
  const firstReviewDate = dayjs(baseDate).add(1, 'day').format('YYYY-MM-DD')

  data.knowledge_points.push({
    id,
    content,
    detail: '',
    learn_date: baseDate,
    created_at: now,
    updated_at: now,
    card_state: JSON.stringify(card),
    max_interval_days: null
  })

  // Generate ONE initial review record
  data.review_records.push({
    id: getNextRrId(),
    knowledge_point_id: id,
    schedule_date: firstReviewDate,
    status: 'pending',
    reviewed_at: null,
    stage: 1,
    quality: null,
    rollback_log: null
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
  card_state: string | null
  max_interval_days: number | null
  effective_max_interval_days: number
  next_review_date: string | null
}> {
  const data = getData()

  return data.knowledge_points
    .map(kp => {
      const records = data.review_records.filter(r => r.knowledge_point_id === kp.id)
      const completed = records.filter(r => r.status === 'completed').length
      const card = parseCard(kp)
      return {
        id: kp.id,
        content: kp.content,
        learn_date: kp.learn_date,
        created_at: kp.created_at,
        updated_at: kp.updated_at,
        completed_stages: completed,
        total_stages: records.length,
        card_state: kp.card_state,
        max_interval_days: kp.max_interval_days ?? null,
        effective_max_interval_days: getEffectiveMaxInterval(data, kp),
        next_review_date: cardNextReviewDate(card)
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
  card_state: string | null
  max_interval_days: number | null
  effective_max_interval_days: number
  next_review_date: string | null
} | null {
  const data = getData()
  const kp = data.knowledge_points.find(k => k.id === id)
  if (!kp) return null

  const records = data.review_records.filter(r => r.knowledge_point_id === id)
  const completed = records.filter(r => r.status === 'completed').length
  const card = parseCard(kp)
  return {
    id: kp.id,
    content: kp.content,
    detail: kp.detail,
    learn_date: kp.learn_date,
    created_at: kp.created_at,
    updated_at: kp.updated_at,
    completed_stages: completed,
    total_stages: records.length,
    card_state: kp.card_state,
    max_interval_days: kp.max_interval_days ?? null,
    effective_max_interval_days: getEffectiveMaxInterval(data, kp),
    next_review_date: cardNextReviewDate(card)
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
  card_state: string | null
  max_interval_days: number | null
  effective_max_interval_days: number
  next_review_date: string | null
}> {
  const data = getData()
  return data.knowledge_points
    .filter(k => k.content.includes(keyword) || k.detail.includes(keyword))
    .map(kp => {
      const records = data.review_records.filter(r => r.knowledge_point_id === kp.id)
      const completed = records.filter(r => r.status === 'completed').length
      const card = parseCard(kp)
      return {
        id: kp.id,
        content: kp.content,
        learn_date: kp.learn_date,
        created_at: kp.created_at,
        updated_at: kp.updated_at,
        completed_stages: completed,
        total_stages: records.length,
        card_state: kp.card_state,
        max_interval_days: kp.max_interval_days ?? null,
        effective_max_interval_days: getEffectiveMaxInterval(data, kp),
        next_review_date: cardNextReviewDate(card)
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// ---- Review Records ----

export function getTodayReviews(): Array<
  ReviewRecordRow & { content: string; card_state: string | null; effective_max_interval_days: number | null }
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
        card_state: kp?.card_state ?? null,
        effective_max_interval_days: kp ? getEffectiveMaxInterval(data, kp) : null
      }
    })
    .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
}

export function getOverdueReviews(): Array<
  ReviewRecordRow & { content: string; card_state: string | null; effective_max_interval_days: number | null }
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
        card_state: kp?.card_state ?? null,
        effective_max_interval_days: kp ? getEffectiveMaxInterval(data, kp) : null
      }
    })
    .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))
}

export function rateReview(
  reviewId: number,
  quality: number,
  customDays?: number
): {
  nextReviewDate: string | null
  nextInterval: number
} {
  // Validate quality range (1-4 for FSRS)
  if (quality < 1 || quality > 4 || !Number.isInteger(quality)) {
    throw new Error('Quality must be an integer between 1 and 4')
  }
  // Custom interval: manual override of the algorithm's next interval, min 1 day.
  // Deliberately NOT capped by the global/per-KP cap — the user chose it by hand.
  const hasCustom = customDays !== undefined && customDays !== null
  if (hasCustom && (!Number.isFinite(customDays!) || customDays! < 1)) {
    throw new Error('Custom interval must be a number >= 1')
  }
  const customInterval = hasCustom ? Math.floor(customDays!) : null

  const data = getData()
  const record = data.review_records.find(r => r.id === reviewId)
  if (!record || record.status !== 'pending') {
    throw new Error('Review record not found or already completed')
  }

  const kp = data.knowledge_points.find(k => k.id === record.knowledge_point_id)

  // Mark current record as completed
  record.status = 'completed'
  record.reviewed_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
  record.quality = quality
  // Clean up any other pending records for this KP (safety net)
  data.review_records = data.review_records.filter(
    r => !(r.knowledge_point_id === record.knowledge_point_id && r.status === 'pending' && r.id !== reviewId)
  )

  if (!kp) {
    saveData()
    return { nextReviewDate: null, nextInterval: 0 }
  }

  // FSRS: schedule next review (updates card state + review log for undo)
  const card = parseCard(kp)
  const now = dayjs().toDate()
  const result = scheduler.next(card, now, toFSRSRating(quality))

  // Effective interval: manual custom value wins; otherwise cap the algorithm's
  // interval at the effective max (global/per-KP). scheduled_days AND due are
  // normalized together so the knowledge list/detail panel (which read card.due)
  // stay consistent with schedule_date.
  const cappedDays =
    customInterval !== null
      ? customInterval
      : Math.min(Math.max(result.card.scheduled_days, 1), getEffectiveMaxInterval(data, kp))
  result.card.scheduled_days = cappedDays
  result.card.due = dayjs(now).add(cappedDays, 'day').toDate()

  // Save updated card state and rollback log
  kp.card_state = JSON.stringify(result.card)
  record.rollback_log = JSON.stringify(result.log)

  // Create next review record (same now + cappedDays → consistent with card.due)
  const nextDate = dayjs(now).add(cappedDays, 'day').format('YYYY-MM-DD')

  data.review_records.push({
    id: getNextRrId(),
    knowledge_point_id: kp.id,
    schedule_date: nextDate,
    status: 'pending',
    reviewed_at: null,
    stage: result.card.reps + 1,
    quality: null,
    rollback_log: null
  })

  saveData()
  return { nextReviewDate: nextDate, nextInterval: cappedDays }
}

/** Undo a completed review, restoring the previous card state.
 *  Requires rollback_log (saved by rateReview) — old ratings cannot be undone. */
export function rollbackReview(reviewId: number): { content: string } {
  const data = getData()
  const record = data.review_records.find(r => r.id === reviewId)
  if (!record) throw new Error('Review record not found')
  if (record.status !== 'completed') throw new Error('Only completed reviews can be rolled back')
  if (!record.rollback_log) throw new Error('This review was completed before the undo feature was added')

  const kp = data.knowledge_points.find(k => k.id === record.knowledge_point_id)
  if (!kp) throw new Error('Knowledge point not found')

  // Parse current card state and the saved review log
  const card = parseCard(kp)
  const log = JSON.parse(record.rollback_log)

  // FSRS rollback: restore previous card state from the log
  const previousCard = scheduler.rollback(card, log)
  kp.card_state = JSON.stringify(previousCard)

  // Delete the pending record that rateReview created for the next review
  const pendingIdx = data.review_records.findIndex(
    r => r.knowledge_point_id === record.knowledge_point_id && r.status === 'pending'
  )
  if (pendingIdx !== -1) data.review_records.splice(pendingIdx, 1)

  // Revert the completed record to pending
  record.status = 'pending'
  record.reviewed_at = null
  record.quality = null
  record.rollback_log = null

  saveData()
  return { content: kp.content }
}

/** Reset a knowledge point's memory state. Deletes all review records
 *  and creates a fresh first-day review using FSRS forget(). */
export function forgetKnowledgePoint(kpId: number): { nextReviewDate: string } {
  const data = getData()
  const kp = data.knowledge_points.find(k => k.id === kpId)
  if (!kp) throw new Error('Knowledge point not found')

  // Delete all review records for this KP
  data.review_records = data.review_records.filter(r => r.knowledge_point_id !== kpId)

  // FSRS forget: reset card state (reset_count=true resets reps to 0)
  const card = parseCard(kp)
  const result = scheduler.forget(card, new Date(), true)

  // Save reset card state
  kp.card_state = JSON.stringify(result.card)

  // Create new review record for today
  const firstReviewDate = dayjs().format('YYYY-MM-DD')
  data.review_records.push({
    id: getNextRrId(),
    knowledge_point_id: kpId,
    schedule_date: firstReviewDate,
    status: 'pending',
    reviewed_at: null,
    stage: 1,
    quality: null,
    rollback_log: null
  })

  saveData()
  return { nextReviewDate: firstReviewDate }
}

/** Set a per-KP interval cap (days), or null to follow the global cap.
 *  If the pending review / card due exceed the new effective cap, they are
 *  immediately re-capped (single-KP variant of the migration cap logic). */
export function setKnowledgePointMaxInterval(
  kpId: number,
  days: number | null
): {
  effectiveMaxIntervalDays: number
} {
  const data = getData()
  const kp = data.knowledge_points.find(k => k.id === kpId)
  if (!kp) throw new Error('Knowledge point not found')

  if (days === null) {
    kp.max_interval_days = null
  } else {
    if (!Number.isFinite(days) || days < 1) {
      throw new Error('间隔上限必须是不小于 1 的天数')
    }
    kp.max_interval_days = Math.min(Math.floor(days), ABSOLUTE_MAX_INTERVAL_DAYS)
  }

  const effective = getEffectiveMaxInterval(data, kp)
  const today = dayjs()
  const capDate = today.add(effective, 'day')

  const record = data.review_records.find(r => r.knowledge_point_id === kpId && r.status === 'pending')
  if (record && dayjs(record.schedule_date).diff(today, 'day') > effective) {
    record.schedule_date = capDate.format('YYYY-MM-DD')
  }

  if (kp.card_state) {
    try {
      const card = JSON.parse(kp.card_state)
      let changed = false
      if (card.due && dayjs(card.due).diff(today, 'day') > effective) {
        card.due = capDate.toDate()
        changed = true
      }
      if (card.scheduled_days && card.scheduled_days > effective) {
        card.scheduled_days = effective
        changed = true
      }
      if (changed) kp.card_state = JSON.stringify(card)
    } catch {
      // skip malformed card_state
    }
  }

  saveData()
  return { effectiveMaxIntervalDays: effective }
}

/** Pure reschedule: move the pending review to a given date without touching
 *  FSRS state or ratings (used by 调度管理 direct reschedule and 提前复习).
 *  Creates a pending record if none exists (legacy "mastered" data). */
export function reschedulePendingReview(kpId: number, date: string): { scheduleDate: string } {
  const data = getData()
  const kp = data.knowledge_points.find(k => k.id === kpId)
  if (!kp) throw new Error('Knowledge point not found')

  const target = dayjs(date, 'YYYY-MM-DD')
  if (!target.isValid()) throw new Error('无效日期')
  const formatted = target.format('YYYY-MM-DD')

  let record = data.review_records.find(r => r.knowledge_point_id === kpId && r.status === 'pending')
  if (!record) {
    record = {
      id: getNextRrId(),
      knowledge_point_id: kpId,
      schedule_date: formatted,
      status: 'pending',
      reviewed_at: null,
      stage: parseCard(kp).reps + 1,
      quality: null,
      rollback_log: null
    }
    data.review_records.push(record)
  } else {
    record.schedule_date = formatted
  }

  // Keep card.due in sync so knowledge list / detail panel show the same date
  if (kp.card_state) {
    try {
      const card = JSON.parse(kp.card_state)
      card.due = target.toDate()
      kp.card_state = JSON.stringify(card)
    } catch {
      // skip malformed card_state
    }
  }

  saveData()
  return { scheduleDate: formatted }
}

export function getPendingReviewCount(): number {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  return data.review_records.filter(r => r.schedule_date <= today && r.status === 'pending').length
}

export function getReviewStats(): {
  total: number
  todayPending: number
  overdue: number
  completed: number
} {
  const data = getData()
  const today = dayjs().format('YYYY-MM-DD')

  const total = data.knowledge_points.length
  const todayPending = data.review_records.filter(
    r => r.schedule_date <= today && r.status === 'pending'
  ).length
  const overdue = data.review_records.filter(r => r.schedule_date < today && r.status === 'pending').length
  const completed = data.review_records.filter(r => r.status === 'completed').length

  return { total, todayPending, overdue, completed }
}

// ---- Mistake Points ----

export function addMistakePoint(content: string): { id: number } {
  const data = getData()
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const id = getNextMistakeId()
  data.mistake_points.push({ id, content, count: 1, created_at: now, updated_at: now })
  saveData()
  return { id }
}

/** List mistake points — higher count first, ties broken by newest. */
export function listMistakePoints(): MistakePointRow[] {
  const data = getData()
  return [...data.mistake_points].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.created_at.localeCompare(a.created_at)
  })
}

export function incrementMistakePoint(id: number): void {
  const data = getData()
  const mp = data.mistake_points.find(m => m.id === id)
  if (!mp) throw new Error('Mistake point not found')
  mp.count += 1
  mp.updated_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
  saveData()
}

export function updateMistakePoint(id: number, content: string): void {
  const data = getData()
  const mp = data.mistake_points.find(m => m.id === id)
  if (!mp) throw new Error('Mistake point not found')
  mp.content = content
  mp.updated_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
  saveData()
}

export function deleteMistakePoint(id: number): void {
  const data = getData()
  data.mistake_points = data.mistake_points.filter(m => m.id !== id)
  saveData()
}

// ---- Daily Plans ----

export function addDailyPlan(
  content: string,
  type: string,
  config?: Record<string, unknown>,
  planDate?: string
): { id: number } {
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
      const completion = data.daily_plan_completions.find(c => c.plan_id === plan.id && c.date === today)
      const days = (plan.config as any).daysOfWeek as number[] | undefined
      const dueToday = plan.type === 'weekly' ? (days ? days.includes(dayOfWeek) : true) : true
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

  const existing = data.daily_plan_completions.find(c => c.plan_id === planId && c.date === today)

  if (existing) {
    // Undo completion
    data.daily_plan_completions = data.daily_plan_completions.filter(c => c.id !== existing.id)
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

export function getMonthStats(
  year: number,
  month: number
): {
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

export function getMonthReviewStats(
  year: number,
  month: number
): {
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
