import { create } from 'zustand'
import { newId } from '@shared/id'
import { filterNotes, restoreNote, trashNotebookNotes, type NoteView } from '@shared/notes'
import type { Note, Notebook } from '@shared/types'
import { saver } from './saver'

export type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'text'>>

// One saver key per note, so the latest change (or a delete) replaces any pending save of it.
const persistNote = (note: Note): void => saver.schedule(`note:${note.id}`, () => window.api.notes.save(note))
const removeNoteFile = (id: string): void => saver.schedule(`note:${id}`, () => window.api.notes.remove(id))
const persistNotebooks = (list: Notebook[]): void =>
  saver.schedule('notebooks', () => window.api.notebooks.save(list))

interface NotesState {
  notes: Note[]
  notebooks: Notebook[]
  loaded: boolean
  view: NoteView
  query: string
  selectedId: string | null
  load(): Promise<void>
  setView(view: NoteView): void
  setQuery(query: string): void
  select(id: string | null): void
  createNote(): Note
  updateNote(id: string, patch: NotePatch): void
  trashNote(id: string): void
  restoreNote(id: string): void
  deleteForever(id: string): void
  emptyTrash(): void
  togglePin(id: string): void
  moveToNotebook(id: string, notebookId: string | null): void
  createNotebook(name: string): Notebook
  renameNotebook(id: string, name: string): void
  deleteNotebook(id: string): void
}

export const useNotes = create<NotesState>((set, get) => {
  /** Replace notes by id in the store and save them. */
  const commit = (changed: Note[]): void => {
    const byId = new Map(changed.map((n) => [n.id, n]))
    set({ notes: get().notes.map((n) => byId.get(n.id) ?? n) })
    changed.forEach(persistNote)
  }
  const patch = (id: string, fn: (n: Note) => Note): void => {
    const n = get().notes.find((x) => x.id === id)
    if (n) commit([fn(n)])
  }
  const firstInView = (view: NoteView, notes = get().notes): string | null =>
    filterNotes(notes, view, '')[0]?.id ?? null
  /** The note to select after `id` leaves the current list: the next one, else the previous. */
  const neighbour = (id: string): string | null => {
    const { notes, view, query } = get()
    const visible = filterNotes(notes, view, query)
    const i = visible.findIndex((n) => n.id === id)
    return (visible[i + 1] ?? visible[i - 1])?.id ?? null
  }
  const leaveSelection = (id: string): void => {
    if (get().selectedId === id) set({ selectedId: neighbour(id) })
  }

  return {
    notes: [],
    notebooks: [],
    loaded: false,
    view: { kind: 'all' },
    query: '',
    selectedId: null,

    async load() {
      const [notes, notebooks] = await Promise.all([window.api.notes.list(), window.api.notebooks.list()])
      set({ notes, notebooks, loaded: true, selectedId: firstInView({ kind: 'all' }, notes) })
    },

    setView(view) {
      set({ view, query: '', selectedId: firstInView(view) })
    },
    setQuery(query) {
      set({ query })
    },
    select(id) {
      set({ selectedId: id })
    },

    createNote() {
      const { view } = get()
      const now = Date.now()
      const note: Note = {
        id: newId(),
        title: '',
        content: null,
        text: '',
        notebookId: view.kind === 'notebook' ? view.id : null,
        pinned: view.kind === 'pinned',
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      }
      set({
        notes: [note, ...get().notes],
        selectedId: note.id,
        query: '',
        view: view.kind === 'trash' ? { kind: 'all' } : view
      })
      persistNote(note)
      return note
    },

    updateNote(id, changes) {
      patch(id, (n) => ({ ...n, ...changes, updatedAt: Date.now() }))
    },

    trashNote(id) {
      leaveSelection(id)
      patch(id, (n) => ({ ...n, deletedAt: Date.now() }))
    },

    restoreNote(id) {
      const bookIds = new Set(get().notebooks.map((b) => b.id))
      leaveSelection(id)
      patch(id, (n) => restoreNote(n, bookIds))
    },

    deleteForever(id) {
      leaveSelection(id)
      set({ notes: get().notes.filter((n) => n.id !== id) })
      removeNoteFile(id)
    },

    emptyTrash() {
      const trashed = get().notes.filter((n) => n.deletedAt !== null)
      set({ notes: get().notes.filter((n) => n.deletedAt === null), selectedId: null })
      trashed.forEach((n) => removeNoteFile(n.id))
    },

    togglePin(id) {
      patch(id, (n) => ({ ...n, pinned: !n.pinned }))
    },

    moveToNotebook(id, notebookId) {
      patch(id, (n) => ({ ...n, notebookId }))
    },

    createNotebook(name) {
      const book: Notebook = { id: newId(), name: name.trim() || 'Untitled notebook', createdAt: Date.now() }
      const notebooks = [...get().notebooks, book]
      set({ notebooks })
      persistNotebooks(notebooks)
      return book
    },

    renameNotebook(id, name) {
      const trimmed = name.trim()
      if (!trimmed) return
      const notebooks = get().notebooks.map((b) => (b.id === id ? { ...b, name: trimmed } : b))
      set({ notebooks })
      persistNotebooks(notebooks)
    },

    deleteNotebook(id) {
      const notebooks = get().notebooks.filter((b) => b.id !== id)
      set({ notebooks })
      persistNotebooks(notebooks)
      commit(trashNotebookNotes(get().notes, id, Date.now()))
      const { view } = get()
      if (view.kind === 'notebook' && view.id === id) get().setView({ kind: 'all' })
    }
  }
})
