import { formatTime } from './time'
import type { Note, TimeFormat } from './types'

export type NoteView =
  | { kind: 'all' }
  | { kind: 'pinned' }
  | { kind: 'notebook'; id: string }
  | { kind: 'trash' }

function inView(n: Note, view: NoteView): boolean {
  if (view.kind === 'trash') return n.deletedAt !== null
  if (n.deletedAt !== null) return false
  if (view.kind === 'pinned') return n.pinned
  if (view.kind === 'notebook') return n.notebookId === view.id
  return true
}

/** Notes shown for a sidebar view + search box. Pinned first, then most recently edited. */
export function filterNotes(notes: Note[], view: NoteView, query: string): Note[] {
  const q = query.trim().toLocaleLowerCase()
  const result = notes.filter(
    (n) =>
      inView(n, view) &&
      (!q || n.title.toLocaleLowerCase().includes(q) || n.text.toLocaleLowerCase().includes(q))
  )
  if (view.kind === 'trash') return result.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  return result.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
}

export function previewText(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + '…' : flat
}

export function countByNotebook(notes: Note[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const n of notes) {
    if (n.deletedAt === null && n.notebookId) counts[n.notebookId] = (counts[n.notebookId] ?? 0) + 1
  }
  return counts
}

/** The notes that change when a notebook is deleted: its live notes, now in the Trash. */
export function trashNotebookNotes(notes: Note[], notebookId: string, now: number): Note[] {
  return notes
    .filter((n) => n.notebookId === notebookId && n.deletedAt === null)
    .map((n) => ({ ...n, deletedAt: now }))
}

/** Take a note out of the Trash; if its notebook no longer exists it lands in "no notebook". */
export function restoreNote(note: Note, notebookIds: Set<string>): Note {
  const notebookId = note.notebookId && notebookIds.has(note.notebookId) ? note.notebookId : null
  return { ...note, deletedAt: null, notebookId }
}

const DAY = 86_400_000
const startOfDay = (t: number): number => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "Just now", "09:05", "Yesterday", "Mon", "Sep 3", "Dec 31, 2025". */
export function formatEdited(ts: number, now: number, fmt: TimeFormat): string {
  if (now - ts < 60_000) return 'Just now'
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  const d = new Date(ts)
  if (days <= 0) return formatTime(d.getHours() * 60 + d.getMinutes(), fmt)
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  if (d.getFullYear() === new Date(now).getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
