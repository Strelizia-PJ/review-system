import { Notification, BrowserWindow } from 'electron'

let getMainWindow: (() => BrowserWindow | null) | null = null
let activeNotification: Notification | null = null

export function setMainWindowGetter(fn: () => BrowserWindow | null): void {
  getMainWindow = fn
}

export function sendReviewReminder(pendingCount: number, overdueCount: number): void {
  if (!Notification.isSupported()) return

  let body: string
  if (overdueCount > 0) {
    body = `你有 ${pendingCount} 条知识点需要复习，其中 ${overdueCount} 条已逾期`
  } else if (pendingCount > 0) {
    body = `你有 ${pendingCount} 条知识点今天需要复习`
  } else {
    return
  }

  // Hold reference to prevent GC from collecting the Notification before click
  activeNotification = new Notification({
    title: '芝士学爆',
    body,
    urgency: overdueCount > 0 ? 'critical' : 'normal'
  })

  activeNotification.on('click', () => {
    const win = getMainWindow?.()
    if (win) {
      win.show()
      win.focus()
    }
  })

  activeNotification.on('close', () => {
    activeNotification = null
  })

  activeNotification.show()
}
