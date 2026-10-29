import type { NotesApi } from '@shared/ipc'

declare global {
  interface Window {
    api: NotesApi
  }
}

export {}
