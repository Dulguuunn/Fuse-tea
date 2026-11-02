import { useMemo, useRef, useState } from 'react'
import {
  Download,
  File as FileIcon,
  FileText,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  Pencil,
  Search,
  Trash2,
  Upload
} from 'lucide-react'
import { folderPath, linksForFile, type FileItem, type FolderItem } from '@shared/files'
import { ENTRY_SECTIONS, entryLabel, type EntrySection } from '@shared/profile'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { useApplications } from '../../state/applicationsStore'
import { useFiles } from '../../state/filesStore'
import { useProfile } from '../../state/profileStore'
import { useUi } from '../../state/uiStore'
import { copyToClipboard, TagsField } from './fields'
import { formatBytes } from './format'
import { SECTIONS } from './sectionConfig'

/** Which files the middle column shows: everything, files without a folder, or one folder. */
type Scope = { kind: 'all' } | { kind: 'unfiled' } | { kind: 'folder'; id: string }

const isImage = (f: FileItem): boolean => f.mime.startsWith('image/')
const isPdf = (f: FileItem): boolean => f.mime === 'application/pdf' || /\.pdf$/i.test(f.name)
const previewUrl = (f: FileItem): string => `attachment://stored/${f.stored}`

function TypeIcon({ file, size = 18 }: { file: FileItem; size?: number }): React.JSX.Element {
  if (isImage(file)) return <ImageIcon size={size} />
  if (isPdf(file)) return <FileText size={size} />
  return <FileIcon size={size} />
}

function NameDialog({ title, initial, onSave, onClose }: { title: string; initial: string; onSave(name: string): void; onClose(): void }): React.JSX.Element {
  const [name, setName] = useState(initial)
  const submit = (): void => {
    if (name.trim()) onSave(name.trim())
  }
  return (
    <Dialog
      title={title}
      width={380}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={submit}>
            Save
          </button>
        </>
      }
    >
      <input
        className="input"
        autoFocus
        aria-label="Folder name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
    </Dialog>
  )
}

/** Tick the profile entries and applications this file is evidence for. */
function LinkDialog({ file, onClose }: { file: FileItem; onClose(): void }): React.JSX.Element {
  const profile = useProfile((s) => s.profile)
  const updateEntry = useProfile((s) => s.updateEntry)
  const apps = useApplications((s) => s.apps)
  const changeApp = useApplications((s) => s.change)
  const flip = (ids: string[]): string[] => (ids.includes(file.id) ? ids.filter((x) => x !== file.id) : [...ids, file.id])

  return (
    <Dialog
      title={`Link “${file.name}”`}
      width={520}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      {ENTRY_SECTIONS.map((section: EntrySection) => {
        const entries = profile[section] as Array<{ id: string; fileIds: string[] }>
        if (entries.length === 0) return null
        return (
          <div key={section} className="link-group">
            <h3>{SECTIONS[section].title}</h3>
            {entries.map((e) => (
              <label key={e.id} className="pick-row">
                <input
                  type="checkbox"
                  checked={e.fileIds.includes(file.id)}
                  onChange={() => updateEntry(section, e.id, { fileIds: flip(e.fileIds) } as never)}
                />
                <span className="pick-name">{entryLabel(section, e as never) || 'Untitled'}</span>
              </label>
            ))}
          </div>
        )
      })}
      {apps.length > 0 && (
        <div className="link-group">
          <h3>Applications</h3>
          {apps.map((a) => (
            <label key={a.id} className="pick-row">
              <input
                type="checkbox"
                checked={a.fileIds.includes(file.id)}
                onChange={() => changeApp(a.id, (x) => ({ ...x, fileIds: flip(x.fileIds) }))}
              />
              <span className="pick-name">{a.name || 'Untitled application'}</span>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  )
}

function FileDetail({ file, onDeleted }: { file: FileItem; onDeleted(): void }): React.JSX.Element {
  const index = useFiles((s) => s.index)
  const updateFile = useFiles((s) => s.updateFile)
  const deleteFile = useFiles((s) => s.deleteFile)
  const profile = useProfile((s) => s.profile)
  const apps = useApplications((s) => s.apps)
  const showToast = useUi((s) => s.showToast)
  const [linking, setLinking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const links = linksForFile(file.id, profile, apps)
  const folderOptions: Array<[string, string]> = [
    ['', 'Unfiled'],
    ...index.folders.map((f): [string, string] => [f.id, folderPath(index.folders, f.id)])
  ]

  return (
    <aside className="file-detail" aria-label="File details">
      <div className="preview" data-kind={isImage(file) ? 'image' : isPdf(file) ? 'pdf' : 'other'}>
        {isImage(file) ? (
          <img src={previewUrl(file)} alt={file.name} />
        ) : isPdf(file) ? (
          <iframe title={`Preview of ${file.name}`} src={previewUrl(file)} />
        ) : (
          <div className="preview-none">
            <TypeIcon file={file} size={40} />
            <span className="muted">No preview for this file type</span>
          </div>
        )}
      </div>

      <div className="detail-fields">
        <div className="field">
          <label htmlFor="file-name">Name</label>
          <input id="file-name" className="input" value={file.name} onChange={(e) => updateFile(file.id, { name: e.target.value || file.name })} />
        </div>
        <div className="field">
          <label htmlFor="file-folder">Folder</label>
          <select
            id="file-folder"
            className="select"
            value={file.folderId ?? ''}
            onChange={(e) => updateFile(file.id, { folderId: e.target.value || null })}
          >
            {folderOptions.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <TagsField label="Tags" value={file.tags} onChange={(tags) => updateFile(file.id, { tags })} />
        <p className="muted file-meta">
          {formatBytes(file.size)} · {file.mime} · added {new Date(file.uploadedAt).toLocaleDateString('en-GB')}
        </p>
      </div>

      <div className="detail-links">
        <div className="field-head">
          <span>Linked to</span>
          <button type="button" className="btn btn-sm" onClick={() => setLinking(true)}>
            <Link2 size={14} /> Link
          </button>
        </div>
        {links.profile.length + links.applications.length === 0 ? (
          <p className="muted">Not linked to anything yet.</p>
        ) : (
          <ul className="link-list">
            {links.profile.map((l) => (
              <li key={l.id}>
                <span className="muted">{SECTIONS[l.section].title}</span> {l.label}
              </li>
            ))}
            {links.applications.map((a) => (
              <li key={a.id}>
                <span className="muted">Application</span> {a.name || 'Untitled application'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-actions">
        <button type="button" className="btn" onClick={() => void window.api.files.saveAs(file.stored, file.name).then((p) => p && showToast({ message: 'Saved' }))}>
          <Download size={15} /> Download
        </button>
        <button type="button" className="btn" onClick={() => void window.api.files.reveal(file.stored)}>
          <FolderOpen size={15} /> Show in folder
        </button>
        <button type="button" className="btn" onClick={() => void window.api.files.path(file.stored).then(copyToClipboard)}>
          Copy file path
        </button>
        <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={15} /> Delete
        </button>
      </div>

      {linking && <LinkDialog file={file} onClose={() => setLinking(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this file?"
          message={`“${file.name}” will be removed from Ponder${links.profile.length + links.applications.length > 0 ? ' and unlinked from everything it was attached to' : ''}. This can’t be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false)
            onDeleted()
            void deleteFile(file.id)
          }}
        />
      )}
    </aside>
  )
}

function FolderRow({
  folder,
  depth,
  count,
  active,
  onSelect,
  onRename,
  onDelete,
  onAddSub
}: {
  folder: FolderItem
  depth: number
  count: number
  active: boolean
  onSelect(): void
  onRename(): void
  onDelete(): void
  onAddSub?: () => void
}): React.JSX.Element {
  return (
    <div className="folder-row" data-active={active || undefined} style={{ paddingLeft: 8 + depth * 16 }}>
      <button type="button" className="folder-main" aria-current={active ? 'true' : undefined} onClick={onSelect}>
        <span className="folder-name">{folder.name}</span>
        <span className="muted">{count}</span>
      </button>
      <span className="folder-actions">
        {onAddSub && (
          <button type="button" className="icon-btn" aria-label={`Add a folder inside ${folder.name}`} title="New subfolder" onClick={onAddSub}>
            <FolderPlus size={14} />
          </button>
        )}
        <button type="button" className="icon-btn" aria-label={`Rename ${folder.name}`} title="Rename" onClick={onRename}>
          <Pencil size={14} />
        </button>
        <button type="button" className="icon-btn" aria-label={`Delete folder ${folder.name}`} title="Delete folder (files are kept)" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </span>
    </div>
  )
}

export function FilesTab(): React.JSX.Element {
  const index = useFiles((s) => s.index)
  const addFiles = useFiles((s) => s.addFiles)
  const addFolder = useFiles((s) => s.addFolder)
  const renameFolder = useFiles((s) => s.renameFolder)
  const deleteFolder = useFiles((s) => s.deleteFolder)
  const showToast = useUi((s) => s.showToast)
  const [scope, setScope] = useState<Scope>({ kind: 'all' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState(false)
  const [nameDialog, setNameDialog] = useState<{ title: string; initial: string; save(name: string): void } | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const targetFolder = scope.kind === 'folder' ? scope.id : null
  const countIn = (id: string | null): number => index.files.filter((f) => f.folderId === id).length

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return index.files
      .filter((f) => (scope.kind === 'all' ? true : scope.kind === 'unfiled' ? f.folderId === null : f.folderId === scope.id))
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
  }, [index.files, scope, query])

  const selected = index.files.find((f) => f.id === selectedId) ?? null

  const upload = async (list: FileList | File[]): Promise<void> => {
    const files = Array.from(list)
    if (files.length === 0) return
    const { added, failed } = await addFiles(files, targetFolder)
    if (added.length > 0) setSelectedId(added[added.length - 1].id)
    if (failed.length > 0) showToast({ message: failed[0] })
    else showToast({ message: added.length === 1 ? `Added “${added[0].name}”` : `Added ${added.length} files` })
  }

  const tops = index.folders.filter((f) => f.parentId === null)

  return (
    <div
      className="files-tab"
      data-dragging={dragging || undefined}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(false)
        void upload(e.dataTransfer.files)
      }}
    >
      <nav className="folders" aria-label="Folders">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setNameDialog({ title: 'New folder', initial: '', save: (name) => addFolder(name, null) })}
        >
          <FolderPlus size={15} /> New folder
        </button>
        <button type="button" className="folder-row folder-main" data-active={scope.kind === 'all' || undefined} onClick={() => setScope({ kind: 'all' })}>
          <span className="folder-name">All files</span>
          <span className="muted">{index.files.length}</span>
        </button>
        <button type="button" className="folder-row folder-main" data-active={scope.kind === 'unfiled' || undefined} onClick={() => setScope({ kind: 'unfiled' })}>
          <span className="folder-name">Unfiled</span>
          <span className="muted">{countIn(null)}</span>
        </button>
        {tops.map((top) => (
          <div key={top.id}>
            <FolderRow
              folder={top}
              depth={0}
              count={countIn(top.id)}
              active={scope.kind === 'folder' && scope.id === top.id}
              onSelect={() => setScope({ kind: 'folder', id: top.id })}
              onRename={() => setNameDialog({ title: 'Rename folder', initial: top.name, save: (n) => renameFolder(top.id, n) })}
              onDelete={() => setFolderToDelete(top)}
              onAddSub={() => setNameDialog({ title: `New folder in ${top.name}`, initial: '', save: (n) => addFolder(n, top.id) })}
            />
            {index.folders
              .filter((f) => f.parentId === top.id)
              .map((sub) => (
                <FolderRow
                  key={sub.id}
                  folder={sub}
                  depth={1}
                  count={countIn(sub.id)}
                  active={scope.kind === 'folder' && scope.id === sub.id}
                  onSelect={() => setScope({ kind: 'folder', id: sub.id })}
                  onRename={() => setNameDialog({ title: 'Rename folder', initial: sub.name, save: (n) => renameFolder(sub.id, n) })}
                  onDelete={() => setFolderToDelete(sub)}
                />
              ))}
          </div>
        ))}
      </nav>

      <section className="file-list-pane" aria-label="Files">
        <div className="file-toolbar">
          <div className="search">
            <Search size={15} />
            <input value={query} placeholder="Search files" aria-label="Search files" onChange={(e) => setQuery(e.target.value)} />
          </div>
          <input ref={input} type="file" multiple hidden onChange={(e) => void upload(e.target.files ?? []).then(() => (e.target.value = ''))} />
          <button type="button" className="btn btn-primary" onClick={() => input.current?.click()}>
            <Upload size={15} /> Upload
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="empty-state">
            <strong>{index.files.length === 0 ? 'No files yet' : 'No files here'}</strong>
            <span>Drag files from your computer into this window, or press Upload. Proof documents, diplomas, your CV and ID all live here.</span>
          </div>
        ) : (
          <ul className="file-list">
            <li className="file-hint muted">Drag a file out of this list to drop it on your desktop or into a folder.</li>
            {shown.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="file-row"
                  draggable
                  aria-pressed={selectedId === f.id}
                  onClick={() => setSelectedId(f.id)}
                  onDragStart={(e) => {
                    e.preventDefault() // the drag is started by the main process, as a real file
                    window.api.files.startDrag(f.stored, f.name)
                  }}
                >
                  <TypeIcon file={f} />
                  <span className="file-row-name">{f.name}</span>
                  <span className="muted file-row-folder">{folderPath(index.folders, f.folderId)}</span>
                  <span className="muted file-row-size">{formatBytes(f.size)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && <FileDetail key={selected.id} file={selected} onDeleted={() => setSelectedId(null)} />}

      {dragging && (
        <div className="drop-overlay" aria-hidden>
          <Upload size={28} />
          <strong>Drop to add to {scope.kind === 'folder' ? folderPath(index.folders, scope.id) : 'Unfiled'}</strong>
        </div>
      )}

      {nameDialog && (
        <NameDialog
          title={nameDialog.title}
          initial={nameDialog.initial}
          onClose={() => setNameDialog(null)}
          onSave={(n) => {
            nameDialog.save(n)
            setNameDialog(null)
          }}
        />
      )}
      {folderToDelete && (
        <ConfirmDialog
          title="Delete this folder?"
          message={`“${folderToDelete.name}” will be removed. The files and folders inside it are kept and move up one level.`}
          confirmLabel="Delete folder"
          danger
          onCancel={() => setFolderToDelete(null)}
          onConfirm={() => {
            if (scope.kind === 'folder' && scope.id === folderToDelete.id) setScope({ kind: 'all' })
            deleteFolder(folderToDelete.id)
            setFolderToDelete(null)
          }}
        />
      )}
    </div>
  )
}
