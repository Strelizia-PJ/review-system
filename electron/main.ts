import { app, BrowserWindow, ipcMain, Menu, protocol, net, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import dayjs from 'dayjs'
import { autoUpdater } from 'electron-updater'
import { loadData } from './database/connection'
import { runMigrations } from './database/migrations'
import {
  addKnowledgePoint,
  listKnowledgePoints,
  getKnowledgePointById,
  deleteKnowledgePoint,
  updateKnowledgePoint,
  searchKnowledgePoints,
  setKnowledgePointMaxInterval,
  reschedulePendingReview,
  getTodayReviews,
  rateReview,
  rollbackReview,
  forgetKnowledgePoint,
  getReviewStats,
  addDailyPlan,
  getTodayPlans,
  togglePlanCompletion,
  deleteDailyPlan,
  addStudySession,
  getWeekStats,
  getRecent7DaysStats,
  getMonthStats,
  getMonthReviewStats,
  addMistakePoint,
  listMistakePoints,
  incrementMistakePoint,
  updateMistakePoint,
  deleteMistakePoint
} from './database/queries'
import { scanGameSaves, applyGameData } from './database/game-import'
import { saveImage, deleteImages, deleteOrphanImages } from './database/images'
import { getData, saveData } from './database/connection'
import { createTray, destroyTray } from './tray'
import { setMainWindowGetter } from './notifications'
import { startScheduler, stopScheduler, checkAndNotify } from './scheduler'
import { enableAutoStart, disableAutoStart, isAutoStartEnabled } from './auto-start'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png')
  }
  return path.join(app.getAppPath(), 'resources', 'icon.png')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: '芝士学爆',
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Minimize to tray instead of closing
  mainWindow.on('close', event => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

// ---- IPC Handlers ----

function setupIPC() {
  ipcMain.handle('knowledge:add', (_event, content: string, learnDate?: string) => {
    return addKnowledgePoint(content.slice(0, 5000), learnDate)
  })

  ipcMain.handle('knowledge:list', () => {
    return listKnowledgePoints()
  })

  ipcMain.handle('knowledge:delete', (_event, id: number) => {
    deleteKnowledgePoint(id)
    deleteImages(id)
  })

  ipcMain.handle('knowledge:search', (_event, keyword: string) => {
    return searchKnowledgePoints(keyword)
  })

  ipcMain.handle('knowledge:update', (_event, id: number, content?: string, detail?: string) => {
    updateKnowledgePoint(id, content?.slice(0, 5000), detail?.slice(0, 50000))
    // Clean up orphaned images that are no longer referenced in the markdown
    if (detail) {
      deleteOrphanImages(id, detail)
    }
  })

  ipcMain.handle('knowledge:get-by-id', (_event, id: number) => {
    return getKnowledgePointById(id)
  })

  ipcMain.handle('knowledge:set-max-interval', (_event, id: number, days: number | null) => {
    try {
      return setKnowledgePointMaxInterval(id, days)
    } catch (e) {
      console.error('Set knowledge point max interval failed:', e)
      throw e
    }
  })

  ipcMain.handle('knowledge:reschedule', (_event, id: number, date: string) => {
    try {
      const result = reschedulePendingReview(id, date)
      checkAndNotify()
      return result
    } catch (e) {
      console.error('Reschedule pending review failed:', e)
      throw e
    }
  })

  ipcMain.handle('settings:get', (_event, key: string) => {
    const data = getData()
    return data.settings[key] ?? null
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    const data = getData()
    data.settings[key] = value
    saveData()
  })

  ipcMain.handle('review:get-today', () => {
    return getTodayReviews()
  })

  ipcMain.handle('review:rate', (_event, reviewId: number, quality: number, customDays?: number) => {
    try {
      const result = rateReview(reviewId, quality, customDays)
      // Refresh tray badge immediately after rating a review
      checkAndNotify()
      return result
    } catch (e) {
      console.error('Review rating failed:', e)
      throw e
    }
  })

  ipcMain.handle('review:rollback', (_event, reviewId: number) => {
    try {
      const result = rollbackReview(reviewId)
      checkAndNotify()
      return result
    } catch (e) {
      console.error('Review rollback failed:', e)
      throw e
    }
  })

  ipcMain.handle('review:forget', (_event, kpId: number) => {
    try {
      const result = forgetKnowledgePoint(kpId)
      checkAndNotify()
      return result
    } catch (e) {
      console.error('Forget knowledge point failed:', e)
      throw e
    }
  })

  ipcMain.handle('review:get-stats', () => {
    return getReviewStats()
  })

  // Daily Plans
  ipcMain.handle(
    'plans:add',
    (_event, content: string, type: string, config?: Record<string, unknown>, planDate?: string) => {
      return addDailyPlan(content, type, config, planDate)
    }
  )

  ipcMain.handle('plans:get-today', () => {
    return getTodayPlans()
  })

  ipcMain.handle('plans:toggle', (_event, planId: number) => {
    togglePlanCompletion(planId)
  })

  ipcMain.handle('plans:delete', (_event, planId: number) => {
    deleteDailyPlan(planId)
  })

  // Mistake Points
  ipcMain.handle('mistake:add', (_event, content: string) => {
    try {
      return addMistakePoint(content.trim().slice(0, 5000))
    } catch (e) {
      console.error('Add mistake point failed:', e)
      throw e
    }
  })

  ipcMain.handle('mistake:list', () => {
    return listMistakePoints()
  })

  ipcMain.handle('mistake:increment', (_event, id: number) => {
    try {
      incrementMistakePoint(id)
    } catch (e) {
      console.error('Increment mistake point failed:', e)
      throw e
    }
  })

  ipcMain.handle('mistake:update', (_event, id: number, content: string) => {
    try {
      updateMistakePoint(id, content.trim().slice(0, 5000))
    } catch (e) {
      console.error('Update mistake point failed:', e)
      throw e
    }
  })

  ipcMain.handle('mistake:delete', (_event, id: number) => {
    try {
      deleteMistakePoint(id)
    } catch (e) {
      console.error('Delete mistake point failed:', e)
      throw e
    }
  })

  // Study Sessions
  ipcMain.handle('study:add-session', (_event, date: string, durationMinutes: number) => {
    addStudySession(date, durationMinutes)
  })

  ipcMain.handle('study:get-week-stats', () => {
    return getWeekStats()
  })

  ipcMain.handle('study:get-recent-7', () => {
    return getRecent7DaysStats()
  })

  ipcMain.handle('study:get-month-stats', (_event, year: number, month: number) => {
    return getMonthStats(year, month)
  })

  ipcMain.handle('study:get-month-review-stats', (_event, year: number, month: number) => {
    return getMonthReviewStats(year, month)
  })

  // Game Import
  ipcMain.handle('import:scan', (_event, dirPath: string) => {
    return scanGameSaves(dirPath)
  })

  ipcMain.handle('import:apply', (_event, dirPath: string, selectedDates: string[]) => {
    return applyGameData(dirPath, selectedDates)
  })

  // Images
  ipcMain.handle('image:save', (_event, kpId: number, fileData: Uint8Array, originalName: string) => {
    return saveImage(kpId, fileData, originalName)
  })
  // image:delete-all is not exposed to renderer — image deletion is handled
  // automatically by knowledge:delete which calls deleteImages internally

  ipcMain.handle('app:minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide()
    }
  })

  // Auto-start
  ipcMain.handle('auto-start:is-enabled', async () => {
    return isAutoStartEnabled()
  })

  ipcMain.handle('auto-start:set', async (_event, enabled: boolean) => {
    if (enabled) {
      enableAutoStart()
    } else {
      disableAutoStart()
    }
  })

  // Data Export / Import
  ipcMain.handle('data:export', async () => {
    if (!mainWindow) return { success: false, error: '窗口未就绪' }
    const today = dayjs().format('YYYY-MM-DD')
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出数据',
      defaultPath: `芝士学爆-备份-${today}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }
    try {
      const data = getData()
      // Strip potentially sensitive settings before export
      const exportData = { ...data, settings: {} }
      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      return { success: true, path: result.filePath }
    } catch (e) {
      console.error('Export failed:', e)
      return { success: false, error: '写入文件失败' }
    }
  })

  ipcMain.handle('data:import', async () => {
    if (!mainWindow) return { success: false, error: '窗口未就绪' }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入数据',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return { success: false }
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(raw)
      // Validate structure
      if (!Array.isArray(parsed.knowledge_points) || !Array.isArray(parsed.review_records)) {
        return { success: false, error: '数据文件格式无效：缺少 knowledge_points 或 review_records 数组' }
      }
      // Confirm with user
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: '确认导入',
        message: '此操作将覆盖当前所有数据，不可撤销。',
        detail: `即将导入 ${parsed.knowledge_points.length} 个知识点、${parsed.review_records.length} 条复习记录。`,
        buttons: ['取消', '确认导入'],
        defaultId: 0,
        cancelId: 0
      })
      if (response !== 1) return { success: false }
      // Backup current data before overwriting
      const dbPath = getDbPath()
      const bakPath = dbPath + '.pre-import.bak'
      fs.copyFileSync(dbPath, bakPath)
      // Write imported data
      fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf-8')
      return {
        success: true,
        imported: { kp: parsed.knowledge_points.length, rr: parsed.review_records.length }
      }
    } catch (e) {
      console.error('Import failed:', e)
      return { success: false, error: '读取或写入数据失败' }
    }
  })
}

// ---- Auto Update (electron-updater, GitHub Releases) ----
// Windows only: unsigned macOS builds cannot auto-update (Gatekeeper).
const RELEASES_URL = 'https://github.com/Strelizia-PJ/review-system/releases/latest'

type UpdateStatus =
  | { event: 'checking' }
  | { event: 'available'; version: string }
  | { event: 'not-available'; version: string }
  | { event: 'downloading'; percent: number }
  | { event: 'downloaded'; version: string }
  | { event: 'error'; message: string }

function sendUpdateStatus(status: UpdateStatus) {
  mainWindow?.webContents.send('update:status', status)
}

function setupAutoUpdate() {
  if (!app.isPackaged || process.platform !== 'win32') {
    // Renderer still needs the version/platform IPC below
  } else {
    autoUpdater.autoDownload = true
    autoUpdater.on('checking-for-update', () => sendUpdateStatus({ event: 'checking' }))
    autoUpdater.on('update-available', info =>
      sendUpdateStatus({ event: 'available', version: info.version })
    )
    autoUpdater.on('update-not-available', info =>
      sendUpdateStatus({ event: 'not-available', version: info.version })
    )
    autoUpdater.on('download-progress', progress =>
      sendUpdateStatus({ event: 'downloading', percent: Math.round(progress.percent) })
    )
    autoUpdater.on('update-downloaded', info =>
      sendUpdateStatus({ event: 'downloaded', version: info.version })
    )
    autoUpdater.on('error', err => sendUpdateStatus({ event: 'error', message: err?.message || String(err) }))
    // Silent check 30s after launch; renderer can trigger manual checks too
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 30_000)
  }

  ipcMain.handle('update:get-version', () => app.getVersion())
  ipcMain.handle('update:get-platform', () => process.platform)
  ipcMain.handle('update:check', () => {
    if (!app.isPackaged || process.platform !== 'win32') {
      sendUpdateStatus({ event: 'not-available', version: app.getVersion() })
      return
    }
    autoUpdater.checkForUpdates().catch(err => {
      sendUpdateStatus({ event: 'error', message: err?.message || String(err) })
    })
  })
  ipcMain.handle('update:install', () => {
    if (app.isPackaged && process.platform === 'win32') {
      isQuitting = true
      autoUpdater.quitAndInstall()
    }
  })
  ipcMain.handle('update:open-release', () => shell.openExternal(RELEASES_URL))
}

// ---- App Lifecycle ----

// Register custom protocol for local images
protocol.registerSchemesAsPrivileged([
  { scheme: 'kcimg', privileges: { bypassCSP: true, supportFetchAPI: true } }
])

app
  .whenReady()
  .then(() => {
    Menu.setApplicationMenu(null)

    // Handle kcimg:// protocol — serves local image files
    // URL format: kcimg://kpId/filename
    protocol.handle('kcimg', request => {
      const rawUrl = request.url.replace('kcimg://', '')
      const userDataPath = app.getPath('userData')
      const imagesDir = path.join(userDataPath, 'images')

      // Validate path to prevent directory traversal
      const decoded = decodeURIComponent(rawUrl)
      const normalized = path.normalize(decoded)
      if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
        return new Response('Invalid path', { status: 403 })
      }

      // Parse kpId/name segments
      const segments = normalized.split(path.sep).filter(Boolean)
      if (segments.length < 2) {
        return new Response('Invalid path', { status: 400 })
      }
      const kpId = parseInt(segments[0], 10)
      if (isNaN(kpId) || kpId <= 0) {
        return new Response('Invalid knowledge point ID', { status: 400 })
      }

      const filePath = path.join(imagesDir, normalized)
      // Final check: resolved path must be within imagesDir
      if (!filePath.startsWith(imagesDir + path.sep)) {
        return new Response('Path traversal denied', { status: 403 })
      }

      return net.fetch(`file://${filePath}`)
    })

    loadData()
    runMigrations()

    setupIPC()
    setupAutoUpdate()
    createWindow()
    setMainWindowGetter(() => mainWindow)
    createTray(mainWindow!)
    startScheduler()
    // Only enable auto-start if user hasn't explicitly disabled it
    if (getData().settings['auto_start'] !== 'false') {
      enableAutoStart()
    }

    // Auto-start: start minimized to tray
    if (process.argv.includes('--hidden')) {
      mainWindow?.hide()
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      } else {
        mainWindow?.show()
      }
    })
  })
  .catch(err => {
    console.error('Failed to start application:', err)
    // Show error dialog before quitting
    dialog.showErrorBox('启动失败', `应用启动发生错误: ${err?.message || String(err)}`)
    app.quit()
  })

app.on('before-quit', () => {
  isQuitting = true
  stopScheduler()
  destroyTray()
})
