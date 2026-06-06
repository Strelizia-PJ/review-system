import { getPendingReviewCount, getOverdueReviews } from './database/queries'
import { sendReviewReminder } from './notifications'
import { updateTrayPendingCount } from './tray'

let intervalId: ReturnType<typeof setInterval> | null = null
let initialTimeoutId: ReturnType<typeof setTimeout> | null = null

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function checkAndNotify(): void {
  try {
    const count = getPendingReviewCount()
    updateTrayPendingCount(count)

    if (count > 0) {
      const overdue = getOverdueReviews()
      sendReviewReminder(count, overdue.length)
    }
  } catch (e) {
    console.error('Scheduler check failed:', e)
  }
}

export function startScheduler(): void {
  // Check immediately on start
  initialTimeoutId = setTimeout(checkAndNotify, 3000)

  // Then check periodically
  intervalId = setInterval(checkAndNotify, CHECK_INTERVAL_MS)
}

export function stopScheduler(): void {
  if (initialTimeoutId) {
    clearTimeout(initialTimeoutId)
    initialTimeoutId = null
  }
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
