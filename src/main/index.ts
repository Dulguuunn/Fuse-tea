import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { IPC } from '@shared/ipc'
import { resolveDataDir } from './dataDir'
import { registerIpc } from './ipc'
import { Storage } from './storage'

const CLOSE_FLUSH_TIMEOUT_MS = 3000

let mainWindow: BrowserWindow | null = null

/** Before the window closes, let the UI finish saving (max 3 s), then really close. */
function flushBeforeClose(win: BrowserWindow): void {
  let closing = false
  win.on('close', (event) => {
    if (closing) return
    event.preventDefault()
    closing = true
    const finish = (): void => {
      clearTimeout(timer)
      ipcMain.removeListener(IPC.readyToClose, onReady)
      if (!win.isDestroyed()) win.destroy()
    }
    const onReady = (e: Electron.IpcMainEvent): void => {
      if (e.sender === win.webContents) finish()
    }
    const timer = setTimeout(finish, CLOSE_FLUSH_TIMEOUT_MS)
    ipcMain.on(IPC.readyToClose, onReady)
    win.webContents.send(IPC.beforeClose)
  })
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Notes',
    backgroundColor: '#f6f4ef',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Links (e.g. inside notes) open in the normal web browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    }
  })

  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools()
    })
  }

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}

// Only one copy of the app may run, so two windows never write the same files.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    const dataDir = resolveDataDir({
      env: process.env,
      isPackaged: app.isPackaged,
      execPath: process.execPath,
      appPath: app.getAppPath()
    })
    registerIpc(new Storage(dataDir))
    Menu.setApplicationMenu(null)
    mainWindow = createWindow()
    flushBeforeClose(mainWindow)
    mainWindow.on('closed', () => (mainWindow = null))
  })

  app.on('window-all-closed', () => app.quit())
}
