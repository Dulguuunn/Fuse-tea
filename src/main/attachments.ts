import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MAX_FILE_BYTES, STORED_NAME } from '@shared/files'

// Images pasted into notes are stored in data/attachments and shown via attachment://file/<name>.
// (The fixed "file" host matters: browsers lowercase the host part of URLs, but not the path.)

export const ATTACHMENT_SCHEME = 'attachment'
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
const IMAGE_EXT = /^(png|jpe?g|gif|webp|bmp)$/
const SAFE_NAME = /^[0-9a-f-]{36}\.(png|jpe?g|gif|webp|bmp)$/

export const attachmentUrl = (name: string): string => `${ATTACHMENT_SCHEME}://file/${name}`

export async function saveAttachment(dataDir: string, bytes: Uint8Array, ext: string): Promise<string> {
  const e = ext.toLowerCase().replace(/^\./, '')
  if (!IMAGE_EXT.test(e)) throw new Error(`Not an image type: ${ext}`)
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) throw new Error('Image is larger than 25 MB')
  const name = `${randomUUID()}.${e}`
  const dir = join(dataDir, 'attachments')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), bytes)
  return name
}

// ---------- Files kept in the "Files" tab: data/files/<stored>, shown via attachment://stored/<stored> ----------

export const isStoredName = (name: string): boolean => STORED_NAME.test(name)

/** Writes the bytes of an uploaded file to data/files/<stored>. */
export async function saveStoredFile(dataDir: string, stored: string, bytes: Uint8Array): Promise<void> {
  if (!isStoredName(stored)) throw new Error('Invalid file name')
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('File is larger than 100 MB')
  const dir = join(dataDir, 'files')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, stored), bytes)
}

export const storedFilePath = (dataDir: string, stored: string): string => {
  if (!isStoredName(stored)) throw new Error('Invalid file name')
  return join(dataDir, 'files', stored)
}

/** attachment://stored/<name> → absolute path inside data/files, or null for anything suspicious. */
export function resolveStoredPath(dataDir: string, url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== `${ATTACHMENT_SCHEME}:` || parsed.hostname !== 'stored') return null
  let name: string
  try {
    name = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  } catch {
    return null
  }
  return isStoredName(name) ? join(dataDir, 'files', name) : null
}

/** attachment://file/<name> → absolute path inside data/attachments, or null for anything suspicious. */
export function resolveAttachmentPath(dataDir: string, url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== `${ATTACHMENT_SCHEME}:` || parsed.hostname !== 'file') return null
  let name: string
  try {
    name = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  } catch {
    return null
  }
  if (!SAFE_NAME.test(name)) return null
  return join(dataDir, 'attachments', name)
}
