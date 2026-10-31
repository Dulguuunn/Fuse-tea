import { app, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc'
import {
  normalizeCalendar,
  normalizeNote,
  normalizeNotebooks,
  normalizeSettings,
  normalizeTasks
} from '@shared/normalize'
import { attachmentUrl, saveAttachment } from './attachments'
import type { Lock } from './lock'
import type { Storage } from './storage'

/** Everything the UI can ask the main process to do. Incoming data is normalized before it is saved. */
export function registerIpc(storage: Storage, lock: Lock): void {
  ipcMain.handle(IPC.lockStatus, () => lock.status())
  ipcMain.handle(IPC.lockUnlock, (_e, code: unknown) => lock.unlock(String(code)))
  ipcMain.handle(IPC.lockChange, (_e, current: unknown, next: unknown) =>
    lock.change(String(current), next === null ? null : String(next))
  )

  // Every data channel below refuses to answer while the app is locked.
  const handle: typeof ipcMain.handle = (channel, listener) =>
    ipcMain.handle(channel, (e, ...args) => {
      lock.assertUnlocked()
      return listener(e, ...args)
    })

  handle(IPC.notesList, () => storage.listNotes())
  handle(IPC.notesSave, (_e, raw: unknown) => {
    const note = normalizeNote(raw)
    if (!note) throw new Error('Invalid note')
    return storage.writeNote(note)
  })
  handle(IPC.notesRemove, (_e, id: string) => storage.deleteNote(id))

  handle(IPC.notebooksList, () => storage.readJson('notebooks.json', normalizeNotebooks))
  handle(IPC.notebooksSave, (_e, raw: unknown) =>
    storage.writeJson('notebooks.json', normalizeNotebooks(raw))
  )

  handle(IPC.tasksList, () => storage.readJson('tasks.json', normalizeTasks))
  handle(IPC.tasksSave, (_e, raw: unknown) => storage.writeJson('tasks.json', normalizeTasks(raw)))

  handle(IPC.calendarGet, () => storage.readJson('calendar.json', normalizeCalendar))
  handle(IPC.calendarSave, (_e, raw: unknown) =>
    storage.writeJson('calendar.json', normalizeCalendar(raw))
  )

  handle(IPC.settingsGet, () => storage.readJson('settings.json', normalizeSettings))
  handle(IPC.settingsSave, (_e, raw: unknown) =>
    storage.writeJson('settings.json', normalizeSettings(raw))
  )

  handle(IPC.attachmentsSaveImage, async (_e, bytes: unknown, ext: unknown) => {
    if (!(bytes instanceof Uint8Array) || typeof ext !== 'string') throw new Error('Invalid image')
    return attachmentUrl(await saveAttachment(storage.dir, bytes, ext))
  })

  handle(IPC.dataDir, () => storage.dir)
  ipcMain.handle(IPC.version, () => app.getVersion())
  handle(IPC.openDataFolder, async () => {
    await shell.openPath(storage.dir)
  })
}
