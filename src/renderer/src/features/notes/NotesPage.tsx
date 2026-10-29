import { filterNotes } from '@shared/notes'
import { useNotes } from '../../state/notesStore'
import { NoteHeader } from './NoteHeader'
import { NoteList } from './NoteList'
import './notes.css'

export function NotesPage(): React.JSX.Element {
  const { notes, view, query, selectedId, updateNote, createNote } = useNotes()
  const note = filterNotes(notes, view, query).find((n) => n.id === selectedId) ?? null

  return (
    <div className="notes-page">
      <NoteList />
      <section className="note-pane" aria-label="Note">
        {note ? (
          <>
            <NoteHeader note={note} />
            <div className="note-body">
              <input
                className="note-title"
                value={note.title}
                placeholder="Untitled"
                aria-label="Title"
                readOnly={note.deletedAt !== null}
                onChange={(e) => updateNote(note.id, { title: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <strong>Pick a note, or start a new one</strong>
            <button type="button" className="btn btn-primary" onClick={createNote}>
              New note
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
