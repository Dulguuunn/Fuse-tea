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
import type { Storage } from './storage'

/** Everything the UI can ask the main process to do. Incoming data is normalized before it is saved. */
export function registerIpc(storage: Storage): void {
  ipcMain.handle(IPC.notesList, () => storage.listNotes())
  ipcMain.handle(IPC.notesSave, (_e, raw: unknown) => {
    const note = normalizeNote(raw)
    if (!note) throw new Error('Invalid note')
    return storage.writeNote(note)
  })
  ipcMain.handle(IPC.notesRemove, (_e, id: string) => storage.deleteNote(id))

  ipcMain.handle(IPC.notebooksList, () => storage.readJson('notebooks.json', normalizeNotebooks))
  ipcMain.handle(IPC.notebooksSave, (_e, raw: unknown) =>
    storage.writeJson('notebooks.json', normalizeNotebooks(raw))
  )

  ipcMain.handle(IPC.tasksList, () => storage.readJson('tasks.json', normalizeTasks))
  ipcMain.handle(IPC.tasksSave, (_e, raw: unknown) => storage.writeJson('tasks.json', normalizeTasks(raw)))

  ipcMain.handle(IPC.calendarGet, () => storage.readJson('calendar.json', normalizeCalendar))
  ipcMain.handle(IPC.calendarSave, (_e, raw: unknown) =>
    storage.writeJson('calendar.json', normalizeCalendar(raw))
  )

  ipcMain.handle(IPC.settingsGet, () => storage.readJson('settings.json', normalizeSettings))
  ipcMain.handle(IPC.settingsSave, (_e, raw: unknown) =>
    storage.writeJson('settings.json', normalizeSettings(raw))
  )

  ipcMain.handle(IPC.attachmentsSaveImage, async (_e, bytes: unknown, ext: unknown) => {
    if (!(bytes instanceof Uint8Array) || typeof ext !== 'string') throw new Error('Invalid image')
    return attachmentUrl(await saveAttachment(storage.dir, bytes, ext))
  })

  ipcMain.handle(IPC.dataDir, () => storage.dir)
  ipcMain.handle(IPC.version, () => app.getVersion())
  ipcMain.handle(IPC.openDataFolder, async () => {
    await shell.openPath(storage.dir)
  })
}
