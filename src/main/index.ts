import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, net, protocol, shell } from 'electron'
import { IPC } from '@shared/ipc'
import { normalizeSettings } from '@shared/normalize'
import { todayISO } from '@shared/time'
import { ATTACHMENT_SCHEME, resolveAttachmentPath } from './attachments'
import { runDailyBackup } from './backup'
import { resolveDataDir } from './dataDir'
import { registerIpc } from './ipc'
import { Storage } from './storage'

const CLOSE_FLUSH_TIMEOUT_MS = 3000
const BACKUP_CHECK_MS = 3 * 60 * 60 * 1000

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

function createWindow(backgroundColor: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Notes',
    icon: app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(app.getAppPath(), 'build', 'icon.ico'),
    backgroundColor,
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

const dataDir = resolveDataDir({
  env: process.env,
  isPackaged: app.isPackaged,
  execPath: process.execPath,
  appPath: app.getAppPath()
})

// Test runs (NOTES_DATA_DIR set) get their own browser profile, so they never collide with the
// real app's single-instance lock or cache.
if (process.env.NOTES_DATA_DIR) app.setPath('userData', join(dataDir, '.electron-profile'))

// attachment://file/<name> serves pasted images from data/attachments (must be declared before ready).
protocol.registerSchemesAsPrivileged([
  { scheme: ATTACHMENT_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

function serveAttachments(): void {
  protocol.handle(ATTACHMENT_SCHEME, (request) => {
    const file = resolveAttachmentPath(dataDir, request.url)
    if (!file) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })
}

/** One backup per day: at startup, and re-checked every few hours in case the app stays open. */
function scheduleBackups(): void {
  const run = (): void => {
    runDailyBackup(dataDir, todayISO()).catch((e: unknown) => console.error('[backup] failed', e))
  }
  setTimeout(run, 5_000)
  setInterval(run, BACKUP_CHECK_MS)
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

  void app.whenReady().then(async () => {
    const storage = new Storage(dataDir)
    registerIpc(storage)
    serveAttachments()
    const { theme } = await storage.readJson('settings.json', normalizeSettings)
    const dark = theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors)
    Menu.setApplicationMenu(null)
    mainWindow = createWindow(dark ? '#151a24' : '#f7f8fb')
    flushBeforeClose(mainWindow)
    scheduleBackups()
    mainWindow.on('closed', () => (mainWindow = null))
  })

  app.on('window-all-closed', () => app.quit())
}
