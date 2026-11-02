import { copyFileSync, linkSync, mkdirSync, rmSync } from 'node:fs'
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell, type IpcMainInvokeEvent } from 'electron'
import { normalizeApplications } from '@shared/applications'
import { BUNDLE_FORMAT } from '@shared/bundle'
import { normalizeFileIndex, STORED_NAME } from '@shared/files'
import { IPC } from '@shared/ipc'
import { normalizeProfile } from '@shared/profile'
import { startingData } from '@shared/seed'
import { isObj } from '@shared/guards'
import { saveStoredFile, storedFilePath } from './attachments'
import type { Storage } from './storage'

type Handle = typeof ipcMain.handle

const PROFILE = 'profile.json'
const APPLICATIONS = 'applications.json'
const FILES = 'files.json'
const SEED = 'seed.json'
const EXPORT_NAME = 'ponder-profile.json'
/** A 1x1 transparent PNG, used if the app icon can't be loaded (startDrag needs some icon). */
const BLANK_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/** The file name as Windows allows it. */
const safeName = (name: string, fallback: string): string => {
  const cleaned = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/, '')
  return cleaned || fallback
}

/**
 * First run only: write the starting profile, applications and folders. They come from data/seed.json when
 * that file exists (your own details, kept out of git), otherwise from the generic seed. Never runs again
 * once profile.json exists.
 */
export function seedOnFirstRun(storage: Storage): Promise<void> {
  const run = async (): Promise<void> => {
    if (storage.exists(PROFILE)) return
    const raw = storage.exists(SEED) ? await storage.readJson(SEED, (r) => r) : undefined
    const seed = startingData(raw)
    if (!storage.exists(APPLICATIONS)) await storage.writeJson(APPLICATIONS, seed.applications)
    if (!storage.exists(FILES)) await storage.writeJson(FILES, seed.files)
    await storage.writeJson(PROFILE, seed.profile)
  }
  return run()
}

function iconForDrag(): Electron.NativeImage {
  const path = app.isPackaged ? join(process.resourcesPath, 'icon.ico') : join(app.getAppPath(), 'build', 'icon.png')
  const img = nativeImage.createFromPath(path)
  return img.isEmpty() ? nativeImage.createFromDataURL(BLANK_ICON) : img.resize({ width: 48, height: 48 })
}

const windowOf = (e: IpcMainInvokeEvent): BrowserWindow | undefined => BrowserWindow.fromWebContents(e.sender) ?? undefined

/** Profile, applications, file storage and export/import. `handle` refuses calls while the app is locked. */
export function registerApplicationsIpc(handle: Handle, storage: Storage): void {
  // All three "get" calls wait for the first-run seed, so the stores that load in parallel never race it.
  let seeded: Promise<void> | null = null
  const ready = (): Promise<void> => (seeded ??= seedOnFirstRun(storage))

  handle(IPC.profileGet, async () => {
    await ready()
    return storage.readJson(PROFILE, normalizeProfile)
  })
  handle(IPC.profileSave, (_e, raw: unknown) => storage.writeJson(PROFILE, normalizeProfile(raw)))
  handle(IPC.applicationsGet, async () => {
    await ready()
    return storage.readJson(APPLICATIONS, normalizeApplications)
  })
  handle(IPC.applicationsSave, (_e, raw: unknown) => storage.writeJson(APPLICATIONS, normalizeApplications(raw)))
  handle(IPC.filesGet, async () => {
    await ready()
    return storage.readJson(FILES, normalizeFileIndex)
  })
  handle(IPC.filesSave, (_e, raw: unknown) => storage.writeJson(FILES, normalizeFileIndex(raw)))

  handle(IPC.filesAdd, (_e, stored: unknown, bytes: unknown) => {
    if (typeof stored !== 'string' || !(bytes instanceof Uint8Array)) throw new Error('Invalid file')
    return saveStoredFile(storage.dir, stored, bytes)
  })
  handle(IPC.filesRemove, async (_e, stored: unknown) => {
    await rm(storedFilePath(storage.dir, String(stored)), { force: true })
  })
  handle(IPC.filesPath, (_e, stored: unknown) => storedFilePath(storage.dir, String(stored)))
  handle(IPC.filesReveal, (_e, stored: unknown) => {
    shell.showItemInFolder(storedFilePath(storage.dir, String(stored)))
  })
  handle(IPC.filesSaveAs, async (e, stored: unknown, name: unknown) => {
    const from = storedFilePath(storage.dir, String(stored))
    const options = { defaultPath: safeName(String(name), String(stored)) }
    const win = windowOf(e)
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await copyFile(from, result.filePath)
    return result.filePath
  })
  // Drag out: Windows needs a real file with the right name, so link the stored one into a temp folder under that
  // name (instant, so the drag can start at once; a copy if temp is on another drive). If Explorer "moves" the
  // dragged file, only the temp link goes away.
  handle(IPC.filesStartDrag, (e, stored: unknown, name: unknown) => {
    const from = storedFilePath(storage.dir, String(stored))
    const dir = join(app.getPath('temp'), 'Ponder-drag', String(stored).replace(/\.[^.]*$/, ''))
    mkdirSync(dir, { recursive: true })
    const file = join(dir, safeName(String(name), String(stored)))
    rmSync(file, { force: true })
    try {
      linkSync(from, file)
    } catch {
      copyFileSync(from, file)
    }
    e.sender.startDrag({ file, icon: iconForDrag() })
  })

  handle(IPC.copyText, (_e, text: unknown) => {
    clipboard.writeText(String(text))
  })

  handle(IPC.transferExportJson, async (e, json: unknown) => {
    const options = { defaultPath: EXPORT_NAME, filters: [{ name: 'JSON', extensions: ['json'] }] }
    const win = windowOf(e)
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, String(json), 'utf8')
    return result.filePath
  })

  handle(IPC.transferExportAll, async (e, json: unknown, stored: unknown) => {
    const options = { title: 'Choose a folder for the export', properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'> }
    const win = windowOf(e)
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const target = join(result.filePaths[0], 'Ponder export')
    await mkdir(join(target, 'files'), { recursive: true })
    await writeFile(join(target, EXPORT_NAME), String(json), 'utf8')
    const names = Array.isArray(stored) ? stored.filter((s): s is string => typeof s === 'string' && STORED_NAME.test(s)) : []
    for (const name of names) await copyFile(storedFilePath(storage.dir, name), join(target, 'files', name)).catch(() => {})
    return target
  })

  handle(IPC.transferImport, async (e) => {
    const options = { title: 'Choose a Ponder export', filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile'] as Array<'openFile'> }
    const win = windowOf(e)
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]
    const text = (await readFile(path, 'utf8')).replace(/^﻿/, '')
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('That file is not valid JSON.')
    }
    if (!isObj(parsed) || parsed.format !== BUNDLE_FORMAT) throw new Error('That file is not a Ponder profile export.')

    // Keep the current data first, so an import can always be undone by hand.
    const backup = join(storage.dir, 'backups', `before-import-${Date.now()}`)
    await mkdir(backup, { recursive: true })
    for (const f of [PROFILE, APPLICATIONS, FILES]) {
      if (storage.exists(f)) await copyFile(join(storage.dir, f), join(backup, f))
    }
    // Files that came with the export (the "files" folder next to the JSON).
    const source = join(path, '..', 'files')
    const names = await readdir(source).catch(() => [] as string[])
    if (names.length > 0) await mkdir(join(storage.dir, 'files'), { recursive: true })
    for (const name of names.filter((n) => STORED_NAME.test(n))) {
      await cp(join(source, name), join(storage.dir, 'files', name), { force: false, errorOnExist: false })
    }
    return text
  })
}
