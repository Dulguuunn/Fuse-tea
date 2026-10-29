import { useState, type ReactNode } from 'react'
import { BookMarked, FileText, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { countByNotebook, type NoteView } from '@shared/notes'
import type { Notebook } from '@shared/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useNotes } from '../../state/notesStore'
import { useUi } from '../../state/uiStore'

const sameView = (a: NoteView, b: NoteView): boolean =>
  a.kind === b.kind && (a.kind !== 'notebook' || (b.kind === 'notebook' && a.id === b.id))

function useGoTo(): { go(view: NoteView): void; isActive(view: NoteView): boolean } {
  const page = useUi((s) => s.page)
  const setPage = useUi((s) => s.setPage)
  const current = useNotes((s) => s.view)
  const setView = useNotes((s) => s.setView)
  return {
    go(view) {
      setPage('notes')
      if (!sameView(view, current)) setView(view)
    },
    isActive: (view) => page === 'notes' && sameView(view, current)
  }
}

interface SideItemProps {
  icon: ReactNode
  label: string
  count?: number
  active: boolean
  onClick(): void
  actions?: ReactNode
}

function SideItem({ icon, label, count, active, onClick, actions }: SideItemProps): React.JSX.Element {
  return (
    <div className="side-item" data-active={active || undefined}>
      <button type="button" className="side-item-main" onClick={onClick} aria-current={active || undefined}>
        {icon}
        <span className="side-item-label">{label}</span>
        {count !== undefined && count > 0 && <span className="side-item-count">{count}</span>}
      </button>
      {actions && <div className="side-item-actions">{actions}</div>}
    </div>
  )
}

function NameInput({ initial, onDone }: { initial: string; onDone(name: string | null): void }): React.JSX.Element {
  const [value, setValue] = useState(initial)
  return (
    <input
      className="input side-input"
      autoFocus
      value={value}
      placeholder="Notebook name"
      aria-label="Notebook name"
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => onDone(value.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(value.trim() || null)
        if (e.key === 'Escape') onDone(null)
      }}
    />
  )
}

function NotebookItem({ book, count }: { book: Notebook; count: number }): React.JSX.Element {
  const { go, isActive } = useGoTo()
  const renameNotebook = useNotes((s) => s.renameNotebook)
  const deleteNotebook = useNotes((s) => s.deleteNotebook)
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const view: NoteView = { kind: 'notebook', id: book.id }

  if (renaming) {
    return (
      <NameInput
        initial={book.name}
        onDone={(name) => {
          if (name) renameNotebook(book.id, name)
          setRenaming(false)
        }}
      />
    )
  }
  return (
    <>
      <SideItem
        icon={<BookMarked size={16} />}
        label={book.name}
        count={count}
        active={isActive(view)}
        onClick={() => go(view)}
        actions={
          <>
            <button type="button" className="icon-btn" aria-label={`Rename ${book.name}`} onClick={() => setRenaming(true)}>
              <Pencil size={14} />
            </button>
            <button type="button" className="icon-btn" aria-label={`Delete ${book.name}`} onClick={() => setConfirming(true)}>
              <Trash2 size={14} />
            </button>
          </>
        }
      />
      {confirming && (
        <ConfirmDialog
          title={`Delete “${book.name}”?`}
          message={
            count > 0
              ? `Its ${count} ${count === 1 ? 'note moves' : 'notes move'} to the Trash, where you can still restore ${count === 1 ? 'it' : 'them'}.`
              : 'This notebook is empty.'
          }
          confirmLabel="Delete notebook"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            deleteNotebook(book.id)
          }}
        />
      )}
    </>
  )
}

/** Notes navigation inside the left sidebar: All notes, Pinned, notebooks, Trash. */
export function NotesSidebar(): React.JSX.Element {
  const notes = useNotes((s) => s.notes)
  const notebooks = useNotes((s) => s.notebooks)
  const createNotebook = useNotes((s) => s.createNotebook)
  const { go, isActive } = useGoTo()
  const [adding, setAdding] = useState(false)

  const live = notes.filter((n) => n.deletedAt === null)
  const counts = countByNotebook(notes)
  const sorted = [...notebooks].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="notes-nav">
      <SideItem
        icon={<FileText size={16} />}
        label="All notes"
        count={live.length}
        active={isActive({ kind: 'all' })}
        onClick={() => go({ kind: 'all' })}
      />
      <SideItem
        icon={<Pin size={16} />}
        label="Pinned"
        count={live.filter((n) => n.pinned).length}
        active={isActive({ kind: 'pinned' })}
        onClick={() => go({ kind: 'pinned' })}
      />

      <div className="side-group-head">
        <span>Notebooks</span>
        <button type="button" className="icon-btn" aria-label="New notebook" title="New notebook" onClick={() => setAdding(true)}>
          <Plus size={15} />
        </button>
      </div>
      {sorted.map((b) => (
        <NotebookItem key={b.id} book={b} count={counts[b.id] ?? 0} />
      ))}
      {adding && (
        <NameInput
          initial=""
          onDone={(name) => {
            setAdding(false)
            if (name) go({ kind: 'notebook', id: createNotebook(name).id })
          }}
        />
      )}
      {sorted.length === 0 && !adding && <p className="side-hint">Make one per class, like “Physics”.</p>}

      <div className="side-gap" />
      <SideItem
        icon={<Trash2 size={16} />}
        label="Trash"
        count={notes.length - live.length}
        active={isActive({ kind: 'trash' })}
        onClick={() => go({ kind: 'trash' })}
      />
    </div>
  )
}
