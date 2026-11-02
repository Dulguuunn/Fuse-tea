// The in-app file area: folders (one level of nesting) and file metadata. The bytes live on disk
// in data/files/<stored>; this module only deals with the index.
import type { Application } from './applications'
import { id, isObj, list, num, str, strList } from './guards'
import { newId } from './id'
import { ENTRY_SECTIONS, entryLabel, type EntrySection, type Profile } from './profile'

/** Largest file the app accepts (bytes travel through IPC in memory). */
export const MAX_FILE_BYTES = 100 * 1024 * 1024

/** Names the app gives stored files: an id plus an optional lowercase extension. Nothing else is ever served. */
export const STORED_NAME = /^[A-Za-z0-9_-]{1,64}(\.[a-z0-9]{1,8})?$/

export interface FolderItem {
  id: string
  name: string
  /** A top-level folder id, or null. Folders nest one level only. */
  parentId: string | null
}

export interface FileItem {
  id: string
  /** The name shown to the user (and used when downloading). */
  name: string
  folderId: string | null
  tags: string[]
  uploadedAt: number
  size: number
  mime: string
  /** File name inside data/files. */
  stored: string
}

export interface FileIndex {
  folders: FolderItem[]
  files: FileItem[]
}

export function normalizeFileIndex(raw: unknown): FileIndex {
  const r = isObj(raw) ? raw : {}
  const rawFolders = list(r.folders).filter(isObj).filter((f) => id(f.id) && str(f.name).trim())
  const parentOf = new Map(rawFolders.map((f) => [f.id as string, id(f.parentId)]))
  const folders: FolderItem[] = rawFolders.map((f) => {
    const parent = id(f.parentId)
    const ok = parent !== null && parent !== f.id && parentOf.has(parent) && parentOf.get(parent) === null
    return { id: f.id as string, name: str(f.name).trim(), parentId: ok ? parent : null }
  })
  const folderIds = new Set(folders.map((f) => f.id))
  const files = list(r.files).flatMap((f): FileItem[] => {
    if (!isObj(f) || !id(f.id) || typeof f.stored !== 'string' || !STORED_NAME.test(f.stored)) return []
    const folderId = id(f.folderId)
    return [
      {
        id: f.id as string,
        name: str(f.name, 'file') || 'file',
        folderId: folderId && folderIds.has(folderId) ? folderId : null,
        tags: strList(f.tags),
        uploadedAt: num(f.uploadedAt, 0),
        size: Math.max(0, num(f.size, 0)),
        mime: str(f.mime) || 'application/octet-stream',
        stored: f.stored
      }
    ]
  })
  return { folders, files }
}

export const newFolder = (name: string, parentId: string | null = null): FolderItem => ({
  id: newId(),
  name: name.trim(),
  parentId
})

/** "Proof / Volunteer", or "Unfiled" for no folder. */
export function folderPath(folders: FolderItem[], folderId: string | null): string {
  const f = folders.find((x) => x.id === folderId)
  if (!f) return 'Unfiled'
  const parent = f.parentId ? folders.find((x) => x.id === f.parentId) : undefined
  return parent ? `${parent.name} / ${f.name}` : f.name
}

/** Deletes a folder but keeps everything in it: files and subfolders move up one level. */
export function removeFolder(index: FileIndex, folderId: string): FileIndex {
  const gone = index.folders.find((f) => f.id === folderId)
  if (!gone) return index
  const up = gone.parentId
  return {
    folders: index.folders.filter((f) => f.id !== folderId).map((f) => (f.parentId === folderId ? { ...f, parentId: up } : f)),
    files: index.files.map((f) => (f.folderId === folderId ? { ...f, folderId: up } : f))
  }
}

/** Extension of the stored copy: lowercase and plain, or none. */
export function storedFileName(fileId: string, originalName: string): string {
  const dot = originalName.lastIndexOf('.')
  const ext = dot > 0 ? originalName.slice(dot).toLowerCase() : ''
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? `${fileId}${ext}` : fileId
}

export interface FileLinks {
  profile: Array<{ section: EntrySection; id: string; label: string }>
  applications: Array<{ id: string; name: string }>
}

/** What a file is attached to. The links are kept on the profile entries and applications; this reads them back. */
export function linksForFile(fileId: string, profile: Profile, apps: Application[]): FileLinks {
  const out: FileLinks = { profile: [], applications: [] }
  for (const section of ENTRY_SECTIONS) {
    for (const e of profile[section] as Array<Profile[EntrySection][number]>) {
      if (e.fileIds.includes(fileId)) out.profile.push({ section, id: e.id, label: entryLabel(section, e) })
    }
  }
  for (const a of apps) if (a.fileIds.includes(fileId)) out.applications.push({ id: a.id, name: a.name })
  return out
}

/** Copies of the profile and applications with every reference to the file removed (call when it is deleted). */
export function removeFileRefs(
  profile: Profile,
  apps: Application[],
  fileId: string
): { profile: Profile; applications: Application[] } {
  const strip = <T extends { fileIds: string[] }>(e: T): T =>
    e.fileIds.includes(fileId) ? { ...e, fileIds: e.fileIds.filter((f) => f !== fileId) } : e
  const next: Profile = { ...profile }
  for (const section of ENTRY_SECTIONS) {
    ;(next[section] as Array<{ fileIds: string[] }>) = (profile[section] as Array<{ fileIds: string[] }>).map(strip)
  }
  return { profile: next, applications: apps.map(strip) }
}
