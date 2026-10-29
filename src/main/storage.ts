import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { normalizeNote } from '@shared/normalize'
import type { Note } from '@shared/types'

const SAFE_ID = /^[A-Za-z0-9_-]+$/
const RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES'])

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const errCode = (e: unknown): string | undefined => (e as NodeJS.ErrnoException)?.code

/** Write to a temp file, then rename over the target, so a crash never leaves a half-written file. */
async function atomicWrite(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${randomUUID().slice(0, 8)}.tmp`
  await writeFile(tmp, content, 'utf8')
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(tmp, file)
      return
    } catch (e) {
      // Windows: antivirus/indexer can briefly lock the target file.
      if (attempt >= 5 || !RETRYABLE.has(errCode(e) ?? '')) {
        await rm(tmp, { force: true })
        throw e
      }
      await sleep(50)
    }
  }
}

type Parsed = { ok: true; value: unknown } | { ok: false; missing: boolean }

export class Storage {
  /** Writes to the same file run one after another, so an older save can never win. */
  private queues = new Map<string, Promise<void>>()

  constructor(readonly dir: string) {}

  async readJson<T>(rel: string, normalize: (raw: unknown) => T): Promise<T> {
    const parsed = await this.parseFile(join(this.dir, rel))
    return normalize(parsed.ok ? parsed.value : undefined)
  }

  writeJson(rel: string, data: unknown): Promise<void> {
    const file = join(this.dir, rel)
    const content = JSON.stringify(data, null, 2)
    const prev = this.queues.get(file) ?? Promise.resolve()
    const next = prev.catch(() => {}).then(() => atomicWrite(file, content))
    this.queues.set(file, next)
    void next.finally(() => {
      if (this.queues.get(file) === next) this.queues.delete(file)
    }).catch(() => {})
    return next
  }

  async listNotes(): Promise<Note[]> {
    const notesDir = join(this.dir, 'notes')
    let files: string[]
    try {
      files = await readdir(notesDir)
    } catch (e) {
      if (errCode(e) === 'ENOENT') return []
      throw e
    }
    const notes: Note[] = []
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      const parsed = await this.parseFile(join(notesDir, f))
      const note = parsed.ok ? normalizeNote(parsed.value) : null
      if (note) notes.push(note)
    }
    return notes
  }

  async writeNote(note: Note): Promise<void> {
    await this.writeJson(this.notePath(note.id), note)
  }

  async deleteNote(id: string): Promise<void> {
    const rel = this.notePath(id)
    await this.queues.get(join(this.dir, rel))?.catch(() => {})
    await rm(join(this.dir, rel), { force: true })
  }

  private notePath(id: string): string {
    if (!SAFE_ID.test(id)) throw new Error(`Invalid note id: ${id}`)
    return join('notes', `${id}.json`)
  }

  /** Reads and parses a JSON file. A file that can't be parsed is set aside as *.corrupt-<time>. */
  private async parseFile(file: string): Promise<Parsed> {
    let text: string
    try {
      text = await readFile(file, 'utf8')
    } catch (e) {
      if (errCode(e) === 'ENOENT') return { ok: false, missing: true }
      throw e
    }
    try {
      return { ok: true, value: JSON.parse(text.replace(/^﻿/, '')) }
    } catch {
      const aside = `${file}.corrupt-${Date.now()}`
      console.error(`[storage] Could not parse ${file}; kept a copy at ${aside}`)
      await rename(file, aside).catch(() => {})
      return { ok: false, missing: false }
    }
  }
}
