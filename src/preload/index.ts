// Runs before the UI loads. Exposes a small, typed API as `window.api`; the UI has no other
// way to reach the disk (contextIsolation + sandbox).
import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type NotesApi } from '@shared/ipc'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)

const api: NotesApi = {
  lock: {
    status: () => invoke(IPC.lockStatus),
    unlock: (code) => invoke(IPC.lockUnlock, code),
    change: (current, next) => invoke(IPC.lockChange, current, next)
  },
  notes: {
    list: () => invoke(IPC.notesList),
    save: (note) => invoke(IPC.notesSave, note),
    remove: (id) => invoke(IPC.notesRemove, id)
  },
  notebooks: {
    list: () => invoke(IPC.notebooksList),
    save: (list) => invoke(IPC.notebooksSave, list)
  },
  tasks: {
    list: () => invoke(IPC.tasksList),
    save: (list) => invoke(IPC.tasksSave, list)
  },
  calendar: {
    get: () => invoke(IPC.calendarGet),
    save: (data) => invoke(IPC.calendarSave, data)
  },
  settings: {
    get: () => invoke(IPC.settingsGet),
    save: (settings) => invoke(IPC.settingsSave, settings)
  },
  attachments: {
    saveImage: (bytes, ext) => invoke(IPC.attachmentsSaveImage, bytes, ext)
  },
  app: {
    dataDir: () => invoke(IPC.dataDir),
    version: () => invoke(IPC.version),
    openDataFolder: () => invoke(IPC.openDataFolder),
    onBeforeClose: (cb) => {
      ipcRenderer.on(IPC.beforeClose, () => {
        void cb()
          .catch(() => {})
          .finally(() => ipcRenderer.send(IPC.readyToClose))
      })
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
