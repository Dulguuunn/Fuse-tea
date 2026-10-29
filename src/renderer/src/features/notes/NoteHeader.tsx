import { useState } from 'react'
import { BookMarked, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react'
import { formatEdited } from '@shared/notes'
import type { Note, TimeFormat } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SaveIndicator } from '../../components/SaveIndicator'
import { useNotes } from '../../state/notesStore'
import { useSettings } from '../../state/settingsStore'

const editedLabel = (ts: number, fmt: TimeFormat): string => {
  const when = formatEdited(ts, Date.now(), fmt)
  return when === 'Just now' || when === 'Yesterday' ? when.toLowerCase() : when
}

/** Line under the title: which notebook the note is in (changeable) and when it was last edited. */
export function NoteMeta({ note }: { note: Note }): React.JSX.Element {
  const notebooks = useNotes((s) => s.notebooks)
  const moveToNotebook = useNotes((s) => s.moveToNotebook)
  const timeFormat = useSettings((s) => s.settings.timeFormat)
  const readOnly = note.deletedAt !== null
  return (
    <div className="note-meta">
      <label className="notebook-picker" title="Notebook">
        <BookMarked size={14} />
        <select
          value={note.notebookId ?? ''}
          aria-label="Notebook"
          disabled={readOnly}
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
      <span>Edited {editedLabel(note.updatedAt, timeFormat)}</span>
    </div>
  )
}

/** Bar above the open note: formatting tools, pin, delete — or Restore/Delete forever in the Trash. */
export function NoteHeader({ note, children }: { note: Note; children?: React.ReactNode }): React.JSX.Element {
  const { togglePin, trashNote, restoreNote, deleteForever } = useNotes()
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
      <div className="note-header-tools">{children}</div>
      <div className="note-header-actions">
        <SaveIndicator />
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
