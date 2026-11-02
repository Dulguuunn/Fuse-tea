// The contract between the UI (renderer) and the main process. The preload script implements
// NotesApi with these channels and exposes it as `window.api`.
import type { Application } from './applications'
import type { FileIndex } from './files'
import type { Profile } from './profile'
import type { CalendarData, Note, Notebook, Settings, Task, Theme } from './types'

export const IPC = {
  notesList: 'notes:list',
  notesSave: 'notes:save',
  notesRemove: 'notes:remove',
  notebooksList: 'notebooks:list',
  notebooksSave: 'notebooks:save',
  tasksList: 'tasks:list',
  tasksSave: 'tasks:save',
  calendarGet: 'calendar:get',
  calendarSave: 'calendar:save',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  attachmentsSaveImage: 'attachments:save-image',
  profileGet: 'profile:get',
  profileSave: 'profile:save',
  applicationsGet: 'applications:get',
  applicationsSave: 'applications:save',
  filesGet: 'files:get',
  filesSave: 'files:save',
  filesAdd: 'files:add',
  filesRemove: 'files:remove',
  filesSaveAs: 'files:save-as',
  filesReveal: 'files:reveal',
  filesPath: 'files:path',
  filesStartDrag: 'files:start-drag',
  transferExportJson: 'transfer:export-json',
  transferExportAll: 'transfer:export-all',
  transferImport: 'transfer:import',
  copyText: 'app:copy-text',
  dataDir: 'app:data-dir',
  version: 'app:version',
  openDataFolder: 'app:open-data-folder',
  beforeClose: 'app:before-close',
  readyToClose: 'app:ready-to-close',
  lockStatus: 'lock:status',
  lockUnlock: 'lock:unlock',
  lockChange: 'lock:change'
} as const

export interface LockStatus {
  enabled: boolean
  /** True when the lock is off, or the right code was entered since launch. */
  unlocked: boolean
  /** The chosen theme, so the lock screen can match it before settings are unlocked. */
  theme: Theme
}

export type LockResult =
  | { ok: true }
  | { ok: false; reason: 'wrong' | 'invalid' }
  | { ok: false; reason: 'wait'; waitMs: number }

export interface NotesApi {
  lock: {
    status(): Promise<LockStatus>
    unlock(code: string): Promise<LockResult>
    /** New code (4-8 digits), or null to turn the lock off. `current` is ignored while the lock is off. */
    change(current: string, next: string | null): Promise<LockResult>
  }
  notes: {
    list(): Promise<Note[]>
    save(note: Note): Promise<void>
    remove(id: string): Promise<void>
  }
  notebooks: {
    list(): Promise<Notebook[]>
    save(list: Notebook[]): Promise<void>
  }
  tasks: {
    list(): Promise<Task[]>
    save(list: Task[]): Promise<void>
  }
  calendar: {
    get(): Promise<CalendarData>
    save(data: CalendarData): Promise<void>
  }
  settings: {
    get(): Promise<Settings>
    save(settings: Settings): Promise<void>
  }
  profile: {
    get(): Promise<Profile>
    save(profile: Profile): Promise<void>
  }
  applications: {
    get(): Promise<Application[]>
    save(list: Application[]): Promise<void>
  }
  files: {
    /** Folders and file metadata. */
    get(): Promise<FileIndex>
    save(index: FileIndex): Promise<void>
    /** Stores the bytes of an uploaded file under `stored` (max 100 MB). */
    add(stored: string, bytes: Uint8Array): Promise<void>
    remove(stored: string): Promise<void>
    /** Asks where to save, then copies the file there. Resolves to the new path, or null if cancelled. */
    saveAs(stored: string, name: string): Promise<string | null>
    /** Shows the file in Windows Explorer. */
    reveal(stored: string): Promise<void>
    /** Full path of the stored file on disk. */
    path(stored: string): Promise<string>
    /** Starts dragging the file out of the window (call from a dragstart handler). */
    startDrag(stored: string, name: string): void
  }
  transfer: {
    /** Asks where to save, then writes the JSON. Resolves to the path, or null if cancelled. */
    exportJson(json: string): Promise<string | null>
    /** Asks for a folder and writes the JSON plus a copy of the listed stored files. */
    exportAll(json: string, stored: string[]): Promise<string | null>
    /** Asks for an export file; backs up the current data and copies the files next to it. Resolves to its text. */
    importJson(): Promise<string | null>
  }
  attachments: {
    /** Saves image bytes into data/attachments; resolves to the URL to put in the note. */
    saveImage(bytes: Uint8Array, ext: string): Promise<string>
  }
  app: {
    dataDir(): Promise<string>
    version(): Promise<string>
    openDataFolder(): Promise<void>
    /** Puts text on the clipboard. */
    copyText(text: string): Promise<void>
    /** Runs `cb` when the window is about to close; the window waits (max 3 s) for it to finish. */
    onBeforeClose(cb: () => Promise<void>): void
  }
}
