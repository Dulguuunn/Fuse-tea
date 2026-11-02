import { describe, expect, it } from 'vitest'
import { newApplication } from '@shared/applications'
import {
  folderPath,
  linksForFile,
  normalizeFileIndex,
  removeFileRefs,
  removeFolder,
  storedFileName,
  type FileIndex
} from '@shared/files'
import { blankEntry, emptyProfile } from '@shared/profile'
import { isStoredName, resolveStoredPath } from '../../src/main/attachments'

const index: FileIndex = {
  folders: [
    { id: 'p', name: 'Proof', parentId: null },
    { id: 'pv', name: 'Volunteer', parentId: 'p' }
  ],
  files: [
    { id: 'f1', name: 'volunteer.pdf', folderId: 'pv', tags: [], uploadedAt: 1, size: 10, mime: 'application/pdf', stored: 'f1.pdf' }
  ]
}

describe('normalizeFileIndex', () => {
  it('keeps one level of nesting: deeper or orphaned folders move to the top', () => {
    const n = normalizeFileIndex({
      folders: [
        { id: 'a', name: 'A', parentId: null },
        { id: 'b', name: 'B', parentId: 'a' },
        { id: 'c', name: 'C', parentId: 'b' },
        { id: 'd', name: 'D', parentId: 'missing' },
        { id: 'e', name: '   ', parentId: null }
      ],
      files: [
        { id: 'f', name: 'x.pdf', folderId: 'gone', size: 3, stored: 'f.pdf', uploadedAt: 2 },
        { id: 'g', name: 'bad', stored: '../../etc/passwd' }
      ]
    })
    expect(n.folders.map((f) => [f.id, f.parentId])).toEqual([['a', null], ['b', 'a'], ['c', null], ['d', null]])
    expect(n.files).toHaveLength(1)
    expect(n.files[0].folderId).toBeNull()
  })
  it('gives an empty index for garbage', () => {
    expect(normalizeFileIndex(7)).toEqual({ folders: [], files: [] })
  })
})

describe('folders', () => {
  it('shows a folder path', () => {
    expect(folderPath(index.folders, 'pv')).toBe('Proof / Volunteer')
    expect(folderPath(index.folders, null)).toBe('Unfiled')
  })
  it('deleting a folder keeps its files and subfolders, moving them up', () => {
    const r = removeFolder(index, 'p')
    expect(r.folders.map((f) => [f.id, f.parentId])).toEqual([['pv', null]])
    const r2 = removeFolder(index, 'pv')
    expect(r2.files[0].folderId).toBe('p')
  })
})

describe('file links', () => {
  const profile = emptyProfile()
  const award = { ...blankEntry('awards'), id: 'aw1', fileIds: ['f1'] }
  const vol = { ...blankEntry('volunteer'), id: 'v1', fileIds: ['f1', 'f2'] }
  profile.awards = [award]
  profile.volunteer = [vol]
  const apps = [{ ...newApplication(1), id: 'app1', name: 'Acme', fileIds: ['f1'] }]

  it('finds what a file is linked to', () => {
    const links = linksForFile('f1', profile, apps)
    expect(links.profile.map((l) => [l.section, l.id])).toEqual([['volunteer', 'v1'], ['awards', 'aw1']])
    expect(links.applications).toEqual([{ id: 'app1', name: 'Acme' }])
    expect(linksForFile('zzz', profile, apps)).toEqual({ profile: [], applications: [] })
  })
  it('removes every reference when a file is deleted', () => {
    const r = removeFileRefs(profile, apps, 'f1')
    expect(r.profile.volunteer[0].fileIds).toEqual(['f2'])
    expect(r.profile.awards[0].fileIds).toEqual([])
    expect(r.applications[0].fileIds).toEqual([])
    expect(profile.awards[0].fileIds).toEqual(['f1']) // input not mutated
  })
})

describe('stored file names', () => {
  it('keeps a safe lowercase extension', () => {
    expect(storedFileName('abc', 'Diploma.PDF')).toBe('abc.pdf')
    expect(storedFileName('abc', 'noext')).toBe('abc')
    expect(storedFileName('abc', 'weird.t$x')).toBe('abc')
  })
  it('only serves names the app made, from inside data/files', () => {
    const id = '0a1b2c3d-0000-4000-8000-0123456789ab'
    expect(isStoredName(`${id}.pdf`)).toBe(true)
    expect(isStoredName('../x.pdf')).toBe(false)
    expect(resolveStoredPath('/data', `attachment://stored/${id}.pdf`)).toMatch(/files[\\/]/)
    expect(resolveStoredPath('/data', 'attachment://stored/..%2Fsecret.pdf')).toBeNull()
    expect(resolveStoredPath('/data', 'attachment://other/x.pdf')).toBeNull()
  })
})
