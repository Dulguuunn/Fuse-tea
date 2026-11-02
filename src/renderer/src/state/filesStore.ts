import { create } from 'zustand'
import {
  MAX_FILE_BYTES,
  newFolder,
  removeFileRefs,
  removeFolder,
  storedFileName,
  type FileIndex,
  type FileItem
} from '@shared/files'
import { newId } from '@shared/id'
import { useApplications } from './applicationsStore'
import { useProfile } from './profileStore'
import { saver } from './saver'

interface FilesState {
  index: FileIndex
  loaded: boolean
  load(): Promise<void>
  replaceAll(index: FileIndex): void
  /** Stores each file on disk and adds it to a folder. Returns what was added and what was refused. */
  addFiles(files: File[], folderId: string | null): Promise<{ added: FileItem[]; failed: string[] }>
  updateFile(id: string, patch: Partial<Pick<FileItem, 'name' | 'folderId' | 'tags'>>): void
  /** Deletes the file from disk and removes every link to it. */
  deleteFile(id: string): Promise<void>
  addFolder(name: string, parentId: string | null): string
  renameFolder(id: string, name: string): void
  /** Deletes the folder only; its files and subfolders move up one level. */
  deleteFolder(id: string): void
}

export const useFiles = create<FilesState>((set, get) => {
  const commit = (index: FileIndex): void => {
    set({ index })
    saver.schedule('files', () => window.api.files.save(index))
  }

  return {
    index: { folders: [], files: [] },
    loaded: false,
    async load() {
      set({ index: await window.api.files.get(), loaded: true })
    },
    replaceAll: (index) => commit(index),
    async addFiles(files, folderId) {
      const added: FileItem[] = []
      const failed: string[] = []
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          failed.push(`${file.name} is larger than 100 MB`)
          continue
        }
        const id = newId()
        const stored = storedFileName(id, file.name)
        try {
          await window.api.files.add(stored, new Uint8Array(await file.arrayBuffer()))
        } catch {
          failed.push(`${file.name} could not be saved`)
          continue
        }
        added.push({
          id,
          name: file.name,
          folderId,
          tags: [],
          uploadedAt: Date.now(),
          size: file.size,
          mime: file.type || 'application/octet-stream',
          stored
        })
      }
      if (added.length > 0) commit({ ...get().index, files: [...get().index.files, ...added] })
      return { added, failed }
    },
    updateFile(id, patch) {
      const { index } = get()
      commit({ ...index, files: index.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })
    },
    async deleteFile(id) {
      const { index } = get()
      const file = index.files.find((f) => f.id === id)
      if (!file) return
      commit({ ...index, files: index.files.filter((f) => f.id !== id) })
      const cleaned = removeFileRefs(useProfile.getState().profile, useApplications.getState().apps, id)
      useProfile.getState().replaceAll(cleaned.profile)
      useApplications.getState().replaceAll(cleaned.applications)
      await window.api.files.remove(file.stored)
    },
    addFolder(name, parentId) {
      const folder = newFolder(name, parentId)
      commit({ ...get().index, folders: [...get().index.folders, folder] })
      return folder.id
    },
    renameFolder(id, name) {
      const trimmed = name.trim()
      if (!trimmed) return
      const { index } = get()
      commit({ ...index, folders: index.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) })
    },
    deleteFolder(id) {
      commit(removeFolder(get().index, id))
    }
  }
})
