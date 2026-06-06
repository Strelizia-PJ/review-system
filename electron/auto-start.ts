import { app } from 'electron'
import { getData, saveData } from './database/connection'

export function enableAutoStart(): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: ['--hidden']
    })
    // Persist preference in our own settings
    getData().settings['auto_start'] = 'true'
    saveData()
  } catch (e) {
    console.error('Failed to enable auto-start:', e)
  }
}

export function disableAutoStart(): void {
  try {
    app.setLoginItemSettings({ openAtLogin: false })
    getData().settings['auto_start'] = 'false'
    saveData()
  } catch (e) {
    console.error('Failed to disable auto-start:', e)
  }
}

export function isAutoStartEnabled(): boolean {
  try {
    return getData().settings['auto_start'] === 'true'
  } catch {
    return false
  }
}
