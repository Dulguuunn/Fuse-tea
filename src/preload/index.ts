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
  profile: {
    get: () => invoke(IPC.profileGet),
    save: (profile) => invoke(IPC.profileSave, profile)
  },
  applications: {
    get: () => invoke(IPC.applicationsGet),
    save: (list) => invoke(IPC.applicationsSave, list)
  },
  files: {
    get: () => invoke(IPC.filesGet),
    save: (index) => invoke(IPC.filesSave, index),
    add: (stored, bytes) => invoke(IPC.filesAdd, stored, bytes),
    remove: (stored) => invoke(IPC.filesRemove, stored),
    saveAs: (stored, name) => invoke(IPC.filesSaveAs, stored, name),
    reveal: (stored) => invoke(IPC.filesReveal, stored),
    path: (stored) => invoke(IPC.filesPath, stored),
    startDrag: (stored, name) => void invoke(IPC.filesStartDrag, stored, name).catch(() => {})
  },
  transfer: {
    exportJson: (json) => invoke(IPC.transferExportJson, json),
    exportAll: (json, stored) => invoke(IPC.transferExportAll, json, stored),
    importJson: () => invoke(IPC.transferImport)
  },
  attachments: {
    saveImage: (bytes, ext) => invoke(IPC.attachmentsSaveImage, bytes, ext)
  },
  app: {
    dataDir: () => invoke(IPC.dataDir),
    version: () => invoke(IPC.version),
    openDataFolder: () => invoke(IPC.openDataFolder),
    copyText: (text) => invoke(IPC.copyText, text),
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
