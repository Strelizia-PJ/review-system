import { getData, saveData, CURRENT_SCHEMA_VERSION } from './connection'
import { createEmptyCard } from 'ts-fsrs'
import dayjs from 'dayjs'
import { DEFAULT_MAX_REVIEW_INTERVAL_DAYS } from './queries'

const migrations: Record<number, () => void> = {
  2: () => {
    const data = getData()
    for (const kp of data.knowledge_points) {
      if ((kp as any).detail === undefined) {
        ;(kp as any).detail = ''
      }
    }
  },
  3: () => {
    const data = getData()
    if (!(data as any).daily_plans) {
      ;(data as any).daily_plans = []
    }
    if (!(data as any).daily_plan_completions) {
      ;(data as any).daily_plan_completions = []
    }
  },
  4: () => {
    const data = getData()
    if (!(data as any).study_sessions) {
      ;(data as any).study_sessions = []
    }
  },
  5: () => {
    const data = getData()
    // Add learn_date to existing knowledge points
    for (const kp of data.knowledge_points) {
      if (!(kp as any).learn_date) {
        ;(kp as any).learn_date = (kp.created_at || '').substring(0, 10)
      }
    }
    // Add config to existing daily plans
    for (const plan of data.daily_plans) {
      if (!(plan as any).config) {
        ;(plan as any).config = {}
      }
    }
  },
  6: () => {
    const data = getData()
    const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30, 90, 180]

    for (const kp of data.knowledge_points) {
      // Initialize SM-2 fields
      kp.ef = 2.5
      kp.review_count = 0
      kp.next_review_date = null
      kp.last_interval = 0

      const records = data.review_records
        .filter(r => r.knowledge_point_id === kp.id)
        .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date))

      // Count completed reviews from pre-existing Ebbinghaus records
      const completedCount = records.filter(r => r.status === 'completed').length
      kp.review_count = completedCount

      // Find pending records — keep only the earliest one
      const pendingRecords = records.filter(r => r.status === 'pending')
      if (pendingRecords.length > 0) {
        const earliest = pendingRecords[0]
        kp.next_review_date = earliest.schedule_date
        kp.last_interval = completedCount === 0 ? 1 : EBBINGHAUS_INTERVALS[Math.min(completedCount - 1, 7)]

        // Remove stale pre-generated Ebbinghaus records (keep only earliest pending)
        const keepIds = new Set([earliest.id])
        data.review_records = data.review_records.filter(
          r => r.knowledge_point_id !== kp.id || r.status !== 'pending' || keepIds.has(r.id)
        )
      }
      // If no pending records and all completed → next_review_date stays null (mastered)
    }

    // Add quality field to all existing review_records
    for (const rec of data.review_records) {
      if ((rec as any).quality === undefined) {
        ;(rec as any).quality = null
      }
    }
  },
  7: () => {
    const data = getData()
    // Backfill plan_date for existing daily plans
    for (const plan of data.daily_plans) {
      if (!(plan as any).plan_date) {
        ;(plan as any).plan_date = (plan.created_at || '').substring(0, 10)
      }
    }
  },
  8: () => {
    const data = getData()
    for (const kp of data.knowledge_points) {
      const card = createEmptyCard()
      // Migrate SM-2 state → FSRS Card
      const reviews = (kp as any).review_count ?? 0
      const lastInterval = (kp as any).last_interval ?? 1

      // Set review state based on existing SM-2 data
      if (reviews > 0) {
        // CardState values: New=0, Learning=1, Review=2, Relearning=3
        card.state = 2 // Review
        card.reps = reviews
        card.stability = Math.max(lastInterval, 0.5)
        card.last_review = kp.updated_at ? new Date(kp.updated_at) : new Date()
      }
      // If no reviews yet, keep as New state with default card

      kp.card_state = JSON.stringify(card)

      // Clean up old SM-2 fields
      delete (kp as any).ef
      delete (kp as any).review_count
      delete (kp as any).next_review_date
      delete (kp as any).last_interval
    }
  },
  // 9/10/11 were originally three stacked patches doing the same cap; they share
  // one idempotent body now. Keeping the version keys preserves upgrade paths
  // for any data file still sitting at v8/v9/v10.
  9: capReviewIntervals,
  10: capReviewIntervals,
  11: capReviewIntervals,
  12: () => {
    const data = getData()
    for (const kp of data.knowledge_points) {
      if (kp.max_interval_days === undefined) {
        kp.max_interval_days = null
      }
    }
  },
  13: () => {
    const data = getData()
    if (!Array.isArray((data as any).mistake_points)) {
      ;(data as any).mistake_points = []
    }
  },
  14: () => {
    const data = getData()
    if (!Array.isArray((data as any).mistake_types)) {
      ;(data as any).mistake_types = []
    }
  }
}

/** Cap pending review schedules and card states at DEFAULT_MAX_REVIEW_INTERVAL_DAYS,
 *  so the UI "下次复习" never exceeds the cap. Idempotent. */
function capReviewIntervals(): void {
  const data = getData()
  const today = dayjs()
  const capDate = today.add(DEFAULT_MAX_REVIEW_INTERVAL_DAYS, 'day')

  for (const record of data.review_records) {
    if (record.status !== 'pending') continue
    if (dayjs(record.schedule_date).diff(today, 'day') > DEFAULT_MAX_REVIEW_INTERVAL_DAYS) {
      record.schedule_date = capDate.format('YYYY-MM-DD')
    }
  }

  // Cap card_state.due / scheduled_days so the knowledge list & detail panel
  // (which read from card.due) stay consistent with schedule_date
  for (const kp of data.knowledge_points) {
    if (!kp.card_state) continue
    try {
      const card = JSON.parse(kp.card_state)
      let changed = false
      if (card.due && dayjs(card.due).diff(today, 'day') > DEFAULT_MAX_REVIEW_INTERVAL_DAYS) {
        card.due = capDate.toDate()
        changed = true
      }
      if (card.scheduled_days && card.scheduled_days > DEFAULT_MAX_REVIEW_INTERVAL_DAYS) {
        card.scheduled_days = DEFAULT_MAX_REVIEW_INTERVAL_DAYS
        changed = true
      }
      if (changed) kp.card_state = JSON.stringify(card)
    } catch {
      // skip malformed card_state
    }
  }
}

export function runMigrations(): void {
  const data = getData()

  if (data.schema_version >= CURRENT_SCHEMA_VERSION) return

  for (let v = data.schema_version + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v]
    if (migrate) {
      migrate()
    }
  }

  data.schema_version = CURRENT_SCHEMA_VERSION
  saveData()
}
