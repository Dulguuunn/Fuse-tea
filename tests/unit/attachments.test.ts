import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { attachmentUrl, MAX_ATTACHMENT_BYTES, resolveAttachmentPath, saveAttachment } from '../../src/main/attachments'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'notes-attach-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3])

describe('saveAttachment', () => {
  it('writes the bytes into data/attachments under a new name', async () => {
    const name = await saveAttachment(dir, bytes, 'png')
    expect(name).toMatch(/^[0-9a-f-]{36}\.png$/)
    expect(new Uint8Array(await readFile(join(dir, 'attachments', name)))).toEqual(bytes)
  })
  it('normalizes the extension', async () => {
    expect(await saveAttachment(dir, bytes, 'JPEG')).toMatch(/\.jpeg$/)
  })
  it('refuses non-image extensions', async () => {
    await expect(saveAttachment(dir, bytes, 'exe')).rejects.toThrow()
  })
  it('refuses files that are too large', async () => {
    await expect(saveAttachment(dir, new Uint8Array(MAX_ATTACHMENT_BYTES + 1), 'png')).rejects.toThrow()
  })
})

describe('resolveAttachmentPath', () => {
  it('maps a valid attachment URL to the file inside data/attachments', () => {
    const name = '0b5c3d4e-1111-4222-8333-944455556666.png'
    expect(resolveAttachmentPath(dir, attachmentUrl(name))).toBe(join(dir, 'attachments', name))
  })
  it('rejects paths that try to leave the folder', () => {
    expect(resolveAttachmentPath(dir, 'attachment://file/../secret.txt')).toBeNull()
    expect(resolveAttachmentPath(dir, 'attachment://file/%2e%2e%2fsecret.png')).toBeNull()
    expect(resolveAttachmentPath(dir, 'attachment://file/sub/x.png')).toBeNull()
  })
  it('rejects other schemes and non-image files', () => {
    expect(resolveAttachmentPath(dir, 'file:///C:/Windows/win.ini')).toBeNull()
    expect(resolveAttachmentPath(dir, 'attachment://file/notes.json')).toBeNull()
  })
})
