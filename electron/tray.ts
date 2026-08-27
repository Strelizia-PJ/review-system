import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

let tray: Tray | null = null
let pendingCount = 0
let updateMenuFn: (() => void) | null = null

function getIconPath(): string {
  // In production, icon is in process.resourcesPath; in dev, in project resources/
  const resourcePath = app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), 'resources')
  return path.join(resourcePath, 'icon.png')
}

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = getIconPath()
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(icon)
  tray.setToolTip('芝士学爆')

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          mainWindow.show()
          mainWindow.focus()
        }
      },
      {
        label: `待复习: ${pendingCount} 条`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])
    tray!.setContextMenu(contextMenu)
  }

  updateMenu()

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Store updateMenu for external calls
  updateMenuFn = updateMenu
}

export function updateTrayPendingCount(count: number): void {
  pendingCount = count
  if (tray && updateMenuFn) {
    updateMenuFn()
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
