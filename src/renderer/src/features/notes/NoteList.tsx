import { useState } from 'react'
import { BookMarked, Pin, Search, SquarePen, X } from 'lucide-react'
import { filterNotes, formatEdited, previewText, type NoteView } from '@shared/notes'
import type { Notebook } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotes } from '../../state/notesStore'
import { useSettings } from '../../state/settingsStore'

function viewTitle(view: NoteView, notebooks: Notebook[]): string {
  if (view.kind === 'pinned') return 'Pinned'
  if (view.kind === 'trash') return 'Trash'
  if (view.kind === 'notebook') return notebooks.find((b) => b.id === view.id)?.name ?? 'Notebook'
  return 'All notes'
}

function emptyMessage(view: NoteView, query: string): { title: string; hint: string } {
  if (query.trim()) return { title: `Nothing matches “${query.trim()}”`, hint: 'Try a different word.' }
  if (view.kind === 'trash') return { title: 'Trash is empty', hint: 'Deleted notes wait here until you remove them.' }
  if (view.kind === 'pinned') return { title: 'No pinned notes', hint: 'Pin a note to keep it at the top.' }
  return { title: 'No notes yet', hint: 'Press Ctrl+N or the pen button to start one.' }
}

export function NoteList(): React.JSX.Element {
  const { notes, notebooks, view, query, selectedId, setQuery, select, createNote, emptyTrash } = useNotes()
  const timeFormat = useSettings((s) => s.settings.timeFormat)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const visible = filterNotes(notes, view, query)
  const bookName = new Map(notebooks.map((b) => [b.id, b.name]))
  const now = Date.now()
  const empty = emptyMessage(view, query)

  return (
    <section className="note-list" aria-label="Notes">
      <div className="note-list-top">
        <label className="search">
          <Search size={15} />
          <input
            value={query}
            placeholder="Search notes"
            aria-label="Search notes"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          />
          {query && (
            <button type="button" className="icon-btn search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </label>
        <button type="button" className="icon-btn new-note" aria-label="New note" title="New note (Ctrl+N)" onClick={createNote}>
          <SquarePen size={18} />
        </button>
      </div>

      <div className="note-list-head">
        <h2>{viewTitle(view, notebooks)}</h2>
        <span className="muted">{visible.length}</span>
        {view.kind === 'trash' && visible.length > 0 && (
          <button type="button" className="btn btn-ghost empty-trash" onClick={() => setConfirmEmpty(true)}>
            Empty trash
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state note-list-empty">
          <strong>{empty.title}</strong>
          <span>{empty.hint}</span>
        </div>
      ) : (
        <ul className="note-rows">
          {visible.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="note-row"
                aria-current={n.id === selectedId || undefined}
                onClick={() => select(n.id)}
              >
                <span className="note-row-title">
                  {n.pinned && view.kind !== 'trash' && <Pin size={12} className="note-row-pin" />}
                  {n.title.trim() || 'Untitled'}
                </span>
                <span className="note-row-preview">{previewText(n.text) || 'Empty note'}</span>
                <span className="note-row-meta">
                  <span>{formatEdited(view.kind === 'trash' ? (n.deletedAt ?? n.updatedAt) : n.updatedAt, now, timeFormat)}</span>
                  {view.kind !== 'notebook' && n.notebookId && bookName.has(n.notebookId) && (
                    <span className="note-row-book">
                      <BookMarked size={11} />
                      {bookName.get(n.notebookId)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmEmpty && (
        <ConfirmDialog
          title="Empty the Trash?"
          message={`${visible.length} ${visible.length === 1 ? 'note' : 'notes'} will be deleted for good. This can’t be undone.`}
          confirmLabel="Delete forever"
          danger
          onCancel={() => setConfirmEmpty(false)}
          onConfirm={() => {
            setConfirmEmpty(false)
            emptyTrash()
          }}
        />
      )}
    </section>
  )
}
