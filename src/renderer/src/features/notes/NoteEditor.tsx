import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Note } from '@shared/types'
import { useNotes } from '../../state/notesStore'
import { EditorToolbar } from './EditorToolbar'
import { NoteHeader, NoteMeta } from './NoteHeader'
import { editorExtensions } from './editorExtensions'
import { imageFiles, insertImages } from './imageFiles'
import './editor.css'

/** Title + rich-text body of one note. Mounted with key={note.id}, so each note gets a fresh editor. */
export function NoteEditor({ note }: { note: Note }): React.JSX.Element {
  const updateNote = useNotes((s) => s.updateNote)
  const readOnly = note.deletedAt !== null
  const titleRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: editorExtensions(),
    content: (note.content as object | null) ?? '',
    editable: !readOnly,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: 'prose', 'aria-label': 'Note text' },
      // Pasted or dropped images (e.g. a Win+Shift+S screenshot) are saved into the data folder.
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files)
        if (files.length === 0) return false
        void insertImages(view, files)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imageFiles(event.dataTransfer?.files)
        if (moved || files.length === 0) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        void insertImages(view, files, pos)
        return true
      }
    },
    onUpdate: ({ editor }) => {
      updateNote(note.id, { content: editor.getJSON(), text: editor.getText({ blockSeparator: '\n' }) })
    }
  })

  useEffect(() => {
    // emitUpdate=false: toggling read-only must not count as an edit (it would bump "last edited").
    if (editor && editor.isEditable === readOnly) editor.setEditable(!readOnly, false)
  }, [editor, readOnly])

  // A brand-new note starts with the cursor in the title.
  useEffect(() => {
    if (!readOnly && !note.title && !note.text) titleRef.current?.focus()
    // Only on mount: this component is keyed by note id.
  }, [])

  return (
    <>
      <NoteHeader note={note}>{editor && !readOnly && <EditorToolbar editor={editor} />}</NoteHeader>
      <div
        className="note-body"
        onClick={(e) => {
          // Ctrl+click opens a link in the browser (plain click just places the cursor).
          const link = (e.target as HTMLElement).closest('a[href]')
          if (link && (e.ctrlKey || readOnly)) {
            e.preventDefault()
            window.open(link.getAttribute('href') ?? '', '_blank')
          }
        }}
      >
        <input
          ref={titleRef}
          className="note-title"
          value={note.title}
          placeholder="Untitled"
          aria-label="Title"
          readOnly={readOnly}
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === 'ArrowDown') && editor) {
              e.preventDefault()
              // Synchronous focus: TipTap's focus() waits a frame, and fast typing would land in the title.
              editor.commands.setTextSelection(1)
              editor.view.focus()
            }
          }}
        />
        <NoteMeta note={note} />
        <EditorContent editor={editor} className="editor" />
      </div>
    </>
  )
}
