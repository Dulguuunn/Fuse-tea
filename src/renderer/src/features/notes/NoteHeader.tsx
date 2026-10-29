import { useState } from 'react'
import { BookMarked, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react'
import type { Note } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotes } from '../../state/notesStore'

/** Bar above the open note: notebook picker, pin, delete — or Restore/Delete forever in the Trash. */
export function NoteHeader({ note, children }: { note: Note; children?: React.ReactNode }): React.JSX.Element {
  const { notebooks, togglePin, moveToNotebook, trashNote, restoreNote, deleteForever } = useNotes()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (note.deletedAt !== null) {
    return (
      <div className="note-header note-header-trash">
        <span>This note is in the Trash.</span>
        <div className="note-header-actions">
          <button type="button" className="btn" onClick={() => restoreNote(note.id)}>
            <RotateCcw size={15} /> Restore
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>
            Delete forever
          </button>
        </div>
        {confirmDelete && (
          <ConfirmDialog
            title="Delete this note forever?"
            message="It will be removed from your computer. This can’t be undone."
            confirmLabel="Delete forever"
            danger
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false)
              deleteForever(note.id)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="note-header">
      <label className="notebook-picker" title="Notebook">
        <BookMarked size={15} />
        <select
          value={note.notebookId ?? ''}
          aria-label="Notebook"
          onChange={(e) => moveToNotebook(note.id, e.target.value || null)}
        >
          <option value="">No notebook</option>
          {[...notebooks]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </select>
      </label>
      <div className="note-header-tools">{children}</div>
      <div className="note-header-actions">
        <button
          type="button"
          className="icon-btn"
          aria-pressed={note.pinned}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          title={note.pinned ? 'Unpin' : 'Pin to top'}
          onClick={() => togglePin(note.id)}
        >
          {note.pinned ? <PinOff size={17} /> : <Pin size={17} />}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Move note to Trash"
          title="Move to Trash"
          onClick={() => trashNote(note.id)}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  )
}
