import { useRef, useState } from 'react'
import { Paperclip, Upload, X } from 'lucide-react'
import { folderPath, type FileItem } from '@shared/files'
import { Dialog } from '../../components/Dialog'
import { useFiles } from '../../state/filesStore'
import { useUi } from '../../state/uiStore'
import { formatBytes } from './format'

/** Choose which stored files belong to an entry or an application. New files can be uploaded from here too. */
function FilePickerDialog({
  selected,
  onChange,
  onClose
}: {
  selected: string[]
  onChange(ids: string[]): void
  onClose(): void
}): React.JSX.Element {
  const index = useFiles((s) => s.index)
  const addFiles = useFiles((s) => s.addFiles)
  const showToast = useUi((s) => s.showToast)
  const input = useRef<HTMLInputElement>(null)

  const toggle = (id: string): void => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const upload = async (list: FileList | null): Promise<void> => {
    if (!list || list.length === 0) return
    const { added, failed } = await addFiles(Array.from(list), null)
    onChange([...selected, ...added.map((f) => f.id)])
    if (failed.length > 0) showToast({ message: failed[0] })
  }

  return (
    <Dialog
      title="Attach files"
      width={520}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={() => input.current?.click()}>
            <Upload size={15} /> Upload new file
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <input ref={input} type="file" multiple hidden onChange={(e) => void upload(e.target.files).then(() => (e.target.value = ''))} />
      {index.files.length === 0 ? (
        <p className="muted">No files yet. Upload one here, or add files in the Files tab.</p>
      ) : (
        <ul className="pick-list">
          {index.files.map((f: FileItem) => (
            <li key={f.id}>
              <label className="pick-row">
                <input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
                <span className="pick-name">{f.name}</span>
                <span className="muted">
                  {folderPath(index.folders, f.folderId)} · {formatBytes(f.size)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

/** The files attached to something, as removable chips, with a button to attach more. */
export function FilesField({ label, fileIds, onChange }: { label: string; fileIds: string[]; onChange(ids: string[]): void }): React.JSX.Element {
  const files = useFiles((s) => s.index.files)
  const [open, setOpen] = useState(false)
  const attached = fileIds.flatMap((id) => files.find((f) => f.id === id) ?? [])
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chip-row">
        {attached.map((f) => (
          <span className="file-chip" key={f.id}>
            <Paperclip size={13} />
            <span className="file-chip-name">{f.name}</span>
            <button type="button" className="icon-btn" aria-label={`Detach ${f.name}`} onClick={() => onChange(fileIds.filter((x) => x !== f.id))}>
              <X size={13} />
            </button>
          </span>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          <Paperclip size={14} /> Attach files
        </button>
      </div>
      {open && <FilePickerDialog selected={fileIds} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  )
}
