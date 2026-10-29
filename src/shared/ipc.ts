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
  dataDir: 'app:data-dir',
  openDataFolder: 'app:open-data-folder',
  beforeClose: 'app:before-close',
  readyToClose: 'app:ready-to-close'
} as const

export interface NotesApi {
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
  app: {
    dataDir(): Promise<string>
    openDataFolder(): Promise<void>
    /** Runs `cb` when the window is about to close; the window waits (max 3 s) for it to finish. */
    onBeforeClose(cb: () => Promise<void>): void
  }
}
