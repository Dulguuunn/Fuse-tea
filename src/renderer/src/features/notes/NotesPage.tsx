import { filterNotes } from '@shared/notes'
import { useNotes } from '../../state/notesStore'
import { NoteEditor } from './NoteEditor'
import { NoteList } from './NoteList'
import './notes.css'

export function NotesPage(): React.JSX.Element {
  const { notes, view, query, selectedId, createNote } = useNotes()
  const note = filterNotes(notes, view, query).find((n) => n.id === selectedId) ?? null

  return (
    <div className="notes-page">
      <NoteList />
      <section className="note-pane" aria-label="Note">
        {note ? (
          <NoteEditor key={note.id} note={note} />
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
