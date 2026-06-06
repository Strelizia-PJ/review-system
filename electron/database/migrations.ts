import { getData, saveData } from './connection'

const CURRENT_SCHEMA_VERSION = 7

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
        kp.last_interval = completedCount === 0
          ? 1
          : EBBINGHAUS_INTERVALS[Math.min(completedCount - 1, 7)]

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
        (rec as any).quality = null
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
