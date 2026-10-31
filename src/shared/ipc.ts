// The contract between the UI (renderer) and the main process. The preload script implements
// NotesApi with these channels and exposes it as `window.api`.
import type { CalendarData, Note, Notebook, Settings, Task } from './types'

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
  attachments: {
    /** Saves image bytes into data/attachments; resolves to the URL to put in the note. */
    saveImage(bytes: Uint8Array, ext: string): Promise<string>
  }
  app: {
    dataDir(): Promise<string>
    version(): Promise<string>
    openDataFolder(): Promise<void>
    /** Runs `cb` when the window is about to close; the window waits (max 3 s) for it to finish. */
    onBeforeClose(cb: () => Promise<void>): void
  }
}
