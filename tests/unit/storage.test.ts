import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Storage } from '../../src/main/storage'
import { normalizeTasks } from '@shared/normalize'
import type { Note, Task } from '@shared/types'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'notes-storage-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const task: Task = {
  id: 't1',
  title: 'Essay',
  done: false,
  dueDate: '2026-10-30',
  dueTime: null,
  createdAt: 1,
  completedAt: null
}

const note = (id: string): Note => ({
  id,
  title: 'Physics',
  content: null,
  text: 'forces',
  notebookId: null,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  deletedAt: null
})

describe('Storage JSON files', () => {
  it('round-trips data', async () => {
    const s = new Storage(dir)
    await s.writeJson('tasks.json', [task])
    expect(await s.readJson('tasks.json', normalizeTasks)).toEqual([task])
  })

  it('returns the normalizer default when the file is missing', async () => {
    expect(await new Storage(dir).readJson('tasks.json', normalizeTasks)).toEqual([])
  })

  it('keeps a corrupt file as .corrupt-* and returns the default', async () => {
    await writeFile(join(dir, 'tasks.json'), '{oops')
    expect(await new Storage(dir).readJson('tasks.json', normalizeTasks)).toEqual([])
    const files = await readdir(dir)
    expect(files.some((f) => /^tasks\.json\.corrupt-\d+$/.test(f))).toBe(true)
  })

  it('reads a file saved by Notepad with a BOM', async () => {
    await writeFile(join(dir, 'tasks.json'), '﻿' + JSON.stringify([task]))
    expect(await new Storage(dir).readJson('tasks.json', normalizeTasks)).toEqual([task])
  })

  it('leaves no temp files behind after writing', async () => {
    const s = new Storage(dir)
    await Promise.all([s.writeJson('tasks.json', [task]), s.writeJson('tasks.json', [])])
    expect((await readdir(dir)).filter((f) => f.endsWith('.tmp'))).toEqual([])
    expect(await s.readJson('tasks.json', normalizeTasks)).toEqual([])
  })
})

describe('Storage notes', () => {
  it('returns [] when there is no notes folder yet', async () => {
    expect(await new Storage(dir).listNotes()).toEqual([])
  })

  it('skips a corrupt note file but loads the others', async () => {
    const s = new Storage(dir)
    await s.writeNote(note('a'))
    await mkdir(join(dir, 'notes'), { recursive: true })
    await writeFile(join(dir, 'notes', 'b.json'), '{bad')
    expect((await s.listNotes()).map((n) => n.id)).toEqual(['a'])
    const files = await readdir(join(dir, 'notes'))
    expect(files.some((f) => f.startsWith('b.json.corrupt-'))).toBe(true)
  })

  it('deletes a note file', async () => {
    const s = new Storage(dir)
    await s.writeNote(note('a'))
    await s.deleteNote('a')
    expect(await s.listNotes()).toEqual([])
  })

  it('refuses ids that could escape the notes folder', async () => {
    await expect(new Storage(dir).writeNote(note('../evil'))).rejects.toThrow()
  })
})
